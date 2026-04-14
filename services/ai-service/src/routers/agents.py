"""FastAPI router — AI agent endpoints.

/agents/chat        POST   Stream an LLM response as Server-Sent Events.
/agents/suggestions GET    Return AI action suggestions for a given issue.

The chat endpoint now routes through the LangGraph orchestrator, which
delegates to either the incident_agent or the ops_agent depending on the
content of the user message.

SSE token format (unchanged from the original Bedrock implementation so the
web client does not need any updates):

    data: {"token": "hello "}
    data: {"token": "world"}
    data: {"done": true}
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncGenerator

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..dependencies import get_current_user

CurrentUser = Annotated[dict, Depends(get_current_user)]

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str
    conversationId: str | None = None
    context: dict[str, Any] | None = None


class SuggestionsResponse(BaseModel):
    suggestions: list[str]


class QueryRequest(BaseModel):
    question: str
    context: dict[str, Any] | None = None


class TraceStep(BaseModel):
    step: str
    note: str


class QueryResponse(BaseModel):
    answer: str
    sources: str
    followUps: list[str]
    data_tables: list[dict[str, Any]]
    trace: list[TraceStep]
    agent: str


class InsightItem(BaseModel):
    id: str
    icon: str
    message: str
    severity: str  # "red" | "yellow" | "green"
    href: str


class InsightsResponse(BaseModel):
    insights: list[InsightItem]
    generated_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _format_incident_response(data: dict) -> str:
    """Build a markdown-formatted incident summary from agent state."""
    parts: list[str] = []

    root_cause = (data.get("root_cause") or "").strip()
    if root_cause:
        parts.append(f"**Root Cause**\n{root_cause}")

    impact = (data.get("impact_analysis") or "").strip()
    revenue = data.get("revenue_at_risk", 0.0)
    if impact:
        parts.append(f"**Impact**\n{impact}")
    elif revenue:
        parts.append(f"**Revenue at Risk**\n${revenue:,.2f}")

    recommendation = (data.get("recommendation") or "").strip()
    if recommendation:
        parts.append(f"**Recommendation**\n{recommendation}")

    similar = data.get("similar_incidents") or []
    if similar:
        refs = ", ".join(s.get("id", "?") for s in similar)
        parts.append(f"**Related Incidents**\n{refs}")

    return "\n\n".join(parts) if parts else "Incident analysis complete."


def _format_ops_response(data: dict) -> str:
    """Build a markdown-formatted ops answer from agent state."""
    answer = (data.get("answer") or "").strip()
    suggestions = data.get("suggestions") or []

    if suggestions:
        bullet_list = "\n".join(f"- {s}" for s in suggestions)
        return f"{answer}\n\n**Suggested actions**\n{bullet_list}"
    return answer or "I couldn't process that request."


async def _stream_agent_response(
    message: str,
    context: dict | None,
) -> AsyncGenerator[str, None]:
    """Invoke the LangGraph orchestrator and stream the result token-by-token.

    Falls back gracefully: if the orchestrator raises (e.g. import error in a
    minimal environment) we return a helpful dev message rather than a 500.
    """
    try:
        from src.agents.orchestrator import route_query  # noqa: PLC0415

        result = await route_query(message, context or {})
        agent_type: str = result["agent"]
        data: dict = result["result"]

        if agent_type == "incident":
            response_text = _format_incident_response(data)
        else:
            response_text = _format_ops_response(data)

    except Exception as exc:  # noqa: BLE001
        log.warning(
            "agent_orchestrator_error",
            error=str(exc),
            mode="fallback",
        )
        response_text = (
            "I'm the VYNE AI assistant. I can help you manage issues, "
            "analyse incidents, search across your workspace, and surface "
            "insights from your ERP data. What would you like to explore?"
        )

    # Stream word-by-word with a small delay to simulate token streaming.
    # This keeps the UX identical to the previous Bedrock streaming path.
    words = response_text.split()
    for i, word in enumerate(words):
        token = word + (" " if i < len(words) - 1 else "")
        yield f"data: {json.dumps({'token': token})}\n\n"
        await asyncio.sleep(0.025)

    yield f"data: {json.dumps({'done': True})}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/chat")
async def chat(
    body: ChatRequest,
    _user: CurrentUser,
) -> StreamingResponse:
    """Stream an AI assistant response as Server-Sent Events.

    Each event: ``data: {"token": "..."}\\n\\n``
    Final event: ``data: {"done": true}\\n\\n``
    """
    conversation_id = body.conversationId or str(uuid.uuid4())
    log.info(
        "agent_chat",
        conversation_id=conversation_id,
        message_preview=body.message[:80],
    )

    return StreamingResponse(
        _stream_agent_response(body.message, body.context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Conversation-Id": conversation_id,
        },
    )


@router.get("/suggestions/{issue_id}")
async def get_suggestions(
    issue_id: str,
    _user: CurrentUser,
) -> SuggestionsResponse:
    """Return AI-generated action suggestions for a given issue.

    Attempts a real Bedrock call first; falls back to curated canned
    suggestions if Bedrock is unavailable.
    """
    log.info("agent_suggestions", issue_id=issue_id)

    try:
        import boto3  # noqa: PLC0415

        client = boto3.client("bedrock-runtime")
        prompt = (
            f"Generate 5 concise, actionable suggestions for resolving issue {issue_id}. "
            "Respond with a JSON array of strings only, no explanations."
        )
        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        response = client.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(response["body"].read())
        raw: str = result["content"][0]["text"].strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw.strip())
        if isinstance(suggestions, list):
            return SuggestionsResponse(suggestions=suggestions[:10])
    except Exception as exc:  # noqa: BLE001
        log.warning("bedrock_suggestions_unavailable", error=str(exc))

    # Dev / fallback — deliberately opinionated suggestions
    return SuggestionsResponse(
        suggestions=[
            "Break this into smaller sub-issues",
            "Add acceptance criteria before starting",
            "This looks similar to ENG-31 — check that solution",
            "Assign to someone with IAM expertise",
            "Review the most recent commits touching this module",
        ]
    )


# ---------------------------------------------------------------------------
# /query — structured BI query endpoint
# ---------------------------------------------------------------------------

_AGENT_SOURCES: dict[str, str] = {
    "finance": "From: Finance module · Invoices · Accounting",
    "infra": "From: Observability · Deployments · Metrics",
    "incident": "From: Incident log · Deployment history · Orders",
    "ops": "From: Inventory · Orders · Suppliers · ERP",
}

_AGENT_FOLLOW_UPS: dict[str, list[str]] = {
    "finance": ["Show me the P&L breakdown", "Which invoices are overdue?", "Revenue vs last month"],
    "infra": ["Show service health status", "Any recent deployment failures?", "CPU and memory usage"],
    "incident": ["What caused this incident?", "How many orders are stuck?", "Rollback options"],
    "ops": ["Show low stock items", "Which orders are delayed?", "Top suppliers by value"],
}


@router.post("/query")
async def structured_query(
    body: QueryRequest,
    _user: CurrentUser,
) -> QueryResponse:
    """Run a structured BI query through the agent orchestrator.

    Returns a complete, non-streaming response with answer text, optional
    data tables, follow-up suggestions, and a LangGraph reasoning trace.
    """
    log.info("agent_query", question_preview=body.question[:80])

    try:
        from src.agents.orchestrator import route_query  # noqa: PLC0415

        result = await route_query(body.question, body.context or {})
        agent_type: str = result["agent"]
        data: dict = result["result"]

        if agent_type == "incident":
            answer = _format_incident_response(data)
            data_tables: list[dict[str, Any]] = []
        else:
            answer = data.get("answer") or "No answer generated."
            data_tables = data.get("data_tables") or []

        raw_trace = data.get("trace") or []
        trace = [TraceStep(step=s["step"], note=s["note"]) for s in raw_trace]
        follow_ups = (data.get("suggestions") or [])[:3] or _AGENT_FOLLOW_UPS.get(agent_type, [])

    except Exception as exc:  # noqa: BLE001
        log.warning("structured_query_error", error=str(exc))
        agent_type = "ops"
        answer = (
            "I'm Vyne AI. I can answer questions about your business data — "
            "inventory levels, overdue orders, financial summaries, service health, "
            "and more. What would you like to know?"
        )
        data_tables = []
        trace = []
        follow_ups = ["Show low stock items", "Which orders are delayed?", "Revenue this month"]

    return QueryResponse(
        answer=answer,
        sources=_AGENT_SOURCES.get(agent_type, "From: VYNE modules · Real-time data"),
        followUps=follow_ups,
        data_tables=data_tables,
        trace=trace,
        agent=agent_type,
    )


# ---------------------------------------------------------------------------
# /insights — daily auto-generated workspace insights
# ---------------------------------------------------------------------------

_STATIC_INSIGHTS = [
    {
        "id": "ins-001",
        "icon": "🔴",
        "message": "3 invoices overdue totaling $18,750 — oldest is 35 days",
        "severity": "red",
        "href": "/finance",
    },
    {
        "id": "ins-002",
        "icon": "🟡",
        "message": "PWR-003 (Power Adapter) will stock out in ~4 days at current sales rate",
        "severity": "yellow",
        "href": "/ops",
    },
    {
        "id": "ins-003",
        "icon": "🟡",
        "message": "erp-service latency spiked to 412ms — 1.7× above baseline",
        "severity": "yellow",
        "href": "/code",
    },
    {
        "id": "ins-004",
        "icon": "🟢",
        "message": "Revenue up 12.4% vs last month — driven by enterprise deals",
        "severity": "green",
        "href": "/finance",
    },
    {
        "id": "ins-005",
        "icon": "🔴",
        "message": "47 orders stuck in processing since last deployment at 02:14 UTC",
        "severity": "red",
        "href": "/ops",
    },
    {
        "id": "ins-006",
        "icon": "🟡",
        "message": "3 open pull requests have been idle for >5 days — sprint at risk",
        "severity": "yellow",
        "href": "/projects",
    },
    {
        "id": "ins-007",
        "icon": "🟢",
        "message": "Supplier ElectroParts Ltd response time improved: avg 1.2 days (was 3.4)",
        "severity": "green",
        "href": "/ops",
    },
]


@router.get("/insights")
async def get_insights(
    _user: CurrentUser,
) -> InsightsResponse:
    """Return auto-generated daily workspace insights.

    In production these are computed from live ERP, deployment, and finance
    data.  The current implementation returns a realistic static set so the
    UI is wired to a real endpoint with graceful fallback semantics.
    """
    return InsightsResponse(
        insights=[InsightItem(**i) for i in _STATIC_INSIGHTS],
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
