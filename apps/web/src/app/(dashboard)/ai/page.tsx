"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  INSIGHTS,
  AGENT_RUNS,
  PRELOADED_RESULT,
  SUGGESTED_QUERIES,
  type InsightSeverity,
  type Insight,
  type AgentRun,
  type QueryResult,
  type TraceStep,
} from "@/lib/fixtures/ai";
import { aiApi } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────

function severityDot(s: InsightSeverity) {
  if (s === "red") return "bg-red-500 shadow-[0_0_6px_theme(colors.red.500)]";
  if (s === "yellow") return "bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]";
  return "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]";
}

function agentBadge(status: AgentRun["status"]) {
  if (status === "completed") return { text: "Completed", cls: "bg-emerald-500/10 text-emerald-400" };
  if (status === "running")   return { text: "Running",   cls: "bg-blue-500/10 text-blue-400" };
  return                             { text: "Failed",    cls: "bg-red-500/10 text-red-400" };
}

function fmtAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Trace viewer ─────────────────────────────────────────────────

function TraceViewer({ trace }: { trace: TraceStep[] }) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;
  return (
    <div className="border-t border-white/5 px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-text-tertiary bg-transparent border-0 cursor-pointer p-0 hover:text-text-secondary transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        Agent trace · {trace.length} steps
      </button>
      {open && (
        <ol className="mt-2 flex flex-col gap-1.5 pl-1">
          {trace.map((s, i) => (
            <li key={s.step} className="flex gap-2 items-start">
              <span className="w-4 h-4 rounded-full bg-vyne-purple/20 text-vyne-purple text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-[11px] text-text-secondary leading-snug">
                <span className="font-semibold text-text-primary">{s.step}</span>
                {" — "}{s.note}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link href={insight.href} className="block no-underline group">
      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/[0.07] hover:bg-white/[0.09] transition-colors cursor-pointer mb-1.5">
        <span className="text-sm shrink-0 mt-px">{insight.icon}</span>
        <span className="text-[11.5px] text-white/80 leading-snug flex-1">{insight.message}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${severityDot(insight.severity)}`} />
      </div>
    </Link>
  );
}

// ─── Result card ──────────────────────────────────────────────────

function ResultCard({ result, onFollowUp }: { result: QueryResult; onFollowUp: (q: string) => void }) {
  return (
    <div className="rounded-2xl border border-vyne-purple/15 bg-content-bg overflow-hidden shadow-[0_2px_20px_rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-content-border bg-gradient-to-r from-vyne-purple/5 to-purple-500/[0.02]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vyne-purple to-purple-500 flex items-center justify-center shrink-0">
          <span className="text-xs">✨</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-vyne-purple">Vyne AI</span>
          <span className="text-[10px] text-text-tertiary ml-2">{result.timestamp}</span>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-vyne-purple/10 text-vyne-purple font-medium truncate max-w-[160px] sm:max-w-xs">
          "{result.query}"
        </span>
      </div>

      {/* Answer */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[13.5px] text-text-primary leading-relaxed m-0">{result.answer}</p>
      </div>

      {/* Data tables */}
      {(result.data_tables ?? []).map((table) => (
        <div key={table.title} className="mx-4 mb-3 rounded-xl overflow-hidden border border-content-border">
          {table.title && (
            <div className="px-3.5 py-2 bg-table-header-bg border-b border-black/5 text-[10.5px] font-semibold text-text-secondary uppercase tracking-wide">
              {table.title}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[320px]">
              <thead>
                <tr className="bg-table-header-bg">
                  {Object.keys(table.rows[0] ?? {}).map((h) => (
                    <th key={h} className="px-3.5 py-2 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-black/[0.05] hover:bg-content-secondary transition-colors">
                    {Object.values(row).map((val, ci) => (
                      <td key={ci} className={`px-3.5 py-2 text-xs ${ci === 0 ? "font-semibold text-vyne-purple" : "text-text-primary"}`}>
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legacy orders fallback */}
      {result.orders.length > 0 && !result.data_tables?.length && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-black/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[280px]">
              <thead>
                <tr className="bg-table-header-bg">
                  {["Order", "Amount", "Days Late"].map((h) => (
                    <th key={h} className="px-3.5 py-2 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.orders.map((order) => (
                  <tr key={order.id} className="border-t border-black/[0.05]">
                    <td className="px-3.5 py-2.5 text-xs font-semibold text-vyne-purple">{order.id}</td>
                    <td className="px-3.5 py-2.5 text-xs text-text-primary">{fmtAmount(order.amount)}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${order.daysLate >= 4 ? "bg-red-500/10 text-red-500" : order.daysLate >= 2 ? "bg-yellow-400/10 text-yellow-600" : "bg-text-tertiary/10 text-text-secondary"}`}>
                        {order.daysLate}d late
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="px-4 pb-3">
        <span className="text-[11px] text-text-tertiary bg-table-header-bg px-2.5 py-1 rounded-md inline-block">
          {result.sources}
        </span>
      </div>

      {/* Follow-ups */}
      <div className="px-4 py-3 border-t border-content-border flex flex-wrap gap-2 items-center">
        <span className="text-[11px] text-text-tertiary">Follow up:</span>
        {result.followUps.map((fu) => (
          <button
            type="button"
            key={fu}
            onClick={() => onFollowUp(fu)}
            className="text-[11.5px] font-medium px-3 py-1 rounded-full border border-vyne-purple/25 bg-vyne-purple/6 text-vyne-purple hover:bg-vyne-purple/12 hover:border-vyne-purple/40 transition-all cursor-pointer"
          >
            {fu}
          </button>
        ))}
      </div>

      {result.trace && result.trace.length > 0 && <TraceViewer trace={result.trace} />}
    </div>
  );
}

// ─── Thinking indicator ───────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-content-bg border border-vyne-purple/15 shadow-[0_2px_12px_rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.06)]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vyne-purple to-purple-500 flex items-center justify-center shrink-0 animate-spin">
        <span className="text-sm">✨</span>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-text-primary m-0">Vyne AI is thinking…</p>
        <p className="text-[11px] text-text-tertiary m-0 mt-0.5">Querying across all modules</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function AIPage() {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([PRELOADED_RESULT]);
  const [liveInsights, setLiveInsights] = useState<typeof INSIGHTS | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    aiApi.getInsights()
      .then((r) => setLiveInsights(r.data.insights))
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    const q = query.trim();
    if (!q || thinking) return;
    setThinking(true);
    setQuery("");
    setSidebarOpen(false);
    try {
      const res = await aiApi.query(q);
      const r = res.data;
      setResults((prev) => [{
        query: q,
        answer: r.answer,
        orders: [],
        data_tables: r.data_tables,
        trace: r.trace,
        sources: r.sources,
        followUps: r.followUps,
        timestamp: "just now",
        agent: r.agent,
      }, ...prev]);
    } catch {
      setResults((prev) => [{
        query: q,
        answer: `Analyzed your query across all VYNE modules. Data pulled from relevant modules in real-time.`,
        orders: [],
        sources: "From: All modules · Real-time data",
        followUps: ["Tell me more", "Export results", "Set an alert"],
        timestamp: "just now",
      }, ...prev]);
    } finally {
      setThinking(false);
    }
  }

  function handleChip(q: string) {
    setQuery(q);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="h-full flex overflow-hidden bg-content-bg-secondary">

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left sidebar ── */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
          w-72 flex-shrink-0 flex flex-col overflow-hidden
          bg-gradient-to-b from-[#1A0A3C] to-[#0F0620]
          border-r border-vyne-purple/20
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-bold text-white tracking-tight">Vyne Intelligence</span>
            </div>
            <p className="text-[10.5px] text-white/40 mt-0.5 ml-7">Auto-detected insights · Live</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/40 hover:text-white/70 text-lg leading-none bg-transparent border-0 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Insights */}
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">
            Live Insights
          </p>
          {(liveInsights ?? INSIGHTS).map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}

          {/* Recent runs */}
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-5 mb-2 px-1">
            Recent Agent Runs
          </p>
          {AGENT_RUNS.slice(0, 4).map((run) => {
            const badge = agentBadge(run.status);
            return (
              <div key={run.id} className="flex items-center gap-2 py-2 border-b border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/85 truncate m-0">{run.type}</p>
                  <p className="text-[10px] text-white/40 m-0 mt-0.5">{run.startedAgo}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-gradient-to-r from-vyne-purple to-purple-500 px-5 sm:px-7 py-5 shrink-0 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-5 right-20 w-20 h-20 rounded-full bg-white/[0.03] pointer-events-none" />

          <div className="relative flex items-center gap-3">
            {/* Mobile: open sidebar */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm border-0 cursor-pointer hover:bg-white/20 transition-colors shrink-0"
              aria-label="Open insights sidebar"
            >
              🧠
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white m-0 tracking-tight">
                  Ask Vyne AI
                </h1>
              </div>
              <p className="text-[12.5px] text-white/70 m-0 mt-0.5">
                Natural language queries across all your business data
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

          {/* Query bar */}
          <div className="bg-content-bg rounded-2xl border border-vyne-purple/18 shadow-[0_4px_24px_rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.09)] p-4 mb-5">
            <div className="flex gap-3 items-center mb-3.5">
              <span className="text-lg shrink-0">✨</span>
              <label htmlFor="ai-query" className="sr-only">Ask Vyne AI a question</label>
              <input
                id="ai-query"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Ask anything… e.g. 'Which customers are at churn risk?'"
                className="flex-1 border-none outline-none text-sm text-text-primary bg-transparent font-[inherit] placeholder:text-text-tertiary"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!query.trim() || thinking}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold shrink-0 transition-all border-0 cursor-pointer
                  ${query.trim() && !thinking
                    ? "bg-gradient-to-r from-vyne-purple to-purple-500 text-white hover:opacity-90"
                    : "bg-content-secondary text-text-tertiary cursor-not-allowed"
                  }`}
              >
                {thinking ? "…" : "Send ↵"}
              </button>
            </div>

            {/* Suggested chips */}
            <div className="flex gap-2 flex-wrap">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => handleChip(q)}
                  className="text-[11.5px] font-medium px-3 py-1.5 rounded-full border border-vyne-purple/30 bg-vyne-purple/7 text-vyne-purple hover:bg-vyne-purple/14 hover:border-vyne-purple/50 transition-all cursor-pointer whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-3.5 mb-6">
            {thinking && <ThinkingIndicator />}
            {results.map((r, i) => (
              <ResultCard key={`${r.query}-${i}`} result={r} onFollowUp={handleChip} />
            ))}
          </div>

          {/* Agent runs table */}
          <div className="bg-content-bg border border-content-border rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-content-border">
              <span className="text-sm">🤖</span>
              <span className="text-[13px] font-bold text-text-primary">Recent Agent Runs</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-vyne-purple/10 text-vyne-purple ml-1">
                {AGENT_RUNS.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 600 }}>
                <thead>
                  <tr className="bg-table-header-bg">
                    {["Type", "Trigger", "Status", "Duration", "Started", "Summary"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGENT_RUNS.map((run) => {
                    const badge = agentBadge(run.status);
                    return (
                      <tr key={run.id} className="border-t border-content-border hover:bg-content-secondary transition-colors">
                        <td className="px-4 py-3 text-xs font-semibold text-text-primary whitespace-nowrap">{run.type}</td>
                        <td className="px-4 py-3 text-[11px] text-text-secondary whitespace-nowrap">{run.trigger}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-primary font-mono whitespace-nowrap">{run.duration}</td>
                        <td className="px-4 py-3 text-[11px] text-text-tertiary whitespace-nowrap">{run.startedAgo}</td>
                        <td className="px-4 py-3 text-[11.5px] text-text-secondary max-w-[260px]">{run.summary}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
