"""LangGraph InfraAgent — deployment, service health, metrics queries.

Graph topology
──────────────
fetch_context → generate_answer → END
"""
from __future__ import annotations

import structlog
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from src.agents.base import get_llm

log = structlog.get_logger(__name__)


class InfraState(TypedDict):
    question: str
    context: dict
    answer: str
    data_tables: list
    suggestions: list
    trace: list


async def fetch_infra_context(state: InfraState) -> dict:
    log.info("infra_agent.fetch_context", question_preview=state["question"][:80])
    question_lower = state["question"].lower()
    context: dict = {}
    data_tables: list = []
    trace = list(state.get("trace") or [])
    trace.append({"step": "fetch_context", "note": "Querying infrastructure metrics and deployment status"})

    if any(kw in question_lower for kw in ("deploy", "deployment", "release", "version")):
        deployments = [
            {"Service": "api-gateway", "Version": "v2.4.1", "Status": "healthy", "Deployed": "2h ago"},
            {"Service": "core-service", "Version": "v1.9.3", "Status": "healthy", "Deployed": "4h ago"},
            {"Service": "ai-service", "Version": "v0.7.2", "Status": "healthy", "Deployed": "4h ago"},
            {"Service": "erp-service", "Version": "v1.2.0", "Status": "degraded", "Deployed": "6h ago"},
        ]
        context["deployments"] = deployments
        data_tables.append({"title": "Recent Deployments", "rows": deployments})

    elif any(kw in question_lower for kw in ("health", "status", "up", "service", "degraded")):
        services = [
            {"Service": "api-gateway", "Status": "healthy", "Latency": "42ms", "Uptime": "99.97%"},
            {"Service": "core-service", "Status": "healthy", "Latency": "88ms", "Uptime": "99.91%"},
            {"Service": "ai-service", "Status": "healthy", "Latency": "234ms", "Uptime": "99.85%"},
            {"Service": "erp-service", "Status": "degraded", "Latency": "412ms", "Uptime": "98.4%"},
            {"Service": "messaging-service", "Status": "healthy", "Latency": "31ms", "Uptime": "99.99%"},
        ]
        context["service_health"] = services
        data_tables.append({"title": "Service Health", "rows": services})

    elif any(kw in question_lower for kw in ("cpu", "memory", "load", "resource", "usage")):
        context["resource_usage"] = {
            "avg_cpu_pct": 34.2,
            "avg_memory_pct": 58.7,
            "peak_cpu_service": "ai-service (72%)",
            "peak_memory_service": "core-service (81%)",
        }

    elif any(kw in question_lower for kw in ("alert", "alarm", "warning")):
        alerts = [
            {"Alert": "erp-service high latency", "Severity": "warning", "Triggered": "8min ago"},
            {"Alert": "ai-service memory > 75%", "Severity": "warning", "Triggered": "34min ago"},
        ]
        context["active_alerts"] = alerts
        data_tables.append({"title": "Active Alerts", "rows": alerts})

    else:
        context["infra_summary"] = {
            "healthy_services": 8,
            "degraded_services": 1,
            "recent_deployments_24h": 4,
            "open_alerts": 2,
        }

    return {"context": context, "data_tables": data_tables, "trace": trace}


async def generate_infra_answer(state: InfraState) -> dict:
    log.info("infra_agent.generate_answer", question_preview=state["question"][:80])
    trace = list(state.get("trace") or [])
    trace.append({"step": "generate_answer", "note": "Composing infrastructure analysis with LLM"})

    llm = get_llm()
    prompt = (
        "You are Vyne AI InfraAgent, an infrastructure intelligence assistant "
        "embedded in a Company Operating System.\n\n"
        f"User question: {state['question']}\n\n"
        f"Infrastructure data: {state['context']}\n\n"
        "Provide a concise infrastructure status summary (3-5 sentences). "
        "Highlight any degraded services or risks with specific latency/uptime numbers. "
        "End with one specific remediation step the operator should take now."
    )

    response = await llm.ainvoke([{"role": "user", "content": prompt}])

    suggestions: list[str] = []
    if "service_health" in state["context"]:
        degraded = [s for s in state["context"]["service_health"] if s.get("Status") != "healthy"]
        if degraded:
            suggestions = [f"Investigate {d['Service']} degraded latency" for d in degraded[:2]]
            suggestions.append("Enable auto-scaling for degraded services")
        else:
            suggestions = ["All services healthy — view full Observability dashboard"]
    elif "active_alerts" in state["context"]:
        suggestions = ["Acknowledge active alerts in Observability", "Set up PagerDuty escalation"]
    else:
        suggestions = ["Open Observability dashboard", "Review deployment logs"]

    trace.append({"step": "complete", "note": f"InfraAgent answered after {len(trace)} steps"})
    return {"answer": response.content, "suggestions": suggestions, "trace": trace}


def create_infra_agent():
    graph: StateGraph = StateGraph(InfraState)
    graph.add_node("fetch_context", fetch_infra_context)
    graph.add_node("generate_answer", generate_infra_answer)
    graph.set_entry_point("fetch_context")
    graph.add_edge("fetch_context", "generate_answer")
    graph.add_edge("generate_answer", END)
    return graph.compile()


infra_agent = create_infra_agent()
