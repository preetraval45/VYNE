"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Multi-step agent traces (28.2.12).
 *
 * When the AI executor chains tool calls (search → update → notify),
 * each call appends a step to a per-conversation trace. The chat UI
 * renders the trace as a vertical timeline so users see exactly what
 * the AI did + which records moved.
 *
 *   const trace = startTrace({ conversationId: "c-1", goal: "Close the Acme deal" });
 *   appendStep(trace.id, { type: "tool", name: "queryDeals", argsPreview: { stage: "Won" } });
 *   completeStep(trace.id, stepId, { ok: true, output: { count: 3 } });
 *   finishTrace(trace.id, { status: "success", summary: "Closed 3 deals." });
 *
 * The store is the audit-trail for AI actions — pairs with the
 * Phase 23.9 audit-diff component for compliance reviews.
 */

export type StepKind =
  | "tool"
  | "thought"
  | "decision"
  | "user"
  | "model"
  | "error";

export type StepStatus = "running" | "ok" | "failed" | "skipped";

export interface AgentStep {
  id: string;
  kind: StepKind;
  /** Tool name / decision label / model name. */
  name: string;
  /** Pre-call argument summary (truncated). */
  argsPreview?: Record<string, unknown>;
  /** Post-call output preview (truncated). */
  outputPreview?: unknown;
  /** ISO of the step start. */
  startedAt: string;
  /** ISO of the step end. null while running. */
  completedAt?: string;
  status: StepStatus;
  /** Optional error message when status === "failed". */
  error?: string;
  /** Token cost USD (recorded post-call from `aiCostMeter`). */
  costUsd?: number;
  /** Linked record refs the step touched. */
  refs?: string[];
}

export interface AgentTrace {
  id: string;
  conversationId: string;
  /** Free-form goal description. */
  goal: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "partial" | "failed";
  summary?: string;
  steps: AgentStep[];
}

interface AgentTracesStore {
  traces: AgentTrace[];

  startTrace: (
    payload: Omit<
      AgentTrace,
      "id" | "startedAt" | "status" | "steps" | "completedAt" | "summary"
    > & { id?: string },
  ) => AgentTrace;
  appendStep: (
    traceId: string,
    step: Omit<AgentStep, "id" | "startedAt" | "status" | "completedAt"> & {
      id?: string;
      status?: StepStatus;
    },
  ) => AgentStep | null;
  completeStep: (
    traceId: string,
    stepId: string,
    patch: {
      status?: StepStatus;
      outputPreview?: unknown;
      error?: string;
      costUsd?: number;
      refs?: string[];
    },
  ) => void;
  finishTrace: (
    traceId: string,
    patch: { status: AgentTrace["status"]; summary?: string },
  ) => void;
  removeTrace: (traceId: string) => void;
  tracesFor: (conversationId: string) => AgentTrace[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_TRACES = 100;

function truncatePreview(value: unknown): unknown {
  try {
    const str = JSON.stringify(value);
    if (str.length <= 600) return value;
    return JSON.parse(str.slice(0, 600) + "}");
  } catch {
    return String(value).slice(0, 600);
  }
}

export const useAgentTraces = create<AgentTracesStore>()(
  persist(
    (set, get) => ({
      traces: [],

      startTrace: (payload) => {
        const row: AgentTrace = {
          id: payload.id ?? newId(),
          conversationId: payload.conversationId,
          goal: payload.goal.slice(0, 240),
          startedAt: new Date().toISOString(),
          status: "running",
          steps: [],
        };
        set((s) => ({ traces: [row, ...s.traces].slice(0, MAX_TRACES) }));
        return row;
      },
      appendStep: (traceId, step) => {
        const row: AgentStep = {
          id: step.id ?? newId(),
          kind: step.kind,
          name: step.name.slice(0, 80),
          argsPreview: step.argsPreview
            ? (truncatePreview(step.argsPreview) as Record<string, unknown>)
            : undefined,
          startedAt: new Date().toISOString(),
          status: step.status ?? "running",
          refs: step.refs,
        };
        let appended: AgentStep | null = null;
        set((s) => ({
          traces: s.traces.map((t) => {
            if (t.id !== traceId) return t;
            appended = row;
            return { ...t, steps: [...t.steps, row] };
          }),
        }));
        return appended;
      },
      completeStep: (traceId, stepId, patch) =>
        set((s) => ({
          traces: s.traces.map((t) =>
            t.id === traceId
              ? {
                  ...t,
                  steps: t.steps.map((step) =>
                    step.id === stepId
                      ? {
                          ...step,
                          status: patch.status ?? step.status,
                          outputPreview:
                            patch.outputPreview !== undefined
                              ? truncatePreview(patch.outputPreview)
                              : step.outputPreview,
                          error: patch.error,
                          costUsd: patch.costUsd ?? step.costUsd,
                          refs: patch.refs ?? step.refs,
                          completedAt: new Date().toISOString(),
                        }
                      : step,
                  ),
                }
              : t,
          ),
        })),
      finishTrace: (traceId, patch) =>
        set((s) => ({
          traces: s.traces.map((t) =>
            t.id === traceId
              ? {
                  ...t,
                  status: patch.status,
                  summary: patch.summary,
                  completedAt: new Date().toISOString(),
                }
              : t,
          ),
        })),
      removeTrace: (traceId) =>
        set((s) => ({ traces: s.traces.filter((t) => t.id !== traceId) })),
      tracesFor: (conversationId) =>
        get()
          .traces.filter((t) => t.conversationId === conversationId)
          .sort(
            (a, b) =>
              new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
          ),
    }),
    { name: "vyne-agent-traces", version: 1 },
  ),
);

/** Cost roll-up across every step in a trace. */
export function totalCost(trace: AgentTrace): number {
  return trace.steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
}
