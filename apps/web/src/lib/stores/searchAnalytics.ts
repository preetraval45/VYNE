"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Search analytics store. Records every Cmd+K / global search query
 * the user submits, plus zero-result occurrences and click-throughs.
 * Powers the admin /settings → Search analytics panel.
 *
 * All client-side; ships nothing to the server unless an admin
 * explicitly exports.
 */

export interface SearchEvent {
  id: string;
  query: string;
  /** Number of results returned (or 0). */
  resultCount: number;
  /** Whether the user clicked a result. */
  clicked: boolean;
  /** Result category clicked, if any. */
  clickedCategory?: string;
  /** ISO timestamp. */
  ts: string;
}

interface SearchAnalyticsStore {
  events: SearchEvent[];
  record: (e: Omit<SearchEvent, "id" | "ts"> & { id?: string; ts?: string }) => void;
  clear: () => void;
  topQueries: (limit?: number) => Array<{ query: string; count: number; ctr: number }>;
  zeroResultRate: () => number;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_EVENTS = 500;

export const useSearchAnalytics = create<SearchAnalyticsStore>()(
  persist(
    (set, get) => ({
      events: [],
      record: (e) => {
        const row: SearchEvent = {
          id: e.id ?? newId(),
          ts: e.ts ?? new Date().toISOString(),
          query: e.query.trim(),
          resultCount: e.resultCount,
          clicked: e.clicked,
          clickedCategory: e.clickedCategory,
        };
        if (!row.query) return;
        set((s) => ({ events: [row, ...s.events].slice(0, MAX_EVENTS) }));
      },
      clear: () => set({ events: [] }),
      topQueries: (limit = 10) => {
        const map = new Map<string, { count: number; clicks: number }>();
        for (const e of get().events) {
          const k = e.query.toLowerCase();
          const cur = map.get(k) ?? { count: 0, clicks: 0 };
          cur.count += 1;
          if (e.clicked) cur.clicks += 1;
          map.set(k, cur);
        }
        return Array.from(map.entries())
          .map(([query, v]) => ({
            query,
            count: v.count,
            ctr: v.count > 0 ? v.clicks / v.count : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
      zeroResultRate: () => {
        const evs = get().events;
        if (!evs.length) return 0;
        const zero = evs.filter((e) => e.resultCount === 0).length;
        return zero / evs.length;
      },
    }),
    { name: "vyne-search-analytics", version: 1 },
  ),
);
