"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Vyne AI compound-memory store ───────────────────────────────
//
// Every Q&A the user has with Vyne AI, every morning brief it
// delivers, and the weekly compass intention are persisted locally
// so the product gets *more valuable the longer you use it* (the
// founder memo this was shaped from). Server-side persistence comes
// later; this keeps it functional without backend changes.

export interface Session {
  id: string;
  /** ISO string */
  createdAt: string;
  /** The user's question / night prompt */
  question: string;
  /** Vyne AI's reply */
  answer: string;
  /** Optional list of [kind:id] citations returned by the route */
  citations?: Array<{ kind: string; id: string; label: string }>;
}

export interface MorningBrief {
  id: string;
  /** ISO string pinned to the LOCAL date, 07:00 */
  createdAt: string;
  summary: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
}

export interface Compass {
  /** Start of the ISO week the intention covers (Sunday 00:00 local) */
  weekStart: string;
  intention: string;
}

interface AiMemoryStore {
  sessions: Session[];
  briefs: MorningBrief[];
  compass: Compass | null;
  /** Day-string (YYYY-MM-DD) of the last chat or brief */
  lastActiveDate: string | null;

  addSession: (s: Omit<Session, "id" | "createdAt">) => Session;
  addBrief: (b: Omit<MorningBrief, "id" | "createdAt">) => MorningBrief;
  setCompass: (intention: string) => void;
  clearAll: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const dayKey = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const startOfWeek = (d = new Date()) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - c.getDay()); // Sunday anchor
  return c.toISOString();
};

export const useAiMemoryStore = create<AiMemoryStore>()(
  persist(
    (set) => ({
      sessions: [],
      briefs: [],
      compass: null,
      lastActiveDate: null,

      addSession: (s) => {
        const session: Session = {
          ...s,
          id: newId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          // keep newest first, cap at 500 to avoid localStorage bloat
          sessions: [session, ...state.sessions].slice(0, 500),
          lastActiveDate: dayKey(session.createdAt),
        }));
        return session;
      },

      addBrief: (b) => {
        const brief: MorningBrief = {
          ...b,
          id: newId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          briefs: [brief, ...state.briefs].slice(0, 90),
          lastActiveDate: dayKey(brief.createdAt),
        }));
        return brief;
      },

      setCompass: (intention) =>
        set(() => ({
          compass: { weekStart: startOfWeek(), intention },
        })),

      clearAll: () =>
        set(() => ({ sessions: [], briefs: [], compass: null, lastActiveDate: null })),
    }),
    { name: "vyne-ai-memory", version: 1 },
  ),
);

// ─── Helpers ─────────────────────────────────────────────────────

/** Unique day-keys touched in the sessions+briefs history. */
function activeDays(state: { sessions: Session[]; briefs: MorningBrief[] }): string[] {
  const s = new Set<string>();
  for (const x of state.sessions) s.add(dayKey(x.createdAt));
  for (const x of state.briefs) s.add(dayKey(x.createdAt));
  return Array.from(s).sort().reverse(); // newest first
}

/**
 * Current streak with grace: if the most recent active day is today
 * or yesterday, count backward allowing a single-day gap per 7 days.
 */
export function computeStreak(state: {
  sessions: Session[];
  briefs: MorningBrief[];
}): { current: number; longest: number; graceUsed: boolean } {
  const days = activeDays(state);
  if (days.length === 0) return { current: 0, longest: 0, graceUsed: false };

  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());

  if (days[0] !== today && days[0] !== yesterday) {
    // broken — just compute longest
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]).getTime();
      const cur = new Date(days[i]).getTime();
      const gap = Math.round((prev - cur) / 86400000);
      if (gap === 1) run++;
      else {
        longest = Math.max(longest, run);
        run = 1;
      }
    }
    longest = Math.max(longest, run);
    return { current: 0, longest, graceUsed: false };
  }

  let current = 1;
  let graceUsed = false;
  let cursor = new Date(days[0]).getTime();
  for (let i = 1; i < days.length; i++) {
    const t = new Date(days[i]).getTime();
    const gap = Math.round((cursor - t) / 86400000);
    if (gap === 1) {
      current++;
      cursor = t;
    } else if (gap === 2 && !graceUsed) {
      // use grace: missed 1 day
      graceUsed = true;
      current++;
      cursor = t;
    } else {
      break;
    }
  }
  return { current, longest: Math.max(current, current), graceUsed };
}

export function isCompassFresh(compass: Compass | null): boolean {
  if (!compass) return false;
  return compass.weekStart === startOfWeek();
}
