from __future__ import annotations

import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Any

from ..dependencies import get_current_user, get_db

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/logs", tags=["logs"])

_VALID_LEVELS = {"debug", "info", "warning", "error", "critical"}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class LogEntry(BaseModel):
    service: str
    level: str = "info"
    message: str
    metadata: dict[str, Any] | None = None
    timestamp: datetime | None = None


class LogEntryResponse(BaseModel):
    id: str
    service: str
    level: str
    message: str
    metadata: dict[str, Any]
    created_at: datetime


class IngestLogsRequest(BaseModel):
    entries: list[LogEntry]


class IngestLogsResponse(BaseModel):
    inserted: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=IngestLogsResponse, status_code=status.HTTP_201_CREATED)
async def ingest_logs(
    body: IngestLogsRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> IngestLogsResponse:
    """
    Ingest one or more structured log entries.
    Unknown log levels are coerced to 'info'.
    """
    import json  # noqa: PLC0415

    now = datetime.now(timezone.utc)
    rows = [
        (
            user["org_id"],
            entry.service,
            entry.level if entry.level in _VALID_LEVELS else "info",
            entry.message,
            json.dumps(entry.metadata or {}),
            entry.timestamp or now,
        )
        for entry in body.entries
    ]

    sql = """
        INSERT INTO log_entries (org_id, service_name, level, message, metadata, created_at)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s)
    """
    try:
        with db.cursor() as cur:
            cur.executemany(sql, rows)
    except Exception as exc:
        log.error("log_ingest_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store log entries",
        )

    return IngestLogsResponse(inserted=len(rows))


@router.get("", response_model=list[LogEntryResponse])
async def query_logs(
    service: str | None = Query(default=None, description="Filter by service name"),
    level: str | None = Query(default=None, description="Filter by log level"),
    from_time: datetime | None = Query(default=None, alias="from", description="Start time (ISO 8601)"),
    to_time: datetime | None = Query(default=None, alias="to", description="End time (ISO 8601)"),
    search: str | None = Query(default=None, description="Full-text search in message"),
    limit: int = Query(default=100, ge=1, le=1000),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> list[LogEntryResponse]:
    """
    Query structured log entries with optional filters.
    Results are ordered newest-first.
    """
    conditions = ["org_id = %s"]
    params: list[Any] = [user["org_id"]]

    if service:
        conditions.append("service_name = %s")
        params.append(service)

    if level:
        if level not in _VALID_LEVELS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"level must be one of {_VALID_LEVELS}",
            )
        conditions.append("level = %s")
        params.append(level)

    if from_time:
        conditions.append("created_at >= %s")
        params.append(from_time)

    if to_time:
        conditions.append("created_at <= %s")
        params.append(to_time)

    if search:
        conditions.append("message ILIKE %s")
        params.append(f"%{search}%")

    where_clause = " AND ".join(conditions)
    params.append(limit)

    sql = f"""
        SELECT id, service_name, level, message, metadata, created_at
        FROM log_entries
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT %s
    """
    try:
        with db.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    except Exception as exc:
        log.error("query_logs_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query logs",
        )

    return [
        LogEntryResponse(
            id=str(row[0]),
            service=row[1],
            level=row[2],
            message=row[3],
            metadata=row[4] or {},
            created_at=row[5],
        )
        for row in rows
    ]
