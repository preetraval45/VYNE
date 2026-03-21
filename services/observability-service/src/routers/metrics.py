from __future__ import annotations

import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from typing import Any

from ..dependencies import get_current_user, get_db

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/metrics", tags=["metrics"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class MetricPoint(BaseModel):
    name: str
    value: float
    labels: dict[str, Any] | None = None
    timestamp: datetime | None = None


class IngestRequest(BaseModel):
    service: str
    metrics: list[MetricPoint] = Field(..., min_length=1)


class IngestResponse(BaseModel):
    inserted: int
    service: str


class TimeSeriesPoint(BaseModel):
    time: datetime
    value: float
    labels: dict[str, Any] | None = None


class ServiceMetricsResponse(BaseModel):
    service: str
    metric: str
    points: list[TimeSeriesPoint]


class ServiceSummary(BaseModel):
    name: str
    errorRate: float
    p99Latency: float
    requestsPerMin: float


class SummaryResponse(BaseModel):
    services: list[ServiceSummary]
    generatedAt: datetime


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_metrics(
    body: IngestRequest,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> IngestResponse:
    """
    Bulk-ingest metric data points into metric_events hypertable.
    """
    now = datetime.now(timezone.utc)
    rows = [
        (
            point.timestamp or now,
            user["org_id"],
            body.service,
            point.name,
            point.value,
            (point.labels or {}),
        )
        for point in body.metrics
    ]

    try:
        with db.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO metric_events (time, org_id, service_name, metric_name, value, labels)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                """,
                rows,
            )
    except Exception as exc:
        log.error("metrics_ingest_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store metrics",
        )

    log.info("metrics_ingested", service=body.service, count=len(rows))
    return IngestResponse(inserted=len(rows), service=body.service)


@router.get("/summary", response_model=SummaryResponse)
async def metrics_summary(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> SummaryResponse:
    """
    Dashboard summary: error rate, p99 latency, and requests/min per service
    over the last 10 minutes.
    """
    sql = """
        SELECT
            service_name,
            AVG(CASE WHEN metric_name = 'http.error_rate' THEN value END)        AS error_rate,
            PERCENTILE_CONT(0.99) WITHIN GROUP (
                ORDER BY CASE WHEN metric_name = 'http.latency_ms' THEN value END
            )                                                                       AS p99_latency,
            SUM(CASE WHEN metric_name = 'http.requests' THEN value END) / 10.0   AS req_per_min
        FROM metric_events
        WHERE org_id = %s
          AND time >= NOW() - INTERVAL '10 minutes'
        GROUP BY service_name
        ORDER BY service_name
    """
    try:
        with db.cursor() as cur:
            cur.execute(sql, (user["org_id"],))
            rows = cur.fetchall()
    except Exception as exc:
        log.warning("metrics_summary_db_error", error=str(exc))
        rows = []

    services = [
        ServiceSummary(
            name=row[0],
            errorRate=float(row[1] or 0),
            p99Latency=float(row[2] or 0),
            requestsPerMin=float(row[3] or 0),
        )
        for row in rows
    ]

    return SummaryResponse(services=services, generatedAt=datetime.now(timezone.utc))


@router.get("/{service}", response_model=ServiceMetricsResponse)
async def get_service_metrics(
    service: str,
    name: str = Query(..., description="Metric name to query"),
    from_time: datetime = Query(
        default=None,
        alias="from",
        description="Start time (ISO 8601). Defaults to 1 hour ago.",
    ),
    to_time: datetime = Query(
        default=None,
        alias="to",
        description="End time (ISO 8601). Defaults to now.",
    ),
    step: int = Query(
        default=60,
        ge=1,
        description="Aggregation bucket in seconds",
    ),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
) -> ServiceMetricsResponse:
    """
    Return time-bucketed metric data for a specific service and metric name.
    """
    now = datetime.now(timezone.utc)
    if to_time is None:
        to_time = now
    if from_time is None:
        from_time = datetime(now.year, now.month, now.day, now.hour - 1, now.minute, tzinfo=timezone.utc)

    sql = """
        SELECT
            time_bucket(%s::interval, time) AS bucket,
            AVG(value)                       AS avg_value,
            labels
        FROM metric_events
        WHERE org_id      = %s
          AND service_name = %s
          AND metric_name  = %s
          AND time BETWEEN %s AND %s
        GROUP BY bucket, labels
        ORDER BY bucket ASC
    """
    interval = f"{step} seconds"
    try:
        with db.cursor() as cur:
            cur.execute(sql, (interval, user["org_id"], service, name, from_time, to_time))
            rows = cur.fetchall()
    except Exception as exc:
        log.warning("service_metrics_db_error", error=str(exc))
        rows = []

    points = [
        TimeSeriesPoint(
            time=row[0],
            value=float(row[1]),
            labels=row[2],
        )
        for row in rows
    ]

    return ServiceMetricsResponse(service=service, metric=name, points=points)
