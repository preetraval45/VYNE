"""Query router — dispatches to the appropriate LangGraph agent.

Routing rules
─────────────
• Keywords indicating a live/recent production problem  → incident_agent
• Everything else (ERP questions, inventory, ops data)  → ops_agent

The function intentionally stays simple.  As VYNE grows, this is where
more sophisticated intent-classification (e.g. a small classifier LLM call)
would live before fanning out to the specialised graphs.
"""
from __future__ import annotations

import structlog

from src.agents.incident_agent import IncidentState, incident_agent
from src.agents.ops_agent import OpsState, ops_agent

log = structlog.get_logger(__name__)

# Keywords that indicate the user is asking about an ongoing incident
_INCIDENT_KEYWORDS = frozenset(
    {
        "incident",
        "deployment",
        "deploy",
        "failed",
        "failure",
        "error",
        "outage",
        "down",
        "crash",
        "exception",
        "timeout",
        "502",
        "503",
        "500",
        "unhealthy",
        "rollback",
    }
)


def _is_incident_query(query: str) -> bool:
    lower = query.lower()
    return any(kw in lower for kw in _INCIDENT_KEYWORDS)


async def route_query(query: str, context: dict) -> dict:
    """Route *query* to the correct agent and return a normalised result dict.

    Returns
    -------
    {
        "agent": "incident" | "ops",
        "result": <full agent state after graph run>,
    }
    """
    if _is_incident_query(query):
        log.info("orchestrator.route", agent="incident", query_preview=query[:80])

        initial_state: IncidentState = {
            "incident_id": context.get("incident_id", "unknown"),
            "error_message": query,
            "service_name": context.get("service", "unknown"),
            "deployment_info": context.get("deployment", {}),
            "affected_orders": context.get("orders"),
            # Outputs — initialised to empty values
            "root_cause": "",
            "impact_analysis": "",
            "revenue_at_risk": 0.0,
            "recommendation": "",
            "similar_incidents": [],
            "messages": [],
        }

        result = await incident_agent.ainvoke(initial_state)
        return {"agent": "incident", "result": result}

    else:
        log.info("orchestrator.route", agent="ops", query_preview=query[:80])

        initial_state: OpsState = {
            "question": query,
            "context": {},
            "answer": "",
            "data_tables": [],
            "suggestions": [],
        }

        result = await ops_agent.ainvoke(initial_state)
        return {"agent": "ops", "result": result}
