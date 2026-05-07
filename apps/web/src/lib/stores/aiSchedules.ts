"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Scheduled AI runs (16.12).
 *
 * A "schedule" is a saved prompt + cron expression + delivery
 * channel. The run executor itself lives server-side (Vercel Cron
 * → /api/ai/schedules/run); this store is the client-side
 * editor + log view.
 *
 *   const { add, remove, runNow } = useAiSchedules();
 *
 * The store also keeps the last 30 runs so the user can audit
 * what the cron actually fired without leaving the UI.
 */

export type ScheduleCadence =
  | "hourly"
  | "daily-9am"
  | "daily-5pm"
  | "weekly-mon-9am"
  | "weekly-fri-5pm"
  | "monthly-first-9am";

export type ScheduleDelivery = "in-app" | "email" | "slack";

export interface AiSchedule {
  id: string;
  name: string;
  prompt: string;
  cadence: ScheduleCadence;
  delivery: ScheduleDelivery;
  /** Slack channel / email address — depends on delivery. */
  target?: string;
  enabled: boolean;
  createdAt: string;
  /** ISO of the most recent execution. */
  lastRunAt?: string;
  /** Result preview from the last run. */
  lastRunPreview?: string;
}

export interface AiScheduleRun {
  id: string;
  scheduleId: string;
  ts: string;
  ok: boolean;
  preview?: string;
  error?: string;
}

interface AiSchedulesStore {
  schedules: AiSchedule[];
  runs: AiScheduleRun[];
  add: (
    s: Omit<AiSchedule, "id" | "createdAt" | "enabled"> & {
      enabled?: boolean;
    },
  ) => AiSchedule;
  update: (id: string, patch: Partial<AiSchedule>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  recordRun: (run: Omit<AiScheduleRun, "id" | "ts">) => void;
  clearRuns: () => void;
}

export const CADENCE_LABELS: Record<ScheduleCadence, string> = {
  hourly: "Every hour",
  "daily-9am": "Every weekday at 9:00 am",
  "daily-5pm": "Every weekday at 5:00 pm",
  "weekly-mon-9am": "Mondays at 9:00 am",
  "weekly-fri-5pm": "Fridays at 5:00 pm",
  "monthly-first-9am": "1st of the month at 9:00 am",
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_RUNS = 30;

export const useAiSchedules = create<AiSchedulesStore>()(
  persist(
    (set) => ({
      schedules: [],
      runs: [],
      add: (s) => {
        const row: AiSchedule = {
          id: newId(),
          name: s.name.slice(0, 60) || "Untitled schedule",
          prompt: s.prompt,
          cadence: s.cadence,
          delivery: s.delivery,
          target: s.target,
          enabled: s.enabled ?? true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ schedules: [row, ...state.schedules] }));
        return row;
      },
      update: (id, patch) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...patch } : s,
          ),
        })),
      remove: (id) =>
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
          runs: state.runs.filter((r) => r.scheduleId !== id),
        })),
      toggle: (id) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s,
          ),
        })),
      recordRun: (run) =>
        set((state) => {
          const row: AiScheduleRun = {
            id: newId(),
            ts: new Date().toISOString(),
            ...run,
          };
          const nextSchedules = state.schedules.map((s) =>
            s.id === run.scheduleId
              ? {
                  ...s,
                  lastRunAt: row.ts,
                  lastRunPreview: row.preview,
                }
              : s,
          );
          return {
            schedules: nextSchedules,
            runs: [row, ...state.runs].slice(0, MAX_RUNS),
          };
        }),
      clearRuns: () => set({ runs: [] }),
    }),
    { name: "vyne-ai-schedules", version: 1 },
  ),
);
