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

/**
 * "change" = a system audit entry (status moved, field updated…).
 * The rest are user-logged CRM interactions (call/email/meeting/note) with a
 * free-text `body`. Defaulting to "change" keeps every existing `log()` caller
 * backward-compatible.
 */
export type ActivityKind = "change" | "note" | "call" | "email" | "meeting";

export interface ActivityEntry {
  id: string;
  recordType: ActivityRecordType;
  recordId: string;
  /** Short imperative verb — "moved", "updated", "created", "archived", "logged" */
  verb: string;
  /** Human-readable one-liner shown in the feed */
  summary: string;
  /** What kind of entry — audit change vs. a logged interaction. */
  kind?: ActivityKind;
  /** Free-text body for logged interactions (call notes, email gist, etc.) */
  body?: string;
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
  hydrated: boolean;
  log: (
    entry: Omit<ActivityEntry, "id" | "createdAt" | "actor"> & {
      actor?: string;
    },
  ) => ActivityEntry;
  entriesFor: (
    recordType: ActivityRecordType,
    recordId: string,
  ) => ActivityEntry[];
  recent: (limit?: number) => ActivityEntry[];
  clear: () => void;
  /** Replace the local cache with the canonical server feed (Postgres). */
  hydrateFromServer: () => Promise<void>;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      entries: [],
      hydrated: false,
      log: (entry) => {
        const row: ActivityEntry = {
          ...entry,
          id: newId(),
          createdAt: new Date().toISOString(),
          actor: entry.actor ?? "You",
        };
        // Optimistic local insert (cap so localStorage doesn't balloon).
        set((state) => ({ entries: [row, ...state.entries].slice(0, 400) }));
        // Mirror to Postgres via /api/activities (fire-and-forget). Send the
        // locally-minted id so the server row matches the optimistic one.
        void fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        }).catch(() => {
          // Offline / server hiccup — optimistic row stays; a later
          // hydrateFromServer reconciles.
        });
        return row;
      },
      entriesFor: (recordType, recordId) =>
        get().entries.filter(
          (e) => e.recordType === recordType && e.recordId === recordId,
        ),
      recent: (limit = 20) => get().entries.slice(0, limit),
      clear: () => set({ entries: [] }),
      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/activities", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { activities?: ActivityEntry[] };
          if (Array.isArray(body.activities)) {
            set({ entries: body.activities, hydrated: true });
          }
        } catch {
          // Offline — keep the local cache as-is.
        }
      },
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
