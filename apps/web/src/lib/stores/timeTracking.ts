import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TimeEntry {
  id: string;
  issueId: string;
  issueTitle: string;
  userId: string;
  userName: string;
  startedAt: string;
  endedAt: string;
  /** Duration in seconds (derived from endedAt − startedAt). */
  durationSec: number;
  note?: string;
}

interface ActiveTimer {
  issueId: string;
  issueTitle: string;
  startedAt: string;
}

interface TimeTrackingStore {
  entries: TimeEntry[];
  active: ActiveTimer | null;

  startTimer: (issueId: string, issueTitle: string) => void;
  stopTimer: (userId: string, userName: string, note?: string) => TimeEntry | null;
  logManual: (entry: Omit<TimeEntry, "id">) => TimeEntry;
  remove: (id: string) => void;

  entriesForIssue: (issueId: string) => TimeEntry[];
  totalSecondsForIssue: (issueId: string) => number;
}

export const useTimeTrackingStore = create<TimeTrackingStore>()(
  persist(
    (set, get) => ({
      entries: [
        {
          id: "te-seed-1",
          issueId: "ENG-43",
          issueTitle: "Fix Secrets Manager IAM permission",
          userId: "demo",
          userName: "Preet Raval",
          startedAt: "2026-04-13T14:00:00Z",
          endedAt: "2026-04-13T16:20:00Z",
          durationSec: 2 * 3600 + 20 * 60,
          note: "Traced the kms:Decrypt gap, drafted patch.",
        },
        {
          id: "te-seed-2",
          issueId: "ENG-43",
          issueTitle: "Fix Secrets Manager IAM permission",
          userId: "demo",
          userName: "Preet Raval",
          startedAt: "2026-04-14T09:00:00Z",
          endedAt: "2026-04-14T10:10:00Z",
          durationSec: 70 * 60,
          note: "Deployed fix + verified in staging.",
        },
        {
          id: "te-seed-3",
          issueId: "ENG-45",
          issueTitle: "LangGraph agent orchestration review",
          userId: "demo",
          userName: "Preet Raval",
          startedAt: "2026-04-14T11:00:00Z",
          endedAt: "2026-04-14T12:05:00Z",
          durationSec: 65 * 60,
        },
      ],
      active: null,

      startTimer: (issueId, issueTitle) =>
        set({
          active: {
            issueId,
            issueTitle,
            startedAt: new Date().toISOString(),
          },
        }),

      stopTimer: (userId, userName, note) => {
        const active = get().active;
        if (!active) return null;
        const endedAt = new Date().toISOString();
        const durationSec = Math.round(
          (new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) /
            1000,
        );
        const entry: TimeEntry = {
          id: `te-${Date.now()}`,
          issueId: active.issueId,
          issueTitle: active.issueTitle,
          userId,
          userName,
          startedAt: active.startedAt,
          endedAt,
          durationSec,
          note,
        };
        set((state) => ({
          entries: [entry, ...state.entries],
          active: null,
        }));
        return entry;
      },

      logManual: (entry) => {
        const full: TimeEntry = { ...entry, id: `te-${Date.now()}` };
        set((state) => ({ entries: [full, ...state.entries] }));
        return full;
      },

      remove: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      entriesForIssue: (issueId) =>
        get().entries.filter((e) => e.issueId === issueId),

      totalSecondsForIssue: (issueId) =>
        get()
          .entries.filter((e) => e.issueId === issueId)
          .reduce((s, e) => s + e.durationSec, 0),
    }),
    {
      name: "vyne-time-tracking",
      partialize: (state) => ({
        entries: state.entries,
        active: state.active,
      }),
    },
  ),
);
