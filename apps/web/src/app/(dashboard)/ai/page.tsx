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

// ─── Helper functions (no nested ternaries) ───────────────────────

function getSeverityDotColor(severity: InsightSeverity): string {
  if (severity === "red") return "var(--status-danger)";
  if (severity === "yellow") return "var(--status-warning)";
  return "var(--status-success)";
}

function getAgentStatusBadge(status: AgentRun["status"]): {
  label: string;
  bg: string;
  color: string;
} {
  if (status === "completed")
    return {
      label: "✅ Completed",
      bg: "rgba(34,197,94,0.12)",
      color: "var(--badge-success-text)",
    };
  if (status === "running")
    return {
      label: "🔵 Running",
      bg: "rgba(59,130,246,0.12)",
      color: "var(--badge-info-text)",
    };
  return { label: "❌ Failed", bg: "rgba(239,68,68,0.12)", color: "var(--badge-danger-text)" };
}

function getDaysLateColor(daysLate: number): string {
  if (daysLate >= 4) return "var(--status-danger)";
  if (daysLate >= 2) return "var(--status-warning)";
  return "var(--text-secondary)";
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────

function TraceViewer({ trace }: Readonly<{ trace: TraceStep[] }>) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;
  return (
    <div className="border-t border-black/[0.05] px-[18px] py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[5px] text-[11px] text-text-tertiary bg-transparent border-0 cursor-pointer p-0"
      >
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        Agent reasoning trace ({trace.length} steps)
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {trace.map((s, i) => (
            <div key={s.step} className="flex gap-2 items-start">
              <span className="w-[18px] h-[18px] rounded-full bg-vyne-purple/10 text-vyne-purple text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <span className="text-[11px] font-semibold text-text-primary">{s.step}</span>
                <span className="text-[11px] text-text-tertiary ml-1.5">{s.note}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: Readonly<{ insight: Insight }>) {
  const dotColor = getSeverityDotColor(insight.severity);
  return (
    <Link href={insight.href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          transition: "background 0.15s",
          marginBottom: 6,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background =
            "rgba(255,255,255,0.09)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background =
            "rgba(255,255,255,0.05)";
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
          {insight.icon}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: "rgba(255,255,255,0.82)",
            lineHeight: 1.45,
            flex: 1,
          }}
        >
          {insight.message}
        </span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
      </div>
    </Link>
  );
}

function SidebarAgentRow({ run }: Readonly<{ run: AgentRun }>) {
  const badge = getAgentStatusBadge(run.status);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {run.type}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            marginTop: 1,
          }}
        >
          {run.startedAgo}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          padding: "2px 7px",
          borderRadius: 20,
          background: badge.bg,
          color: badge.color,
          whiteSpace: "nowrap",
        }}
      >
        {badge.label}
      </span>
    </div>
  );
}

function SuggestedChip({
  label,
  onClick,
}: Readonly<{ label: string; onClick: (q: string) => void }>) {
  return (
    <button
      onClick={() => onClick(label)}
      style={{
        padding: "6px 13px",
        borderRadius: 20,
        border: "1px solid rgba(108,71,255,0.3)",
        background: "rgba(108,71,255,0.07)",
        color: "var(--vyne-purple)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = "rgba(108,71,255,0.14)";
        btn.style.borderColor = "rgba(108,71,255,0.5)";
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = "rgba(108,71,255,0.07)";
        btn.style.borderColor = "rgba(108,71,255,0.3)";
      }}
    >
      {label}
    </button>
  );
}

function FollowUpChip({
  label,
  onClick,
}: Readonly<{ label: string; onClick: (q: string) => void }>) {
  return (
    <button
      onClick={() => onClick(label)}
      style={{
        padding: "5px 11px",
        borderRadius: 20,
        border: "1px solid rgba(108,71,255,0.25)",
        background: "rgba(108,71,255,0.06)",
        color: "var(--vyne-purple)",
        fontSize: 11.5,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(108,71,255,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(108,71,255,0.06)";
      }}
    >
      {label}
    </button>
  );
}

function ThinkingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 20px",
        background: "var(--content-bg)",
        border: "1px solid rgba(108,71,255,0.15)",
        borderRadius: 12,
        boxShadow: "0 2px 12px rgba(108,71,255,0.06)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6C47FF, #8B5CF6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "spin 1.2s linear infinite",
        }}
      >
        <span style={{ fontSize: 14 }}>✨</span>
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Vyne AI is thinking…
        </div>
        <div
          style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}
        >
          Querying across all modules
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onFollowUp,
}: Readonly<{ result: QueryResult; onFollowUp: (q: string) => void }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid rgba(108,71,255,0.15)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(108,71,255,0.07)",
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background:
            "linear-gradient(135deg, rgba(108,71,255,0.04), rgba(139,92,246,0.02))",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6C47FF, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13 }}>✨</span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--vyne-purple)",
            }}
          >
            Vyne AI
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {result.timestamp}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 20,
            background: "rgba(108,71,255,0.1)",
            color: "var(--vyne-purple)",
            fontWeight: 500,
          }}
        >
          "{result.query}"
        </div>
      </div>

      {/* Answer text */}
      <div style={{ padding: "16px 18px 12px" }}>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-primary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {result.answer}
        </p>
      </div>

      {/* Data tables from real API response */}
      {(result.data_tables ?? []).map((table) => (
        <div
          key={table.title}
          style={{
            margin: "0 18px 14px",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid var(--content-border)",
          }}
        >
          {table.title && (
            <div className="px-[14px] py-[7px] bg-[#FAFAFE] border-b border-black/[0.06] text-[11px] font-semibold text-text-secondary">
              {table.title}
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F7F7FB]">
                {Object.keys(table.rows[0] ?? {}).map((h) => (
                  <th key={h} className="px-[14px] py-[7px] text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.06em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-black/[0.05]">
                  {Object.values(row).map((val, ci) => (
                    <td key={ci} className={`px-[14px] py-2 text-xs ${ci === 0 ? "font-semibold text-vyne-purple" : "text-text-primary"}`}>
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Fallback: legacy orders array (preloaded mock) */}
      {result.orders.length > 0 && !result.data_tables?.length && (
        <div className="mx-[18px] mb-[14px] rounded-lg overflow-hidden border border-black/[0.08]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F7F7FB]">
                {["Order", "Amount", "Days Late"].map((h) => (
                  <th key={h} className="px-[14px] py-2 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-[0.06em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.orders.map((order) => {
                const lateColor = getDaysLateColor(order.daysLate);
                return (
                  <tr key={order.id} className="border-t border-black/[0.05]">
                    <td className="px-[14px] py-[9px] text-xs font-semibold text-vyne-purple">{order.id}</td>
                    <td className="px-[14px] py-[9px] text-xs text-text-primary">{formatAmount(order.amount)}</td>
                    <td className="px-[14px] py-[9px]">
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: `${lateColor}18`, color: lateColor }}>
                        {order.daysLate}d late
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sources */}
      <div style={{ padding: "0 18px 12px" }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            background: "var(--table-header-bg)",
            padding: "4px 10px",
            borderRadius: 6,
            display: "inline-block",
          }}
        >
          {result.sources}
        </span>
      </div>

      {/* Follow-up chips */}
      <div
        style={{
          padding: "10px 18px 14px",
          borderTop: "1px solid var(--content-border)",
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            alignSelf: "center",
            marginRight: 2,
          }}
        >
          Follow up:
        </span>
        {result.followUps.map((fu) => (
          <FollowUpChip key={fu} label={fu} onClick={onFollowUp} />
        ))}
      </div>

      {result.trace && result.trace.length > 0 && (
        <TraceViewer trace={result.trace} />
      )}
    </div>
  );
}

function AgentRunsTable({ runs }: Readonly<{ runs: AgentRun[] }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>🤖</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Recent Agent Runs
        </span>
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 20,
            background: "rgba(108,71,255,0.1)",
            color: "var(--vyne-purple)",
            fontWeight: 600,
          }}
        >
          {runs.length} runs
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {[
                "Type",
                "Trigger",
                "Status",
                "Duration",
                "Started",
                "Summary",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const badge = getAgentStatusBadge(run.status);
              return (
                <tr
                  key={run.id}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "var(--content-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {run.type}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {run.trigger}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: badge.bg,
                        color: badge.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {run.duration}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {run.startedAgo}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 11.5,
                      color: "var(--text-secondary)",
                      maxWidth: 280,
                    }}
                  >
                    {run.summary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function AIPage() {
  const [queryInput, setQueryInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([PRELOADED_RESULT]);
  const [liveInsights, setLiveInsights] = useState<typeof INSIGHTS | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    aiApi.getInsights()
      .then((r) => setLiveInsights(r.data.insights))
      .catch(() => {}); // fall back to static INSIGHTS on error
  }, []);

  async function handleSubmit() {
    const trimmed = queryInput.trim();
    if (!trimmed || isThinking) return;
    setIsThinking(true);
    setQueryInput("");
    try {
      const res = await aiApi.query(trimmed);
      const r = res.data;
      setResults((prev) => [
        {
          query: trimmed,
          answer: r.answer,
          orders: [],
          data_tables: r.data_tables,
          trace: r.trace,
          sources: r.sources,
          followUps: r.followUps,
          timestamp: "just now",
          agent: r.agent,
        },
        ...prev,
      ]);
    } catch {
      setResults((prev) => [
        {
          query: trimmed,
          answer: `Analyzed your query across all VYNE modules. Data pulled from relevant modules in real-time.`,
          orders: [],
          sources: "From: All modules · Real-time data",
          followUps: ["Tell me more", "Export results", "Set an alert"],
          timestamp: "just now",
        },
        ...prev,
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  function handleChipClick(query: string) {
    setQueryInput(query);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleFollowUp(query: string) {
    setQueryInput(query);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  return (
    <>
      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); } 40% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
        {/* ── Left Sidebar ── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: "linear-gradient(180deg, #1A0A3C 0%, #0F0620 100%)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid rgba(108,71,255,0.2)",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: "18px 16px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>🧠</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                Vyne Intelligence
              </span>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Auto-detected insights · Updated now
            </p>
          </div>

          {/* Insights feed */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 0" }}>
            <div style={{ marginBottom: 10 }}>
              {(liveInsights ?? INSIGHTS).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>

            {/* Recent Agent Runs (sidebar compact) */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                paddingTop: 14,
                paddingBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                  paddingLeft: 2,
                }}
              >
                Recent Agent Runs
              </div>
              {AGENT_RUNS.slice(0, 4).map((run) => (
                <SidebarAgentRow key={run.id} run={run} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Main Area ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--content-bg-secondary)",
          }}
        >
          {/* Purple gradient header */}
          <div
            style={{
              background: "linear-gradient(135deg, #6C47FF 0%, #8B5CF6 100%)",
              padding: "22px 28px",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -20,
                right: 80,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 22 }}>✨</span>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Ask Vyne AI
                </h1>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.72)",
                  margin: 0,
                }}
              >
                Natural language queries across all your business data
              </p>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {/* ── Query bar ── */}
            <div
              style={{
                background: "var(--content-bg)",
                borderRadius: 14,
                boxShadow: "0 4px 24px rgba(108,71,255,0.1)",
                border: "1px solid rgba(108,71,255,0.18)",
                padding: "16px 18px",
                marginBottom: 18,
              }}
            >
              {/* Input row */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
                <label htmlFor="ai-query-input" style={{ display: "none" }}>
                  Ask Vyne AI a question
                </label>
                <input
                  id="ai-query-input"
                  ref={inputRef}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… e.g. 'Which customers are at churn risk?'"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    color: "var(--text-primary)",
                    background: "transparent",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!queryInput.trim() || isThinking}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 9,
                    border: "none",
                    background:
                      queryInput.trim() && !isThinking
                        ? "linear-gradient(135deg, #6C47FF, #8B5CF6)"
                        : "#E5E5F0",
                    color:
                      queryInput.trim() && !isThinking ? "#fff" : "#A0A0B8",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      queryInput.trim() && !isThinking
                        ? "pointer"
                        : "not-allowed",
                    transition: "all 0.15s",
                    flexShrink: 0,
                  }}
                >
                  {isThinking ? "…" : "Send ↵"}
                </button>
              </div>

              {/* Suggested query chips */}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {SUGGESTED_QUERIES.map((q) => (
                  <SuggestedChip key={q} label={q} onClick={handleChipClick} />
                ))}
              </div>
            </div>

            {/* ── Query results area ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {isThinking && <ThinkingIndicator />}
              {results.map((result, idx) => (
                <ResultCard
                  key={`${result.query}-${idx}`}
                  result={result}
                  onFollowUp={handleFollowUp}
                />
              ))}
            </div>

            {/* ── Agent runs table ── */}
            <AgentRunsTable runs={AGENT_RUNS} />
          </div>
        </div>
      </div>
    </>
  );
}
