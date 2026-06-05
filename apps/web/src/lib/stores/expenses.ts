"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MOCK_EXPENSES, type Expense } from "@/lib/fixtures/expenses";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";

// PH-A R3: every write mirrors to /api/expenses (Postgres). Reads
// hydrate from the same endpoint on first mount via hydrateFromServer.
// Pattern matches lib/stores/crm.ts — optimistic local update + fire-
// and-forget server mirror.

function mirrorCreate(e: Expense) {
  void fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e),
  }).catch(() => {});
}
function mirrorUpdate(id: string, patch: Partial<Expense>) {
  void fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorDelete(id: string) {
  void fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

interface ExpensesState {
  expenses: Expense[];
  hydrated: boolean;

  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  hydrateFromServer: () => Promise<void>;
}

export const useExpensesStore = create<ExpensesState>()(
  persist(
    (set, get) => ({
      expenses: seedOrEmpty(MOCK_EXPENSES),
      hydrated: false,

      setExpenses: (expenses) => set({ expenses, hydrated: true }),

      addExpense: (e) => {
        const id = `exp-${Date.now()}`;
        const row = { ...e, id } as Expense;
        set((s) => ({ expenses: [row, ...s.expenses] }));
        mirrorCreate(row);
        return id;
      },
      updateExpense: (id, patch) => {
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }));
        mirrorUpdate(id, patch);
      },
      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
        mirrorDelete(id);
      },

      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/expenses", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { expenses?: Expense[] };
          if (Array.isArray(body.expenses) && body.expenses.length > 0) {
            set({ expenses: body.expenses, hydrated: true });
          } else if (Array.isArray(body.expenses)) {
            // Empty server-side. Demo session keeps the fixture so the
            // showcase isn't blank; real signups stay empty.
            if (shouldSeedFixtures()) {
              set({ expenses: MOCK_EXPENSES, hydrated: true });
            } else {
              set({ expenses: [], hydrated: true });
            }
          }
        } catch {
          if (!get().hydrated) set({ hydrated: false });
        }
      },
    }),
    { name: "vyne-expenses" },
  ),
);
