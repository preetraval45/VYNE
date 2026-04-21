"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MOCK_EXPENSES, type Expense } from "@/lib/fixtures/expenses";

interface ExpensesState {
  expenses: Expense[];

  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

export const useExpensesStore = create<ExpensesState>()(
  persist(
    (set) => ({
      expenses: MOCK_EXPENSES,

      setExpenses: (expenses) => set({ expenses }),
      addExpense: (e) => {
        const id = `exp-${Date.now()}`;
        set((s) => ({ expenses: [{ ...e, id }, ...s.expenses] }));
        return id;
      },
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
    }),
    { name: "vyne-expenses" },
  ),
);
