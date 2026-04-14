"""Query router — dispatches to the appropriate LangGraph agent.

Routing rules
─────────────
• Incident/deployment keywords         → IncidentAgent
• Finance/revenue/invoice keywords     → FinanceAgent
• Infra/health/deployment keywords     → InfraAgent
• Everything else (ERP, inventory)     → OpsAgent

Returns a normalised result dict with a `trace` field so the UI can
render a reasoning-step viewer.
"""
from __future__ import annotations

import structlog

from src.agents.incident_agent import IncidentState, incident_agent
from src.agents.ops_agent import OpsState, ops_agent
from src.agents.finance_agent import FinanceState, finance_agent
from src.agents.infra_agent import InfraState, infra_agent

log = structlog.get_logger(__name__)

_INCIDENT_KEYWORDS = frozenset({
    "incident", "outage", "down", "crash", "exception",
    "timeout", "502", "503", "500", "unhealthy", "rollback",
})

_FINANCE_KEYWORDS = frozenset({
    "revenue", "invoice", "overdue", "payment", "receivable",
    "profit", "margin", "p&l", "pnl", "expense", "cost", "spend",
    "cashflow", "cash flow", "budget", "forecast", "finance", "financial",
    "mtd", "ytd", "arr", "mrr",
})

_INFRA_KEYWORDS = frozenset({
    "deploy", "deployment", "release", "service health", "latency",
    "uptime", "cpu", "memory", "alert", "metrics", "infra",
    "infrastructure", "kubernetes", "k8s", "ecs", "docker",
    "degraded", "unhealthy",
})


def _classify(query: str) -> str:
    lower = query.lower()
    if any(kw in lower for kw in _INCIDENT_KEYWORDS):
        return "incident"
    if any(kw in lower for kw in _FINANCE_KEYWORDS):
        return "finance"
    if any(kw in lower for kw in _INFRA_KEYWORDS):
        return "infra"
    return "ops"


async def route_query(query: str, context: dict) -> dict:
    """Route *query* to the correct agent and return a normalised result dict.

    Returns
    -------
    {
        "agent": "incident" | "ops" | "finance" | "infra",
        "result": <full agent state after graph run>,
    }
    The result dict always includes a ``trace`` key (list of step dicts).
    """
    agent_type = _classify(query)
    log.info("orchestrator.route", agent=agent_type, query_preview=query[:80])

    if agent_type == "incident":
        initial: IncidentState = {
            "incident_id": context.get("incident_id", "unknown"),
            "error_message": query,
            "service_name": context.get("service", "unknown"),
            "deployment_info": context.get("deployment", {}),
            "affected_orders": context.get("orders"),
            "root_cause": "",
            "impact_analysis": "",
            "revenue_at_risk": 0.0,
            "recommendation": "",
            "similar_incidents": [],
            "messages": [],
        }
        result = await incident_agent.ainvoke(initial)
        # Build trace from named graph nodes
        trace = [
            {"step": "gather_context", "note": "Searched historical incident knowledge base"},
            {"step": "analyze_root_cause", "note": "LLM identified root cause pattern"},
            {"step": "calculate_impact", "note": f"Revenue at risk: ${result.get('revenue_at_risk', 0):,.2f}"},
            {"step": "generate_recommendation", "note": "Produced structured remediation plan"},
        ]
        result["trace"] = trace
        return {"agent": "incident", "result": result}

    if agent_type == "finance":
        initial_f: FinanceState = {
            "question": query,
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
            "trace": [],
        }
        result = await finance_agent.ainvoke(initial_f)
        return {"agent": "finance", "result": result}

    if agent_type == "infra":
        initial_i: InfraState = {
            "question": query,
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
            "trace": [],
        }
        result = await infra_agent.ainvoke(initial_i)
        return {"agent": "infra", "result": result}

    # Default: OpsAgent
    initial_o: OpsState = {
        "question": query,
        "context": {},
        "answer": "",
        "data_tables": [],
        "suggestions": [],
    }
    result = await ops_agent.ainvoke(initial_o)
    # Add a minimal trace for ops agent (it doesn't track steps internally)
    result["trace"] = [
        {"step": "fetch_context", "note": "Queried ERP inventory, orders, and supplier data"},
        {"step": "generate_answer", "note": "OpsAgent composed answer using retrieved context"},
    ]
    return {"agent": "ops", "result": result}
