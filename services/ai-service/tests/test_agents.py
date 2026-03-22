"""Tests for the incident and ops LangGraph agents."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from langchain_core.messages import AIMessage


# ---------------------------------------------------------------------------
# Incident Agent
# ---------------------------------------------------------------------------


class TestIncidentAgent:
    """Tests for individual incident agent graph nodes."""

    @pytest.mark.asyncio
    async def test_gather_context_returns_similar_incidents(self):
        from src.agents.incident_agent import gather_context

        state = {
            "incident_id": "INC-1",
            "error_message": "Connection refused",
            "service_name": "erp-service",
            "deployment_info": {},
            "affected_orders": None,
            "root_cause": "",
            "impact_analysis": "",
            "revenue_at_risk": 0.0,
            "recommendation": "",
            "similar_incidents": [],
            "messages": [],
        }

        result = await gather_context(state)

        assert "similar_incidents" in result
        assert len(result["similar_incidents"]) > 0
        assert all(
            "id" in inc and "cause" in inc and "resolution" in inc
            for inc in result["similar_incidents"]
        )

    @pytest.mark.asyncio
    async def test_analyze_root_cause_calls_llm(self):
        from src.agents.incident_agent import analyze_root_cause

        mock_response = AIMessage(
            content="Root cause: IAM role missing s3:GetObject permission."
        )

        with patch("src.agents.incident_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            state = {
                "incident_id": "INC-1",
                "error_message": "Access denied to S3 bucket",
                "service_name": "erp-service",
                "deployment_info": {"commit": "abc123"},
                "affected_orders": None,
                "root_cause": "",
                "impact_analysis": "",
                "revenue_at_risk": 0.0,
                "recommendation": "",
                "similar_incidents": [
                    {"id": "ENG-31", "cause": "IAM issue", "resolution": "Updated policy"}
                ],
                "messages": [],
            }

            result = await analyze_root_cause(state)

            assert "root_cause" in result
            assert len(result["root_cause"]) > 0
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_calculate_impact_with_affected_orders(self):
        from src.agents.incident_agent import calculate_impact

        state = {
            "incident_id": "INC-1",
            "error_message": "DB timeout",
            "service_name": "erp-service",
            "deployment_info": {},
            "affected_orders": [
                {"id": "ORD-1", "amount": 500},
                {"id": "ORD-2", "amount": 300},
                {"id": "ORD-3", "amount": 200},
            ],
            "root_cause": "Connection pool exhausted",
            "impact_analysis": "",
            "revenue_at_risk": 0.0,
            "recommendation": "",
            "similar_incidents": [],
            "messages": [],
        }

        result = await calculate_impact(state)

        assert "revenue_at_risk" in result
        assert result["revenue_at_risk"] > 0
        assert "impact_analysis" in result
        assert "3 orders" in result["impact_analysis"]

    @pytest.mark.asyncio
    async def test_calculate_impact_without_affected_orders(self):
        from src.agents.incident_agent import calculate_impact

        state = {
            "incident_id": "INC-2",
            "error_message": "Service unhealthy",
            "service_name": "api-gateway",
            "deployment_info": {},
            "affected_orders": None,
            "root_cause": "Memory leak",
            "impact_analysis": "",
            "revenue_at_risk": 0.0,
            "recommendation": "",
            "similar_incidents": [],
            "messages": [],
        }

        result = await calculate_impact(state)

        # Should use the seeded demo value (47 orders)
        assert result["revenue_at_risk"] > 0
        assert "47 orders" in result["impact_analysis"]

    @pytest.mark.asyncio
    async def test_generate_recommendation_calls_llm(self):
        from src.agents.incident_agent import generate_recommendation

        mock_response = AIMessage(
            content="1. Restart the service. 2. Roll back to v1.2.3. 3. Add health checks."
        )

        with patch("src.agents.incident_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            state = {
                "incident_id": "INC-1",
                "error_message": "DB timeout",
                "service_name": "erp-service",
                "deployment_info": {},
                "affected_orders": None,
                "root_cause": "Connection pool exhausted",
                "impact_analysis": "47 orders stuck. Revenue at risk: $12,400.01",
                "revenue_at_risk": 12400.01,
                "recommendation": "",
                "similar_incidents": [],
                "messages": [],
            }

            result = await generate_recommendation(state)

            assert "recommendation" in result
            assert len(result["recommendation"]) > 0
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_full_incident_agent_graph(self):
        """Integration test: run the full incident agent graph end-to-end with mock LLM."""
        mock_response = AIMessage(content="Mock analysis result")

        with patch("src.agents.incident_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            from src.agents.incident_agent import create_incident_agent

            agent = create_incident_agent()

            initial_state = {
                "incident_id": "INC-E2E",
                "error_message": "Service crash after deploy",
                "service_name": "code-service",
                "deployment_info": {"commit": "xyz789"},
                "affected_orders": None,
                "root_cause": "",
                "impact_analysis": "",
                "revenue_at_risk": 0.0,
                "recommendation": "",
                "similar_incidents": [],
                "messages": [],
            }

            result = await agent.ainvoke(initial_state)

            assert result["root_cause"] != ""
            assert result["impact_analysis"] != ""
            assert result["revenue_at_risk"] > 0
            assert result["recommendation"] != ""
            assert len(result["similar_incidents"]) > 0


# ---------------------------------------------------------------------------
# Ops Agent
# ---------------------------------------------------------------------------


class TestOpsAgent:
    """Tests for individual ops agent graph nodes."""

    @pytest.mark.asyncio
    async def test_fetch_context_stock_keywords(self):
        from src.agents.ops_agent import fetch_context

        state = {
            "question": "What items are low on stock?",
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await fetch_context(state)

        assert "context" in result
        assert "low_stock_items" in result["context"]
        assert len(result["context"]["low_stock_items"]) > 0
        assert "data_tables" in result
        assert len(result["data_tables"]) > 0

    @pytest.mark.asyncio
    async def test_fetch_context_order_keywords(self):
        from src.agents.ops_agent import fetch_context

        state = {
            "question": "Which orders are stuck in processing?",
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await fetch_context(state)

        assert "stuck_orders" in result["context"]
        assert len(result["context"]["stuck_orders"]) > 0

    @pytest.mark.asyncio
    async def test_fetch_context_revenue_keywords(self):
        from src.agents.ops_agent import fetch_context

        state = {
            "question": "What are the revenue numbers for this month?",
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await fetch_context(state)

        assert "revenue_summary" in result["context"]
        assert "mtd" in result["context"]["revenue_summary"]

    @pytest.mark.asyncio
    async def test_fetch_context_supplier_keywords(self):
        from src.agents.ops_agent import fetch_context

        state = {
            "question": "List all supplier information",
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await fetch_context(state)

        assert "suppliers" in result["context"]

    @pytest.mark.asyncio
    async def test_fetch_context_fallback_workspace_summary(self):
        from src.agents.ops_agent import fetch_context

        state = {
            "question": "Tell me about the project",
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await fetch_context(state)

        assert "workspace_summary" in result["context"]

    @pytest.mark.asyncio
    async def test_generate_answer_calls_llm_and_returns_suggestions(self):
        from src.agents.ops_agent import generate_answer

        mock_response = AIMessage(
            content="You have 3 items below reorder point. "
            "Consider creating a purchase order."
        )

        with patch("src.agents.ops_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            state = {
                "question": "What items are low on stock?",
                "context": {"low_stock_items": [{"sku": "PWR-003", "stock": 38}]},
                "answer": "",
                "data_tables": [],
                "suggestions": [],
            }

            result = await generate_answer(state)

            assert "answer" in result
            assert len(result["answer"]) > 0
            assert "suggestions" in result
            assert len(result["suggestions"]) > 0
            # Should include stock-specific suggestions
            assert any("purchase order" in s.lower() for s in result["suggestions"])

    @pytest.mark.asyncio
    async def test_generate_answer_stuck_orders_suggestions(self):
        from src.agents.ops_agent import generate_answer

        mock_response = AIMessage(content="Orders are stuck.")

        with patch("src.agents.ops_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            state = {
                "question": "Which orders are delayed?",
                "context": {"stuck_orders": [{"order_number": "ORD-001"}]},
                "answer": "",
                "data_tables": [],
                "suggestions": [],
            }

            result = await generate_answer(state)

            assert any("escalate" in s.lower() for s in result["suggestions"])

    @pytest.mark.asyncio
    async def test_generate_answer_generic_suggestions(self):
        from src.agents.ops_agent import generate_answer

        mock_response = AIMessage(content="General overview provided.")

        with patch("src.agents.ops_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            state = {
                "question": "Tell me about the workspace",
                "context": {"workspace_summary": {"open_issues": 24}},
                "answer": "",
                "data_tables": [],
                "suggestions": [],
            }

            result = await generate_answer(state)

            assert len(result["suggestions"]) > 0
            assert any("report" in s.lower() or "export" in s.lower() for s in result["suggestions"])

    @pytest.mark.asyncio
    async def test_full_ops_agent_graph(self):
        """Integration test: run the full ops agent graph end-to-end with mock LLM."""
        mock_response = AIMessage(content="Your inventory has 3 low-stock items.")

        with patch("src.agents.ops_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm

            from src.agents.ops_agent import create_ops_agent

            agent = create_ops_agent()

            initial_state = {
                "question": "What items are low on stock?",
                "context": {},
                "answer": "",
                "data_tables": [],
                "suggestions": [],
            }

            result = await agent.ainvoke(initial_state)

            assert result["answer"] != ""
            assert "context" in result
            assert "low_stock_items" in result["context"]
            assert len(result["suggestions"]) > 0
