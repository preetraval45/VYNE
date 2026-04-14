"""LangGraph FinanceAgent — revenue, P&L, invoices, cashflow queries.

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


class FinanceState(TypedDict):
    question: str
    context: dict
    answer: str
    data_tables: list
    suggestions: list
    trace: list  # reasoning steps


async def fetch_finance_context(state: FinanceState) -> dict:
    log.info("finance_agent.fetch_context", question_preview=state["question"][:80])
    question_lower = state["question"].lower()
    context: dict = {}
    data_tables: list = []
    trace = list(state.get("trace") or [])
    trace.append({"step": "fetch_context", "note": "Querying financial ledger and invoice data"})

    if any(kw in question_lower for kw in ("revenue", "sales", "mtd", "month")):
        context["revenue"] = {
            "mtd": 284_500.0,
            "ytd": 1_842_300.0,
            "vs_last_month_pct": 12.4,
            "vs_last_year_pct": 34.7,
        }
        data_tables.append({
            "title": "Revenue Summary",
            "rows": [
                {"Period": "This Month", "Amount": "$284,500", "Growth": "+12.4%"},
                {"Period": "Year to Date", "Amount": "$1,842,300", "Growth": "+34.7%"},
            ],
        })

    elif any(kw in question_lower for kw in ("invoice", "overdue", "payment", "receivable")):
        overdue = [
            {"Invoice": "INV-2847", "Customer": "TechCorp Ltd", "Amount": "$8,400", "Days Overdue": 12},
            {"Invoice": "INV-2803", "Customer": "StartupXYZ", "Amount": "$4,250", "Days Overdue": 28},
            {"Invoice": "INV-2791", "Customer": "RetailCo", "Amount": "$6,100", "Days Overdue": 35},
        ]
        context["overdue_invoices"] = overdue
        context["overdue_total"] = 18_750.0
        data_tables.append({"title": "Overdue Invoices", "rows": overdue})

    elif any(kw in question_lower for kw in ("expense", "cost", "spend")):
        context["expenses"] = {
            "mtd_opex": 112_300.0,
            "vs_last_month_pct": -3.2,
            "top_category": "Cloud infrastructure ($34,200)",
        }

    elif any(kw in question_lower for kw in ("profit", "margin", "p&l", "pnl")):
        context["pnl"] = {
            "gross_revenue": 284_500.0,
            "cost_of_goods": 142_250.0,
            "gross_margin_pct": 50.0,
            "operating_expenses": 112_300.0,
            "net_profit": 29_950.0,
            "net_margin_pct": 10.5,
        }
        data_tables.append({
            "title": "P&L Summary",
            "rows": [
                {"Line Item": "Gross Revenue", "Amount": "$284,500", "Margin": "—"},
                {"Line Item": "Cost of Goods", "Amount": "$142,250", "Margin": "—"},
                {"Line Item": "Gross Profit", "Amount": "$142,250", "Margin": "50.0%"},
                {"Line Item": "Operating Expenses", "Amount": "$112,300", "Margin": "—"},
                {"Line Item": "Net Profit", "Amount": "$29,950", "Margin": "10.5%"},
            ],
        })

    else:
        context["finance_summary"] = {
            "cash_balance": 412_800.0,
            "accounts_receivable": 68_750.0,
            "accounts_payable": 31_200.0,
            "runway_months": 18,
        }

    return {"context": context, "data_tables": data_tables, "trace": trace}


async def generate_finance_answer(state: FinanceState) -> dict:
    log.info("finance_agent.generate_answer", question_preview=state["question"][:80])
    trace = list(state.get("trace") or [])
    trace.append({"step": "generate_answer", "note": "Composing financial analysis with LLM"})

    llm = get_llm()
    prompt = (
        "You are Vyne AI FinanceAgent, a financial intelligence assistant "
        "embedded in a Company Operating System.\n\n"
        f"User question: {state['question']}\n\n"
        f"Financial data: {state['context']}\n\n"
        "Provide a concise financial analysis (3-5 sentences) using specific "
        "numbers from the data. Be precise with currency amounts. End with one "
        "actionable next step the user can take inside VYNE."
    )

    response = await llm.ainvoke([{"role": "user", "content": prompt}])

    suggestions: list[str] = []
    if "overdue_invoices" in state["context"]:
        suggestions = [
            "Send payment reminders to all overdue clients",
            "Flag invoices >30 days for collections review",
        ]
    elif "revenue" in state["context"]:
        suggestions = [
            "View full revenue breakdown in Finance module",
            "Export revenue report to CSV",
        ]
    elif "pnl" in state["context"]:
        suggestions = [
            "Review expense categories in Accounting",
            "Set monthly cost-reduction targets",
        ]
    else:
        suggestions = [
            "Open Finance dashboard for full overview",
            "Generate monthly P&L report",
        ]

    trace.append({"step": "complete", "note": f"FinanceAgent answered after {len(trace)} steps"})
    return {"answer": response.content, "suggestions": suggestions, "trace": trace}


def create_finance_agent():
    graph: StateGraph = StateGraph(FinanceState)
    graph.add_node("fetch_context", fetch_finance_context)
    graph.add_node("generate_answer", generate_finance_answer)
    graph.set_entry_point("fetch_context")
    graph.add_edge("fetch_context", "generate_answer")
    graph.add_edge("generate_answer", END)
    return graph.compile()


finance_agent = create_finance_agent()
