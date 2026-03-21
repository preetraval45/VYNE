"""LangGraph multi-step incident analysis agent.

Graph topology
──────────────
gather_context → analyze_root_cause → calculate_impact → generate_recommendation → END

Each node receives the full IncidentState, mutates the fields it owns, and
returns the updated state.  LangGraph merges the returned dict back into the
running state automatically.
"""
from __future__ import annotations

from typing import Optional

import structlog
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from src.agents.base import get_llm

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------


class IncidentState(TypedDict):
    # Inputs
    incident_id: str
    error_message: str
    service_name: str
    deployment_info: dict
    affected_orders: Optional[list]

    # Agent outputs  (populated by graph nodes)
    root_cause: str
    impact_analysis: str
    revenue_at_risk: float
    recommendation: str
    similar_incidents: list
    messages: list


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


async def gather_context(state: IncidentState) -> dict:
    """Enrich the incident with historical data from the knowledge base.

    In production this queries the VYNE database for incidents that share
    the same service name, error pattern, or deployment fingerprint.
    For now it injects a realistic seeded example so the downstream nodes
    have something concrete to reason about.
    """
    log.info("incident_agent.gather_context", incident_id=state.get("incident_id"))

    # TODO(production): replace with DB query
    # similar = await db.fetch_similar_incidents(
    #     service=state["service_name"], error=state["error_message"], limit=3
    # )
    similar_incidents = [
        {
            "id": "ENG-31",
            "date": "2026-02-04",
            "cause": "IAM task-role missing s3:GetObject for the config bucket",
            "resolution": "Updated ECS task-role policy; deployment unblocked in < 5 min",
        },
        {
            "id": "ENG-19",
            "date": "2025-11-18",
            "cause": "RDS connection pool exhausted during Blue/Green cutover",
            "resolution": "Increased max_connections and added pgBouncer pooler",
        },
    ]

    return {"similar_incidents": similar_incidents}


async def analyze_root_cause(state: IncidentState) -> dict:
    """Use the LLM to identify the technical root cause."""
    log.info("incident_agent.analyze_root_cause", service=state.get("service_name"))

    llm = get_llm()
    prompt = (
        "You are a senior DevOps engineer analyzing a production incident.\n\n"
        f"Service:            {state['service_name']}\n"
        f"Error:              {state['error_message']}\n"
        f"Deployment info:    {state['deployment_info']}\n"
        f"Similar incidents:  {state['similar_incidents']}\n\n"
        "Identify the most likely root cause in 1-2 concise, technical sentences. "
        "If a similar past incident matches the pattern, reference it by ID."
    )

    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"root_cause": response.content}


async def calculate_impact(state: IncidentState) -> dict:
    """Compute revenue at risk and write a human-readable impact statement."""
    log.info("incident_agent.calculate_impact", incident_id=state.get("incident_id"))

    orders = state.get("affected_orders") or []
    order_count = len(orders) if orders else 47  # seeded demo value
    avg_order_value = 263.83  # $12,400 / 47 — seeded demo average
    revenue_at_risk = round(order_count * avg_order_value, 2)
    impact_analysis = (
        f"{order_count} orders are stuck in processing. "
        f"Revenue at risk: ${revenue_at_risk:,.2f}"
    )

    return {
        "revenue_at_risk": revenue_at_risk,
        "impact_analysis": impact_analysis,
    }


async def generate_recommendation(state: IncidentState) -> dict:
    """Use the LLM to generate a structured, actionable remediation plan."""
    log.info(
        "incident_agent.generate_recommendation",
        incident_id=state.get("incident_id"),
    )

    llm = get_llm()
    prompt = (
        "You are a senior DevOps engineer writing a remediation plan.\n\n"
        f"Root cause:  {state['root_cause']}\n"
        f"Impact:      {state['impact_analysis']}\n\n"
        "Provide a structured recommendation with exactly three sections:\n"
        "1. **Immediate fix (< 5 min)** — the fastest path to restore service.\n"
        "2. **Rollback option** — how to revert safely if the fix fails.\n"
        "3. **Prevention** — how to stop this from happening again.\n\n"
        "Be specific, use CLI commands where appropriate, and keep each section to "
        "2-3 sentences."
    )

    response = await llm.ainvoke([{"role": "user", "content": prompt}])
    return {"recommendation": response.content}


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------


def create_incident_agent():
    graph: StateGraph = StateGraph(IncidentState)

    graph.add_node("gather_context", gather_context)
    graph.add_node("analyze_root_cause", analyze_root_cause)
    graph.add_node("calculate_impact", calculate_impact)
    graph.add_node("generate_recommendation", generate_recommendation)

    graph.set_entry_point("gather_context")
    graph.add_edge("gather_context", "analyze_root_cause")
    graph.add_edge("analyze_root_cause", "calculate_impact")
    graph.add_edge("calculate_impact", "generate_recommendation")
    graph.add_edge("generate_recommendation", END)

    return graph.compile()


# Module-level singleton — import and call ainvoke() directly.
incident_agent = create_incident_agent()
