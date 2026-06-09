"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_DEALS, type Deal } from "@/lib/fixtures/crm";
import { useActivityStore } from "@/lib/stores/activity";
import { useAutomationsStore } from "@/lib/stores/automations";
import { subscribe as rtSubscribe, isRealtimeEnabled } from "@/lib/realtime";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";

// CRM store now mirrors writes to /api/deals (Postgres via Prisma).
// Pattern: optimistic local update first (fast UX), then server call
// in the background. Failures roll back via toast — but we don't
// surface server errors here, the API route already does. The store
// also exposes `hydrateFromServer` which the dashboard layout calls
// once on mount to replace the local cache with the canonical list.

interface CRMState {
  deals: Deal[];
  hydrated: boolean;

  setDeals: (deals: Deal[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  setHydrated: (v: boolean) => void;
  hydrateFromServer: () => Promise<void>;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      deals: seedOrEmpty(INITIAL_DEALS),
      hydrated: false,

      setDeals: (deals) => set({ deals, hydrated: true }),

      addDeal: (deal) => {
        // Optimistic local insert.
        set((s) => ({ deals: [deal, ...s.deals] }));
        // Mirror to server (fire-and-forget).
        void fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deal),
        }).catch(() => {
          // Network/server failure leaves the optimistic row in place;
          // a subsequent hydrateFromServer call would correct it.
        });
      },

      updateDeal: (id, patch) => {
        const prev = get().deals.find((d) => d.id === id);
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
        void fetch(`/api/deals/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {
          // ignore — optimistic state remains
        });
        // Auto-capture a stage change into the (Postgres-backed) activity feed
        // so the deal timeline records progression without manual logging.
        if (patch.stage && prev && patch.stage !== prev.stage) {
          const newStage = patch.stage;
          useActivityStore.getState().log({
            recordType: "deal",
            recordId: id,
            kind: "change",
            verb: "moved",
            summary: `Stage moved to ${newStage}`,
            field: "stage",
            from: prev.stage,
            to: newStage,
          });

          // Run user-defined automation rules for this stage. Actions are
          // in-app + fully functional. set_* actions patch the row directly
          // (not via updateDeal) so they can't recurse the stage trigger.
          const rules = useAutomationsStore
            .getState()
            .rules.filter(
              (r) =>
                r.enabled && r.module === "crm" && r.triggerStage === newStage,
            );
          for (const rule of rules) {
            if (rule.actionType === "log_note" && rule.actionValue) {
              useActivityStore.getState().log({
                recordType: "deal",
                recordId: id,
                kind: "note",
                verb: "logged",
                summary: "Automation",
                body: rule.actionValue,
                actor: "Automation",
              });
            } else if (rule.actionType === "set_next_action") {
              set((s) => ({
                deals: s.deals.map((d) =>
                  d.id === id ? { ...d, nextAction: rule.actionValue } : d,
                ),
              }));
              void fetch(`/api/deals/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nextAction: rule.actionValue }),
              }).catch(() => {});
            } else if (rule.actionType === "set_probability") {
              const prob = Math.max(
                0,
                Math.min(100, Number(rule.actionValue) || 0),
              );
              set((s) => ({
                deals: s.deals.map((d) =>
                  d.id === id ? { ...d, probability: prob } : d,
                ),
              }));
              void fetch(`/api/deals/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ probability: prob }),
              }).catch(() => {});
            }
          }
        }
      },

      deleteDeal: (id) => {
        set((s) => ({ deals: s.deals.filter((d) => d.id !== id) }));
        void fetch(`/api/deals/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }).catch(() => {
          // ignore
        });
      },

      setHydrated: (hydrated) => set({ hydrated }),

      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/deals", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { deals?: Deal[] };
          if (Array.isArray(body.deals) && body.deals.length > 0) {
            set({ deals: body.deals as Deal[], hydrated: true });
          } else if (Array.isArray(body.deals)) {
            // DB is empty. Demo session keeps INITIAL_DEALS so the
            // showcase isn't blank; real signups stay empty so the
            // workspace reflects only what they create themselves.
            if (shouldSeedFixtures()) {
              set({ deals: INITIAL_DEALS, hydrated: true });
            } else {
              set({ deals: [], hydrated: true });
            }
          }
        } catch {
          // Server unreachable → stay on local cache. We'll retry on
          // the next mount.
          if (!get().hydrated) set({ hydrated: false });
        }
      },
    }),
    { name: "vyne-crm" },
  ),
);

// ── Realtime subscription ──────────────────────────────────────────
// Wires the CRM store to Pusher events broadcast by the server when
// deals are created / updated / deleted in any tab. We dedupe by id —
// if the local cache already has the same id (because the local tab
// just did the optimistic insert), we replace rather than duplicate.

let _crmRtBound = false;
export function bindCrmRealtime(orgId = "demo") {
  if (_crmRtBound || !isRealtimeEnabled()) return;
  _crmRtBound = true;
  rtSubscribe<Deal>(`org-${orgId}`, "deal:created", (deal) => {
    useCRMStore.setState((s) => {
      if (s.deals.some((d) => d.id === deal.id)) return s;
      return { deals: [deal, ...s.deals] };
    });
  });
  rtSubscribe<Deal>(`org-${orgId}`, "deal:updated", (deal) => {
    useCRMStore.setState((s) => ({
      deals: s.deals.map((d) => (d.id === deal.id ? { ...d, ...deal } : d)),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "deal:deleted", ({ id }) => {
    useCRMStore.setState((s) => ({
      deals: s.deals.filter((d) => d.id !== id),
    }));
  });
}

export const useDeals = () => useCRMStore((s) => s.deals);
export const useDealById = (id: string | undefined | null) =>
  useCRMStore((s) => (id ? s.deals.find((d) => d.id === id) : undefined));
