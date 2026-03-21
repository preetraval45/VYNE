from __future__ import annotations

import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Any
import uuid

from ..dependencies import get_current_user, get_db

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AlertCondition(BaseModel):
    metric: str
    operator: str  # gt | lt | gte | lte | eq
    threshold: float
    window_minutes: int = 5


class AlertRuleCreate(BaseModel):
    name: str
    condition: AlertCondition
    severity: str = "warning"  # info | warning | critical
    notification_channel: str | None = None


class AlertRule(BaseModel):
    id: str
    org_id: str
    name: str
    condition: dict[str, Any]
    severity: str
    is_active: bool
    notification_channel: str | None
    created_at: datetime


class AlertEvent(BaseModel):
    id: str
    org_id: str
    rule_id: str | None
    severity: str | None
    message: str | None
    metadata: dict[str, Any]
    resolved_at: datetime | None
    created_at: datetime


class ResolveResponse(BaseModel):
    id: str
    resolved_at: datetime


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[AlertEvent])
async def list_active_alerts(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> list[AlertEvent]:
    """List all unresolved alert events for the caller's organisation."""
    sql = """
        SELECT id, org_id, rule_id, severity, message, metadata, resolved_at, created_at
        FROM alert_events
        WHERE org_id = %s
          AND resolved_at IS NULL
        ORDER BY created_at DESC
        LIMIT 200
    """
    try:
        with db.cursor() as cur:
            cur.execute(sql, (user["org_id"],))
            rows = cur.fetchall()
    except Exception as exc:
        log.error("list_alerts_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alerts",
        )

    return [
        AlertEvent(
            id=str(row[0]),
            org_id=str(row[1]),
            rule_id=str(row[2]) if row[2] else None,
            severity=row[3],
            message=row[4],
            metadata=row[5] or {},
            resolved_at=row[6],
            created_at=row[7],
        )
        for row in rows
    ]


@router.post("/rules", response_model=AlertRule, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    body: AlertRuleCreate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> AlertRule:
    """Create a new alert rule for the caller's organisation."""
    valid_severities = {"info", "warning", "critical"}
    if body.severity not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"severity must be one of {valid_severities}",
        )

    import json  # noqa: PLC0415

    sql = """
        INSERT INTO alert_rules (org_id, name, condition, severity, notification_channel)
        VALUES (%s, %s, %s::jsonb, %s, %s)
        RETURNING id, org_id, name, condition, severity, is_active, notification_channel, created_at
    """
    try:
        with db.cursor() as cur:
            cur.execute(
                sql,
                (
                    user["org_id"],
                    body.name,
                    json.dumps(body.condition.model_dump()),
                    body.severity,
                    body.notification_channel,
                ),
            )
            row = cur.fetchone()
    except Exception as exc:
        log.error("create_alert_rule_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert rule",
        )

    return AlertRule(
        id=str(row[0]),
        org_id=str(row[1]),
        name=row[2],
        condition=row[3],
        severity=row[4],
        is_active=row[5],
        notification_channel=row[6],
        created_at=row[7],
    )


@router.get("/rules", response_model=list[AlertRule])
async def list_alert_rules(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> list[AlertRule]:
    """List all alert rules for the caller's organisation."""
    sql = """
        SELECT id, org_id, name, condition, severity, is_active, notification_channel, created_at
        FROM alert_rules
        WHERE org_id = %s
        ORDER BY created_at DESC
    """
    try:
        with db.cursor() as cur:
            cur.execute(sql, (user["org_id"],))
            rows = cur.fetchall()
    except Exception as exc:
        log.error("list_alert_rules_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch alert rules",
        )

    return [
        AlertRule(
            id=str(row[0]),
            org_id=str(row[1]),
            name=row[2],
            condition=row[3],
            severity=row[4],
            is_active=row[5],
            notification_channel=row[6],
            created_at=row[7],
        )
        for row in rows
    ]


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: str,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> None:
    """Delete an alert rule by ID. Only rules belonging to the caller's org can be deleted."""
    sql = "DELETE FROM alert_rules WHERE id = %s AND org_id = %s"
    try:
        with db.cursor() as cur:
            cur.execute(sql, (rule_id, user["org_id"]))
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alert rule not found or access denied",
                )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("delete_alert_rule_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert rule",
        )


@router.post("/{alert_id}/resolve", response_model=ResolveResponse)
async def resolve_alert(
    alert_id: str,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> ResolveResponse:
    """Mark an alert event as resolved."""
    now = datetime.now(timezone.utc)
    sql = """
        UPDATE alert_events
        SET resolved_at = %s
        WHERE id = %s AND org_id = %s AND resolved_at IS NULL
        RETURNING id, resolved_at
    """
    try:
        with db.cursor() as cur:
            cur.execute(sql, (now, alert_id, user["org_id"]))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alert not found, already resolved, or access denied",
                )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("resolve_alert_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve alert",
        )

    return ResolveResponse(id=str(row[0]), resolved_at=row[1])
