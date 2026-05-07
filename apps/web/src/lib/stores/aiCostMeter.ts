"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * AI cost meter — append-only ledger of per-call token usage.
 *
 *   recordAiCall({ model: "claude-opus-4-7", inputTokens: 412, outputTokens: 128 });
 *
 * Pricing comes from a static table (refresh on each release as
 * provider prices change). The store rolls events into a per-day
 * bucket so the chat-header pill can show "MTD: $1.42 · 2.3M tokens".
 *
 * Distinct from `useSearchAnalytics` (search) and `useNotificationCenter`
 * (delivery). Capped at 1000 events to keep the localStorage blob
 * reasonable.
 */

export interface AiCostEvent {
  id: string;
  ts: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** USD cost for this single call, computed from PRICING. */
  costUsd: number;
  /** Optional caller tag — "chat", "agent", "search", … */
  source?: string;
}

interface AiCostStore {
  events: AiCostEvent[];
  record: (e: Omit<AiCostEvent, "id" | "ts" | "costUsd"> & {
    id?: string;
    ts?: string;
  }) => AiCostEvent;
  clear: () => void;
  totalsToday: () => { tokens: number; usd: number };
  totalsThisMonth: () => { tokens: number; usd: number };
}

/** Pricing per 1M tokens — input / output, USD.
 *  Update on each release. Unknown models fall back to a flat
 *  $3 / $15 per M which is roughly mid-tier 2026. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-opus-4-7[1m]": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "groq/llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
};

function priceCall(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING["claude-sonnet-4-6"];
  return (
    (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
  );
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_EVENTS = 1_000;

export const useAiCostMeter = create<AiCostStore>()(
  persist(
    (set, get) => ({
      events: [],
      record: (e) => {
        const row: AiCostEvent = {
          id: e.id ?? newId(),
          ts: e.ts ?? new Date().toISOString(),
          model: e.model,
          inputTokens: Math.max(0, e.inputTokens),
          outputTokens: Math.max(0, e.outputTokens),
          source: e.source,
          costUsd: priceCall(e.model, e.inputTokens, e.outputTokens),
        };
        set((s) => ({ events: [row, ...s.events].slice(0, MAX_EVENTS) }));
        return row;
      },
      clear: () => set({ events: [] }),
      totalsToday: () => {
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        const start = cutoff.getTime();
        let tokens = 0;
        let usd = 0;
        for (const e of get().events) {
          if (new Date(e.ts).getTime() >= start) {
            tokens += e.inputTokens + e.outputTokens;
            usd += e.costUsd;
          }
        }
        return { tokens, usd };
      },
      totalsThisMonth: () => {
        const cutoff = new Date();
        cutoff.setDate(1);
        cutoff.setHours(0, 0, 0, 0);
        const start = cutoff.getTime();
        let tokens = 0;
        let usd = 0;
        for (const e of get().events) {
          if (new Date(e.ts).getTime() >= start) {
            tokens += e.inputTokens + e.outputTokens;
            usd += e.costUsd;
          }
        }
        return { tokens, usd };
      },
    }),
    { name: "vyne-ai-cost-meter", version: 1 },
  ),
);

/** Module-level helper so SSE / fetch wrappers can record without a hook. */
export function recordAiCall(payload: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  source?: string;
}) {
  return useAiCostMeter.getState().record(payload);
}
