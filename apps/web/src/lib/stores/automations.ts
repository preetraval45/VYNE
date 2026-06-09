"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// CRM automation rules — "when a deal enters {triggerStage} → {action}".
// Backed by Postgres via /api/automations (optimistic local cache + hydrate),
// matching the deals/activity pattern. Execution lives in the CRM store's
// updateDeal (it has access to the deal + activity stores).

export type AutomationActionType =
  | "log_note"
  | "set_next_action"
  | "set_probability";

export interface AutomationRule {
  id: string;
  name: string;
  /** Entity domain, e.g. "crm", "ops", "hr". */
  module: string;
  /** The trigger value the engine matches on (CRM: the deal stage). */
  trigger: string;
  actionType: AutomationActionType;
  actionValue: string;
  enabled: boolean;
}

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  log_note: "Log a note",
  set_next_action: "Set next action",
  set_probability: "Set probability (%)",
};

interface AutomationsStore {
  rules: AutomationRule[];
  hydrated: boolean;
  addRule: (rule: Omit<AutomationRule, "id">) => AutomationRule;
  updateRule: (id: string, patch: Partial<AutomationRule>) => void;
  deleteRule: (id: string) => void;
  hydrateFromServer: () => Promise<void>;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useAutomationsStore = create<AutomationsStore>()(
  persist(
    (set) => ({
      rules: [],
      hydrated: false,

      addRule: (rule) => {
        const row: AutomationRule = { ...rule, id: newId() };
        set((s) => ({ rules: [row, ...s.rules] }));
        void fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        }).catch(() => {});
        return row;
      },

      updateRule: (id, patch) => {
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
        void fetch(`/api/automations/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },

      deleteRule: (id) => {
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        void fetch(`/api/automations/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }).catch(() => {});
      },

      hydrateFromServer: async () => {
        try {
          const res = await fetch("/api/automations", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { automations?: AutomationRule[] };
          if (Array.isArray(body.automations)) {
            set({ rules: body.automations, hydrated: true });
          }
        } catch {
          // offline — keep local cache
        }
      },
    }),
    { name: "vyne-automations", version: 1 },
  ),
);
