"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ERPJournalEntry } from "@/lib/api/client";
import { MOCK_JOURNAL } from "@/lib/fixtures/finance";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";
import { subscribe as rtSubscribe, isRealtimeEnabled } from "@/lib/realtime";

// ─── Remote mirror helpers (Postgres via /api/journal-entries) ───
function mirrorEntryCreate(e: ERPJournalEntry) {
  void fetch("/api/journal-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e),
  }).catch(() => {});
}
function mirrorEntryUpdate(id: string, patch: Partial<ERPJournalEntry>) {
  void fetch(`/api/journal-entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorEntryDelete(id: string) {
  void fetch(`/api/journal-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

interface FinanceState {
  journalEntries: ERPJournalEntry[];
  journalHydrated: boolean;

  setJournalEntries: (entries: ERPJournalEntry[]) => void;
  addJournalEntry: (entry: ERPJournalEntry) => void;
  updateJournalEntry: (id: string, patch: Partial<ERPJournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  hydrateJournalFromServer: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      journalEntries: seedOrEmpty(MOCK_JOURNAL),
      journalHydrated: false,

      setJournalEntries: (journalEntries) => set({ journalEntries }),
      addJournalEntry: (entry) => {
        set((s) => ({ journalEntries: [entry, ...s.journalEntries] }));
        mirrorEntryCreate(entry);
      },
      updateJournalEntry: (id, patch) => {
        set((s) => ({
          journalEntries: s.journalEntries.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }));
        mirrorEntryUpdate(id, patch);
      },
      deleteJournalEntry: (id) => {
        set((s) => ({
          journalEntries: s.journalEntries.filter((e) => e.id !== id),
        }));
        mirrorEntryDelete(id);
      },

      hydrateJournalFromServer: async () => {
        try {
          const res = await fetch("/api/journal-entries", {
            cache: "no-store",
          });
          if (!res.ok) return;
          // The CRUD factory keys list output by `resource` ("journalEntries").
          const body = (await res.json()) as {
            journalEntries?: ERPJournalEntry[];
          };
          if (
            Array.isArray(body.journalEntries) &&
            body.journalEntries.length > 0
          ) {
            set({
              journalEntries: body.journalEntries,
              journalHydrated: true,
            });
          } else if (Array.isArray(body.journalEntries)) {
            if (shouldSeedFixtures()) {
              set({ journalEntries: MOCK_JOURNAL, journalHydrated: true });
            } else {
              set({ journalEntries: [], journalHydrated: true });
            }
          }
        } catch {
          if (!get().journalHydrated) set({ journalHydrated: false });
        }
      },
    }),
    { name: "vyne-finance" },
  ),
);

export const useJournalEntries = () =>
  useFinanceStore((s) => s.journalEntries);

// ── Realtime subscription ──────────────────────────────────────────
let _financeRtBound = false;
export function bindFinanceRealtime(orgId = "demo") {
  if (_financeRtBound || !isRealtimeEnabled()) return;
  _financeRtBound = true;
  rtSubscribe<ERPJournalEntry>(`org-${orgId}`, "journal:created", (e) => {
    useFinanceStore.setState((s) => {
      if (s.journalEntries.some((x) => x.id === e.id)) return s;
      return { journalEntries: [e, ...s.journalEntries] };
    });
  });
  rtSubscribe<ERPJournalEntry>(`org-${orgId}`, "journal:updated", (e) => {
    useFinanceStore.setState((s) => ({
      journalEntries: s.journalEntries.map((x) =>
        x.id === e.id ? { ...x, ...e } : x,
      ),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "journal:deleted", ({ id }) => {
    useFinanceStore.setState((s) => ({
      journalEntries: s.journalEntries.filter((e) => e.id !== id),
    }));
  });
}
