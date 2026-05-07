"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAiCostMeter } from "@/lib/stores/aiCostMeter";

/**
 * Cost guardrails (28.2.5).
 *
 *   const decision = guardSpend("agent", 0.4);
 *   // → { ok: true | false, reason?: "soft-warn" | "hard-stop" }
 *
 * Wraps the existing `aiCostMeter` totals with workspace + per-user
 * budget caps. Three thresholds:
 *
 *   - softWarnPct  (default 0.80 of monthly cap) → toast + bell
 *   - hardStopPct  (default 1.00) → AI calls refuse with `hard-stop`
 *   - perUserCap   (optional)    → per-actor monthly USD cap
 *
 * Caps are read-only data; the actual enforcement lives in the AI
 * route handlers (call `guardSpend(actor, expectedCostUsd)` before
 * dispatching to Claude / Groq / OpenAI).
 */

export interface AiBudget {
  /** Workspace-wide monthly cap in USD. 0 = unlimited. */
  monthlyCapUsd: number;
  /** Per-user monthly cap. 0 = unlimited. */
  perUserCapUsd: number;
  /** Pct of `monthlyCapUsd` that triggers a soft-warn (toast + bell). */
  softWarnPct: number;
  /** Pct that hard-stops further AI calls. Default 1.00. */
  hardStopPct: number;
  /** When true, the cost-meter pill shows the budget bar. */
  showBudgetBar: boolean;
  /** Email recipients for budget alerts. */
  alertEmails: string[];
}

interface AiBudgetStore extends AiBudget {
  setBudget: (patch: Partial<AiBudget>) => void;
  reset: () => void;
}

const DEFAULT: AiBudget = {
  monthlyCapUsd: 0,
  perUserCapUsd: 0,
  softWarnPct: 0.8,
  hardStopPct: 1.0,
  showBudgetBar: true,
  alertEmails: [],
};

export const useAiBudget = create<AiBudgetStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      setBudget: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set({ ...DEFAULT }),
    }),
    { name: "vyne-ai-budget", version: 1 },
  ),
);

export type GuardOutcome =
  | { ok: true; reason?: "soft-warn"; pct: number }
  | { ok: false; reason: "hard-stop"; pct: number };

/**
 * Pre-flight check before dispatching a call. Returns:
 *
 *   { ok: true }                                    → safe to call
 *   { ok: true, reason: "soft-warn" }               → call but flag
 *   { ok: false, reason: "hard-stop" }              → refuse the call
 *
 * The caller adds `expectedCostUsd` to the projected MTD; the actual
 * call reports its true cost via `recordAiCall` in `aiCostMeter`.
 */
export function guardSpend(
  actor: string | undefined,
  expectedCostUsd: number,
): GuardOutcome {
  const budget = useAiBudget.getState();
  if (budget.monthlyCapUsd === 0) {
    return { ok: true, pct: 0 };
  }
  const month = useAiCostMeter.getState().totalsThisMonth();
  const projected = month.usd + Math.max(0, expectedCostUsd);
  const pct = projected / budget.monthlyCapUsd;
  if (pct >= budget.hardStopPct) {
    return { ok: false, reason: "hard-stop", pct };
  }
  if (pct >= budget.softWarnPct) {
    return { ok: true, reason: "soft-warn", pct };
  }
  // Per-user cap
  if (actor && budget.perUserCapUsd > 0) {
    const events = useAiCostMeter.getState().events;
    const start = (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const userMtd = events
      .filter(
        (e) =>
          e.source === actor &&
          new Date(e.ts).getTime() >= start,
      )
      .reduce((sum, e) => sum + e.costUsd, 0);
    if (userMtd + Math.max(0, expectedCostUsd) >= budget.perUserCapUsd) {
      return { ok: false, reason: "hard-stop", pct };
    }
  }
  return { ok: true, pct };
}
