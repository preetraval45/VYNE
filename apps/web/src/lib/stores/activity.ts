"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Per-record activity feed. Scoped by { recordType, recordId } so any
// page (task, project, deal, contact) can subscribe to its own history
// without pulling the whole log. Persisted to localStorage so the feed
// survives refresh — server sync comes later.

export type ActivityRecordType =
  | "project"
  | "task"
  | "subtask"
  | "deal"
  | "contact"
  | "invoice"
  | "product";

export interface ActivityEntry {
  id: string;
  recordType: ActivityRecordType;
  recordId: string;
  /** Short imperative verb — "moved", "updated", "created", "archived" */
  verb: string;
  /** Human-readable one-liner shown in the feed */
  summary: string;
  /** Optional field that was changed, e.g. "status" */
  field?: string;
  /** Optional before/after values rendered as chips */
  from?: string;
  to?: string;
  /** Actor name for presence (falls back to "You") */
  actor?: string;
  /** ISO */
  createdAt: string;
}

interface ActivityStore {
  entries: ActivityEntry[];
  log: (
    entry: Omit<ActivityEntry, "id" | "createdAt" | "actor"> & {
      actor?: string;
    },
  ) => ActivityEntry;
  entriesFor: (recordType: ActivityRecordType, recordId: string) => ActivityEntry[];
  recent: (limit?: number) => ActivityEntry[];
  clear: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      entries: [],
      log: (entry) => {
        const row: ActivityEntry = {
          ...entry,
          id: newId(),
          createdAt: new Date().toISOString(),
          actor: entry.actor ?? "You",
        };
        // Cap at 400 entries so localStorage doesn't balloon.
        set((state) => ({ entries: [row, ...state.entries].slice(0, 400) }));
        return row;
      },
      entriesFor: (recordType, recordId) =>
        get().entries.filter(
          (e) => e.recordType === recordType && e.recordId === recordId,
        ),
      recent: (limit = 20) => get().entries.slice(0, limit),
      clear: () => set({ entries: [] }),
    }),
    { name: "vyne-activity", version: 1 },
  ),
);

/** Stable relative-time helper used by the feed UI. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
