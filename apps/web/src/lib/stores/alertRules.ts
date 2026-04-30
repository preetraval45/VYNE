import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AlertMetric =
  | "error_rate"
  | "p95_latency"
  | "throughput"
  | "cpu"
  | "memory";

export type AlertOperator = ">" | ">=" | "<" | "<=";

export interface AlertRule {
  id: string;
  service: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  durationMin: number;
  channel: string;
  createdAt: string;
}

interface AlertRulesStore {
  rules: AlertRule[];
  addRule: (data: Omit<AlertRule, "id" | "createdAt">) => AlertRule;
  deleteRule: (id: string) => void;
}

export const useAlertRulesStore = create<AlertRulesStore>()(
  persist(
    (set) => ({
      rules: [],

      addRule: (data) => {
        const rule: AlertRule = {
          ...data,
          id: `ar-${Date.now().toString()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ rules: [rule, ...state.rules] }));
        return rule;
      },

      deleteRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "vyne-alert-rules",
      partialize: (state) => ({ rules: state.rules }),
    },
  ),
);
