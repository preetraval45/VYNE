"""Tests for the metrics router (ingestion, querying, and aggregation)."""
from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.routers.metrics import router, IngestRequest, MetricPoint


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _create_app(mock_db=None, mock_user=None) -> FastAPI:
    """Create a minimal FastAPI app with the metrics router and dependency overrides."""
    app = FastAPI()
    app.include_router(router)

    from src.dependencies import get_current_user, get_db

    if mock_user is None:
        mock_user = {"id": "user-1", "email": "test@example.com", "org_id": "org-1", "role": "admin"}

    if mock_db is None:
        mock_db = MagicMock()
        mock_cursor = MagicMock()
        mock_db.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_db.cursor.return_value.__exit__ = MagicMock(return_value=False)

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    return app


@pytest.fixture
def mock_db():
    db = MagicMock()
    mock_cursor = MagicMock()
    db.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    db.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return db


@pytest.fixture
def mock_cursor(mock_db):
    return mock_db.cursor.return_value.__enter__.return_value


@pytest.fixture
def client(mock_db):
    app = _create_app(mock_db=mock_db)
    return TestClient(app)


# ---------------------------------------------------------------------------
# POST /metrics (Ingestion)
# ---------------------------------------------------------------------------


class TestMetricIngestion:
    """Tests for the POST /metrics endpoint."""

    def test_ingest_single_metric(self, client, mock_cursor):
        body = {
            "service": "erp-service",
            "metrics": [
                {"name": "http.requests", "value": 42.0}
            ],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 201
        data = response.json()
        assert data["inserted"] == 1
        assert data["service"] == "erp-service"
        mock_cursor.executemany.assert_called_once()

    def test_ingest_multiple_metrics(self, client, mock_cursor):
        body = {
            "service": "api-gateway",
            "metrics": [
                {"name": "http.requests", "value": 100.0},
                {"name": "http.error_rate", "value": 0.02},
                {"name": "http.latency_ms", "value": 45.5},
            ],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 201
        data = response.json()
        assert data["inserted"] == 3
        assert data["service"] == "api-gateway"

    def test_ingest_with_custom_timestamp(self, client, mock_cursor):
        ts = datetime(2026, 3, 21, 10, 0, 0, tzinfo=timezone.utc).isoformat()
        body = {
            "service": "erp-service",
            "metrics": [
                {"name": "http.requests", "value": 10.0, "timestamp": ts}
            ],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 201

    def test_ingest_with_labels(self, client, mock_cursor):
        body = {
            "service": "erp-service",
            "metrics": [
                {
                    "name": "http.requests",
                    "value": 10.0,
                    "labels": {"method": "GET", "path": "/inventory"},
                }
            ],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 201

    def test_ingest_rejects_empty_metrics_array(self, client):
        body = {
            "service": "erp-service",
            "metrics": [],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 422  # Validation error

    def test_ingest_rejects_missing_service(self, client):
        body = {
            "metrics": [{"name": "http.requests", "value": 1.0}],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 422

    def test_ingest_rejects_missing_metric_name(self, client):
        body = {
            "service": "erp-service",
            "metrics": [{"value": 1.0}],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 422

    def test_ingest_rejects_missing_metric_value(self, client):
        body = {
            "service": "erp-service",
            "metrics": [{"name": "http.requests"}],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 422

    def test_ingest_returns_500_on_db_error(self, mock_db):
        mock_cursor = MagicMock()
        mock_cursor.executemany.side_effect = Exception("DB connection lost")
        mock_db.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_db.cursor.return_value.__exit__ = MagicMock(return_value=False)

        app = _create_app(mock_db=mock_db)
        client = TestClient(app)

        body = {
            "service": "erp-service",
            "metrics": [{"name": "http.requests", "value": 1.0}],
        }

        response = client.post("/metrics", json=body)

        assert response.status_code == 500


# ---------------------------------------------------------------------------
# GET /metrics/{service} (Querying with time ranges)
# ---------------------------------------------------------------------------


class TestMetricQuerying:
    """Tests for the GET /metrics/{service} endpoint."""

    def test_query_service_metrics(self, client, mock_cursor):
        now = datetime.now(timezone.utc)
        mock_cursor.fetchall.return_value = [
            (now - timedelta(minutes=5), 42.5, None),
            (now - timedelta(minutes=4), 43.0, None),
            (now - timedelta(minutes=3), 41.0, None),
        ]

        response = client.get(
            "/metrics/erp-service",
            params={"name": "http.latency_ms"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "erp-service"
        assert data["metric"] == "http.latency_ms"
        assert len(data["points"]) == 3

    def test_query_with_time_range(self, client, mock_cursor):
        now = datetime.now(timezone.utc)
        from_time = (now - timedelta(hours=2)).isoformat()
        to_time = now.isoformat()

        mock_cursor.fetchall.return_value = [
            (now - timedelta(minutes=30), 100.0, None),
        ]

        response = client.get(
            "/metrics/api-gateway",
            params={
                "name": "http.requests",
                "from": from_time,
                "to": to_time,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "api-gateway"
        assert len(data["points"]) == 1

    def test_query_with_custom_step(self, client, mock_cursor):
        mock_cursor.fetchall.return_value = []

        response = client.get(
            "/metrics/erp-service",
            params={"name": "http.requests", "step": 300},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == []

    def test_query_returns_empty_on_no_data(self, client, mock_cursor):
        mock_cursor.fetchall.return_value = []

        response = client.get(
            "/metrics/nonexistent-service",
            params={"name": "http.requests"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == []
        assert data["service"] == "nonexistent-service"

    def test_query_requires_metric_name(self, client):
        response = client.get("/metrics/erp-service")

        assert response.status_code == 422

    def test_query_returns_empty_on_db_error(self, mock_db):
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Query timeout")
        mock_db.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_db.cursor.return_value.__exit__ = MagicMock(return_value=False)

        app = _create_app(mock_db=mock_db)
        client = TestClient(app)

        response = client.get(
            "/metrics/erp-service",
            params={"name": "http.requests"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["points"] == []

    def test_query_with_labels_in_results(self, client, mock_cursor):
        now = datetime.now(timezone.utc)
        mock_cursor.fetchall.return_value = [
            (now, 42.0, {"method": "GET", "path": "/api/orders"}),
            (now, 15.0, {"method": "POST", "path": "/api/orders"}),
        ]

        response = client.get(
            "/metrics/erp-service",
            params={"name": "http.requests"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["points"]) == 2
        assert data["points"][0]["labels"]["method"] == "GET"
        assert data["points"][1]["labels"]["method"] == "POST"


# ---------------------------------------------------------------------------
# GET /metrics/summary (Aggregation)
# ---------------------------------------------------------------------------


class TestMetricAggregation:
    """Tests for the GET /metrics/summary endpoint."""

    def test_summary_returns_service_stats(self, client, mock_cursor):
        mock_cursor.fetchall.return_value = [
            ("api-gateway", 0.02, 45.0, 120.5),
            ("erp-service", 0.005, 30.0, 85.0),
            ("messaging-service", 0.01, 55.0, 200.0),
        ]

        response = client.get("/metrics/summary")

        assert response.status_code == 200
        data = response.json()
        assert len(data["services"]) == 3
        assert data["services"][0]["name"] == "api-gateway"
        assert data["services"][0]["errorRate"] == 0.02
        assert data["services"][0]["p99Latency"] == 45.0
        assert data["services"][0]["requestsPerMin"] == 120.5
        assert "generatedAt" in data

    def test_summary_returns_empty_when_no_data(self, client, mock_cursor):
        mock_cursor.fetchall.return_value = []

        response = client.get("/metrics/summary")

        assert response.status_code == 200
        data = response.json()
        assert data["services"] == []
        assert "generatedAt" in data

    def test_summary_handles_null_values(self, client, mock_cursor):
        mock_cursor.fetchall.return_value = [
            ("erp-service", None, None, None),
        ]

        response = client.get("/metrics/summary")

        assert response.status_code == 200
        data = response.json()
        assert len(data["services"]) == 1
        assert data["services"][0]["errorRate"] == 0.0
        assert data["services"][0]["p99Latency"] == 0.0
        assert data["services"][0]["requestsPerMin"] == 0.0

    def test_summary_handles_db_error_gracefully(self, mock_db):
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Connection reset")
        mock_db.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_db.cursor.return_value.__exit__ = MagicMock(return_value=False)

        app = _create_app(mock_db=mock_db)
        client = TestClient(app)

        response = client.get("/metrics/summary")

        assert response.status_code == 200
        data = response.json()
        assert data["services"] == []
