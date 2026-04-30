"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ERPJournalEntry } from "@/lib/api/client";
import { MOCK_JOURNAL } from "@/lib/fixtures/finance";
import { seedOrEmpty } from "@/lib/stores/seedMode";

interface FinanceState {
  journalEntries: ERPJournalEntry[];

  setJournalEntries: (entries: ERPJournalEntry[]) => void;
  addJournalEntry: (entry: ERPJournalEntry) => void;
  updateJournalEntry: (id: string, patch: Partial<ERPJournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      journalEntries: seedOrEmpty(MOCK_JOURNAL),

      setJournalEntries: (journalEntries) => set({ journalEntries }),
      addJournalEntry: (entry) =>
        set((s) => ({ journalEntries: [entry, ...s.journalEntries] })),
      updateJournalEntry: (id, patch) =>
        set((s) => ({
          journalEntries: s.journalEntries.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),
      deleteJournalEntry: (id) =>
        set((s) => ({
          journalEntries: s.journalEntries.filter((e) => e.id !== id),
        })),
    }),
    { name: "vyne-finance" },
  ),
);

export const useJournalEntries = () =>
  useFinanceStore((s) => s.journalEntries);
