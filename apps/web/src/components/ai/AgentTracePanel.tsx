"use client";

// Agent trace visualizer (UI_UPGRADE_PLAN.md 5.2).
//
// Renders every multi-step AgentTrace as a vertical timeline. Each step
// is a card showing kind/name/status/duration; clicking expands to
// reveal args + output JSON + the linked record refs. Failed steps
// surface an inline "Replay" button that re-runs the original tool
// call via the existing executeToolCall pipe.
//
// Mounts in two places:
//   - <AiPreferencesSettings /> as a global trace history (last 100)
//   - The chat page can drop it under an assistant message scoped to
//     that conversation by passing `conversationId`.

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleSlash,
  Wrench,
  Brain,
  GitBranch,
  Bot,
  User as UserIcon,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Activity,
} from "lucide-react";
import {
  useAgentTraces,
  totalCost,
  type AgentTrace,
  type AgentStep,
  type StepKind,
  type StepStatus,
} from "@/lib/stores/agentTraces";
import {
  executeToolCall,
  type ToolCall,
} from "@/lib/ai/toolExecutor";
import toast from "react-hot-toast";

const KIND_ICON: Record<StepKind, typeof Wrench> = {
  tool: Wrench,
  thought: Brain,
  decision: GitBranch,
  user: UserIcon,
  model: Bot,
  error: AlertTriangle,
};

const KIND_COLOR: Record<StepKind, string> = {
  tool: "var(--vyne-accent, var(--vyne-purple))",
  thought: "var(--text-secondary)",
  decision: "rgb(245, 158, 11)",
  user: "var(--vyne-teal)",
  model: "var(--accent-success)",
  error: "var(--accent-error)",
};

const STATUS_ICON: Record<StepStatus, typeof CheckCircle2> = {
  running: Loader2,
  ok: CheckCircle2,
  failed: XCircle,
  skipped: CircleSlash,
};

const STATUS_COLOR: Record<StepStatus, string> = {
  running: "var(--text-secondary)",
  ok: "var(--accent-success)",
  failed: "var(--accent-error)",
  skipped: "var(--text-tertiary)",
};

function formatDuration(start: string, end: string | undefined): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function StepRow({
  step,
  traceId,
}: {
  step: AgentStep;
  traceId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const KindIcon = KIND_ICON[step.kind];
  const StatusIcon = STATUS_ICON[step.status];
  const completeStep = useAgentTraces((s) => s.completeStep);

  const canReplay =
    step.kind === "tool" &&
    step.status === "failed" &&
    step.argsPreview &&
    typeof step.argsPreview === "object";

  async function replay() {
    if (!canReplay || !step.argsPreview) return;
    setReplaying(true);
    try {
      const call: ToolCall = {
        tool: step.name,
        args: step.argsPreview as Record<string, unknown>,
      };
      const result = await executeToolCall(call);
      completeStep(traceId, step.id, {
        status: result.ok ? "ok" : "failed",
        outputPreview: result,
        error: result.ok ? undefined : result.detail,
      });
      if (result.ok) toast.success(`Replayed ${step.name}`);
      else toast.error(`Replay failed: ${result.detail ?? "unknown error"}`);
    } finally {
      setReplaying(false);
    }
  }

  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 28,
        paddingBottom: 8,
        borderLeft: "1px solid var(--content-border)",
        marginLeft: 8,
      }}
    >
      {/* Bullet */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -7,
          top: 6,
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: "var(--content-bg)",
          border: `2px solid ${KIND_COLOR[step.kind]}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <KindIcon size={7} color={KIND_COLOR[step.kind]} />
      </span>

      <div
        style={{
          background: "var(--content-elevated)",
          border: "1px solid var(--content-border)",
          borderRadius: 6,
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            padding: 0,
            color: "var(--text-primary)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <strong style={{ fontSize: 13 }}>{step.name}</strong>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
            }}
          >
            {step.kind}
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: STATUS_COLOR[step.status],
            }}
          >
            <StatusIcon
              size={12}
              className={step.status === "running" ? "animate-spin" : undefined}
            />
            {step.status}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              minWidth: 60,
              textAlign: "right",
            }}
          >
            {formatDuration(step.startedAt, step.completedAt)}
          </span>
        </button>

        {expanded && (
          <div
            style={{
              borderTop: "1px solid var(--content-border)",
              paddingTop: 8,
              marginTop: 4,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 12,
            }}
          >
            {step.argsPreview && (
              <details>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  Arguments
                </summary>
                <pre
                  style={{
                    margin: "4px 0 0",
                    padding: 8,
                    background: "var(--content-bg)",
                    borderRadius: 4,
                    fontSize: 11,
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(step.argsPreview, null, 2)}
                </pre>
              </details>
            )}
            {step.outputPreview !== undefined && (
              <details open>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  Output
                </summary>
                <pre
                  style={{
                    margin: "4px 0 0",
                    padding: 8,
                    background: "var(--content-bg)",
                    borderRadius: 4,
                    fontSize: 11,
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(step.outputPreview, null, 2)}
                </pre>
              </details>
            )}
            {step.error && (
              <div
                style={{
                  padding: 8,
                  background: "var(--accent-error-soft)",
                  border: "1px solid var(--accent-error)",
                  borderRadius: 4,
                  color: "var(--accent-error)",
                }}
              >
                <strong>Error:</strong> {step.error}
              </div>
            )}
            {step.refs && step.refs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {step.refs.map((r) => (
                  <code
                    key={r}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--content-bg)",
                      border: "1px solid var(--content-border)",
                    }}
                  >
                    {r}
                  </code>
                ))}
              </div>
            )}
            {(step.costUsd ?? 0) > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                ${(step.costUsd ?? 0).toFixed(4)}
              </span>
            )}
            {canReplay && (
              <button
                type="button"
                onClick={replay}
                disabled={replaying}
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  fontSize: 12,
                  border: "1px solid var(--content-border)",
                  borderRadius: 5,
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                  cursor: replaying ? "wait" : "pointer",
                  marginTop: 2,
                }}
              >
                {replaying ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RotateCcw size={11} />
                )}
                Replay step
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function TraceCard({ trace }: { trace: AgentTrace }) {
  const [open, setOpen] = useState(trace.status === "running");
  const removeTrace = useAgentTraces((s) => s.removeTrace);
  const cost = totalCost(trace);
  const StatusIcon =
    trace.status === "running"
      ? Loader2
      : trace.status === "success"
        ? CheckCircle2
        : trace.status === "failed"
          ? XCircle
          : AlertTriangle;
  const statusColor =
    trace.status === "success"
      ? "var(--accent-success)"
      : trace.status === "failed"
        ? "var(--accent-error)"
        : trace.status === "partial"
          ? "rgb(245, 158, 11)"
          : "var(--text-secondary)";

  return (
    <article
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 8,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: open ? "1px solid var(--content-border)" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            padding: 0,
            color: "var(--text-primary)",
            cursor: "pointer",
            flex: 1,
            textAlign: "left",
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Activity size={13} aria-hidden="true" />
          <strong style={{ fontSize: 13 }}>{trace.goal}</strong>
        </button>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: statusColor,
          }}
        >
          <StatusIcon
            size={12}
            className={trace.status === "running" ? "animate-spin" : undefined}
          />
          {trace.status}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {trace.steps.length} step{trace.steps.length === 1 ? "" : "s"}
          {cost > 0 ? ` · $${cost.toFixed(4)}` : ""}
        </span>
        <button
          type="button"
          onClick={() => removeTrace(trace.id)}
          aria-label="Remove trace"
          title="Remove trace"
          style={{
            width: 24,
            height: 24,
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={12} />
        </button>
      </header>

      {open && (
        <div style={{ padding: "10px 12px" }}>
          {trace.summary && (
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                color: "var(--text-secondary)",
                fontStyle: "italic",
              }}
            >
              {trace.summary}
            </p>
          )}
          {trace.steps.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              No steps yet.
            </p>
          ) : (
            <ol
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {trace.steps.map((step) => (
                <StepRow key={step.id} step={step} traceId={trace.id} />
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}

interface AgentTracePanelProps {
  /** When set, only renders traces for that conversation. */
  conversationId?: string;
  /** Cap visible traces. Default 20 globally, 5 in chat embed. */
  limit?: number;
}

export function AgentTracePanel({
  conversationId,
  limit,
}: AgentTracePanelProps = {}) {
  const traces = useAgentTraces((s) => s.traces);

  const visible = useMemo(() => {
    const filtered = conversationId
      ? traces.filter((t) => t.conversationId === conversationId)
      : traces;
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    return sorted.slice(0, limit ?? (conversationId ? 5 : 20));
  }, [traces, conversationId, limit]);

  if (visible.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--content-border)",
          borderRadius: 8,
          padding: 24,
          textAlign: "center",
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
      >
        No agent traces yet. The AI logs a trace whenever it chains tool
        calls — ask it to do something multi-step (e.g. "find every overdue
        invoice and tag the customer as at-risk") and it'll appear here.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {visible.map((t) => (
        <TraceCard key={t.id} trace={t} />
      ))}
    </div>
  );
}
