"""Tests for the query orchestrator (routing logic and agent dispatch)."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.agents.orchestrator import route_query, _is_incident_query, _INCIDENT_KEYWORDS


# ---------------------------------------------------------------------------
# _is_incident_query keyword routing
# ---------------------------------------------------------------------------


class TestIsIncidentQuery:
    """Tests for the keyword-based routing function."""

    @pytest.mark.parametrize(
        "query",
        [
            "The deployment failed for the ERP service",
            "We have an outage in production",
            "Server is down and returning 502 errors",
            "There was a crash in the messaging service",
            "Getting a 500 error on the API gateway",
            "Need to rollback the latest release",
            "The service is unhealthy after the deploy",
            "We're seeing timeout issues on checkout",
            "There's an incident affecting order processing",
            "Exception thrown during payment processing",
            "503 Service Unavailable on the dashboard",
        ],
    )
    def test_routes_incident_keywords_to_incident_agent(self, query: str):
        assert _is_incident_query(query) is True

    @pytest.mark.parametrize(
        "query",
        [
            "What is the current inventory level for SKU-001?",
            "Show me the revenue report for this month",
            "How many orders are in processing state?",
            "List all suppliers with open purchase orders",
            "What products are low on stock?",
            "Give me a summary of the workspace",
            "Create a purchase order for cables",
        ],
    )
    def test_routes_ops_keywords_to_ops_agent(self, query: str):
        assert _is_incident_query(query) is False

    def test_is_case_insensitive(self):
        assert _is_incident_query("DEPLOYMENT FAILED") is True
        assert _is_incident_query("Deployment Failed") is True
        assert _is_incident_query("deployment failed") is True

    def test_empty_query_routes_to_ops(self):
        assert _is_incident_query("") is False

    def test_all_incident_keywords_are_recognized(self):
        for kw in _INCIDENT_KEYWORDS:
            assert _is_incident_query(f"There is a {kw} in production") is True


# ---------------------------------------------------------------------------
# route_query async dispatch
# ---------------------------------------------------------------------------


class TestRouteQuery:
    """Tests for the full route_query async function."""

    @pytest.mark.asyncio
    async def test_routes_incident_query_to_incident_agent(self):
        mock_result = {
            "incident_id": "INC-1",
            "root_cause": "DB connection pool exhausted",
            "impact_analysis": "47 orders stuck",
            "revenue_at_risk": 12400.0,
            "recommendation": "Restart the connection pooler",
        }

        with patch(
            "src.agents.orchestrator.incident_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(return_value=mock_result)

            result = await route_query(
                "The deployment failed and we're seeing errors",
                {"service": "erp-service", "incident_id": "INC-1"},
            )

            assert result["agent"] == "incident"
            assert result["result"] == mock_result
            mock_agent.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_routes_ops_query_to_ops_agent(self):
        mock_result = {
            "question": "What is the inventory status?",
            "context": {"low_stock_items": []},
            "answer": "All stock levels are healthy.",
            "data_tables": [],
            "suggestions": ["View full report"],
        }

        with patch(
            "src.agents.orchestrator.ops_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(return_value=mock_result)

            result = await route_query(
                "What is the inventory status?",
                {},
            )

            assert result["agent"] == "ops"
            assert result["result"] == mock_result
            mock_agent.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_incident_state_includes_context_fields(self):
        with patch(
            "src.agents.orchestrator.incident_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(return_value={})

            await route_query(
                "deployment failed",
                {
                    "incident_id": "INC-42",
                    "service": "api-gateway",
                    "deployment": {"commit": "abc123"},
                    "orders": [{"id": "ORD-1"}],
                },
            )

            call_args = mock_agent.ainvoke.call_args[0][0]
            assert call_args["incident_id"] == "INC-42"
            assert call_args["service_name"] == "api-gateway"
            assert call_args["deployment_info"] == {"commit": "abc123"}
            assert call_args["affected_orders"] == [{"id": "ORD-1"}]

    @pytest.mark.asyncio
    async def test_incident_state_uses_defaults_for_missing_context(self):
        with patch(
            "src.agents.orchestrator.incident_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(return_value={})

            await route_query("error in production", {})

            call_args = mock_agent.ainvoke.call_args[0][0]
            assert call_args["incident_id"] == "unknown"
            assert call_args["service_name"] == "unknown"
            assert call_args["deployment_info"] == {}

    @pytest.mark.asyncio
    async def test_ops_state_is_correctly_initialized(self):
        with patch(
            "src.agents.orchestrator.ops_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(return_value={})

            await route_query("Show me the revenue report", {})

            call_args = mock_agent.ainvoke.call_args[0][0]
            assert call_args["question"] == "Show me the revenue report"
            assert call_args["context"] == {}
            assert call_args["answer"] == ""
            assert call_args["data_tables"] == []
            assert call_args["suggestions"] == []

    @pytest.mark.asyncio
    async def test_fallback_handling_for_generic_query(self):
        """A query with no strong signal should default to ops agent."""
        with patch(
            "src.agents.orchestrator.ops_agent"
        ) as mock_agent:
            mock_agent.ainvoke = AsyncMock(
                return_value={
                    "answer": "Here is your workspace summary.",
                    "suggestions": ["View the full report"],
                }
            )

            result = await route_query(
                "Give me a general overview of everything",
                {},
            )

            assert result["agent"] == "ops"
