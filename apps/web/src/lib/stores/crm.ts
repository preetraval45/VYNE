"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_DEALS, type Deal } from "@/lib/fixtures/crm";

interface CRMState {
  deals: Deal[];
  hydrated: boolean;

  setDeals: (deals: Deal[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  setHydrated: (v: boolean) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      deals: INITIAL_DEALS,
      hydrated: false,

      setDeals: (deals) => set({ deals, hydrated: true }),
      addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals] })),
      updateDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      deleteDeal: (id) =>
        set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    { name: "vyne-crm" },
  ),
);

export const useDeals = () => useCRMStore((s) => s.deals);
export const useDealById = (id: string | undefined | null) =>
  useCRMStore((s) => (id ? s.deals.find((d) => d.id === id) : undefined));
