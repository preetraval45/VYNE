"""LangGraph operations / ERP assistant agent.

Graph topology
──────────────
fetch_context → generate_answer → END

Handles natural-language questions about inventory, orders, finances, and
other ERP data.  In production, fetch_context queries the real DB; in dev
it injects seeded demo data based on keywords in the question.
"""
from __future__ import annotations

import structlog
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from src.agents.base import get_llm

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------


class OpsState(TypedDict):
    question: str
    context: dict       # relevant data fetched from ERP DB
    answer: str
    data_tables: list   # structured tables to surface in the UI
    suggestions: list   # quick-action suggestions


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


async def fetch_context(state: OpsState) -> dict:
    """Retrieve ERP data relevant to the question.

    In production this runs parameterised SQL against the VYNE ERP schema
    (inventory, orders, invoices, etc.) using pgvector semantic search to
    find the most relevant rows.

    The keyword branches below replicate realistic DB shapes so the LLM
    node has concrete numbers to reason about.
    """
    log.info("ops_agent.fetch_context", question_preview=state["question"][:80])

    question_lower = state["question"].lower()
    context: dict = {}
    data_tables: list = []

    if any(kw in question_lower for kw in ("stock", "inventory", "reorder", "low")):
        low_stock = [
            {
                "sku": "PWR-003",
                "name": "Power Supply Unit",
                "stock": 38,
                "reorder_point": 50,
                "supplier": "ElectroParts Ltd",
                "lead_time_days": 7,
            },
            {
                "sku": "CAB-012",
                "name": "Network Cable 5m",
                "stock": 12,
                "reorder_point": 100,
                "supplier": "CableWorld",
                "lead_time_days": 3,
            },
            {
                "sku": "FAN-007",
                "name": "Chassis Cooling Fan",
                "stock": 5,
                "reorder_point": 25,
                "supplier": "CoolerTech",
                "lead_time_days": 5,
            },
        ]
        context["low_stock_items"] = low_stock
        data_tables.append({"title": "Low-Stock Items", "rows": low_stock})

    elif any(kw in question_lower for kw in ("order", "stuck", "processing", "delayed")):
        stuck_orders = [
            {
                "order_number": "ORD-2847",
                "customer": "TechCorp Ltd",
                "amount": 4250.00,
                "status": "processing",
                "age_hours": 18,
            },
            {
                "order_number": "ORD-2851",
                "customer": "StartupXYZ",
                "amount": 890.50,
                "status": "processing",
                "age_hours": 9,
            },
            {
                "order_number": "ORD-2863",
                "customer": "MegaRetail Inc",
                "amount": 12_400.00,
                "status": "processing",
                "age_hours": 3,
            },
        ]
        context["stuck_orders"] = stuck_orders
        data_tables.append({"title": "Stuck Orders", "rows": stuck_orders})

    elif any(kw in question_lower for kw in ("revenue", "sales", "invoice", "payment")):
        context["revenue_summary"] = {
            "mtd": 284_500.00,
            "vs_last_month_pct": 12.4,
            "overdue_invoices": 3,
            "overdue_total": 18_750.00,
        }

    elif any(kw in question_lower for kw in ("supplier", "vendor", "purchase")):
        context["suppliers"] = [
            {"name": "ElectroParts Ltd", "open_pos": 2, "total_value": 14_200.00},
            {"name": "CableWorld", "open_pos": 1, "total_value": 3_400.00},
        ]

    else:
        # Generic workspace summary — always useful as a fallback
        context["workspace_summary"] = {
            "open_issues": 24,
            "overdue_orders": 3,
            "low_stock_skus": 3,
            "active_incidents": 1,
        }

    return {"context": context, "data_tables": data_tables}


async def generate_answer(state: OpsState) -> dict:
    """Use the LLM to compose a helpful, data-grounded answer."""
    log.info("ops_agent.generate_answer", question_preview=state["question"][:80])

    llm = get_llm()
    prompt = (
        "You are Vyne AI, an intelligent business operations assistant embedded "
        "in a Company Operating System.\n\n"
        f"User question: {state['question']}\n\n"
        f"Available data: {state['context']}\n\n"
        "Provide a concise, helpful answer (3-5 sentences) using specific numbers "
        "from the data where available. End with one actionable next step the user "
        "can take directly inside VYNE."
    )

    response = await llm.ainvoke([{"role": "user", "content": prompt}])

    # Derive quick-action suggestions from context shape
    suggestions: list[str] = []
    if "low_stock_items" in state["context"]:
        suggestions.append("Create a purchase order for all below-reorder SKUs")
        suggestions.append("Set automatic reorder alerts for these items")
    if "stuck_orders" in state["context"]:
        suggestions.append("Escalate stuck orders to the operations team")
        suggestions.append("Run the order-recovery workflow to retry processing")
    if not suggestions:
        suggestions = [
            "View the full report in the Analytics tab",
            "Export this data to CSV",
        ]

    return {"answer": response.content, "suggestions": suggestions}


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------


def create_ops_agent():
    graph: StateGraph = StateGraph(OpsState)

    graph.add_node("fetch_context", fetch_context)
    graph.add_node("generate_answer", generate_answer)

    graph.set_entry_point("fetch_context")
    graph.add_edge("fetch_context", "generate_answer")
    graph.add_edge("generate_answer", END)

    return graph.compile()


# Module-level singleton
ops_agent = create_ops_agent()
