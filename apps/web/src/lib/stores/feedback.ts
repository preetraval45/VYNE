"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Feedback / NPS / kudos store (Phase 27).
 *
 *   27.1 feedback   — bug reports + screenshots + console-log capture
 *   27.4 nps        — survey scheduler + per-user "next due" timestamp
 *   27.8 kudos      — peer recognitions surfaced in HR / home digest
 *
 * Each list is capped + LRU'd so localStorage stays small. Production
 * mirrors every entry to a backend (Linear / Canny / Slack / DB) but
 * the store is the canonical client cache so submissions survive
 * offline + replay through the existing offline queue.
 */

export interface FeedbackEntry {
  id: string;
  /** "bug" / "idea" / "praise" / "other" */
  kind: "bug" | "idea" | "praise" | "other";
  body: string;
  /** Optional screenshot data URL (PNG). */
  screenshotDataUrl?: string;
  /** Auto-attached page + UA + viewport metadata. */
  context: {
    pathname: string;
    userAgent: string;
    viewport: { width: number; height: number };
    consoleLogs?: string[];
  };
  /** ISO. */
  createdAt: string;
  /** Server-side id once forwarded; null until then. */
  externalId?: string;
}

export interface NpsResponse {
  id: string;
  /** 0–10 NPS score. */
  score: number;
  /** Optional follow-up comment. */
  comment?: string;
  ts: string;
}

export interface NpsSchedule {
  /** Send at most one survey every N days. Default 90. */
  cadenceDays: number;
  /** ISO; null = never asked. */
  lastShownAt?: string;
  /** ISO; null = never answered. */
  lastAnsweredAt?: string;
  /** Sample 1-in-N users at each firing window. Default 10. */
  sampleEvery: number;
}

export interface KudosEntry {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  body: string;
  /** Pre-baked emoji that bubbles into the home digest. */
  emoji?: string;
  /** Stable tag — "shipping" / "support" / "leadership" / "kindness" / "ops". */
  tag?: string;
  /** ISO. */
  ts: string;
}

interface FeedbackStore {
  feedback: FeedbackEntry[];
  nps: { responses: NpsResponse[]; schedule: NpsSchedule };
  kudos: KudosEntry[];

  // 27.1 feedback
  submitFeedback: (
    payload: Omit<FeedbackEntry, "id" | "createdAt">,
  ) => FeedbackEntry;
  removeFeedback: (id: string) => void;

  // 27.4 nps
  recordNpsResponse: (
    payload: Omit<NpsResponse, "id" | "ts"> & { ts?: string },
  ) => NpsResponse;
  setNpsSchedule: (patch: Partial<NpsSchedule>) => void;
  /** True when a fresh survey is due for the active user. */
  shouldShowNps: () => boolean;
  markNpsShown: () => void;

  // 27.8 kudos
  giveKudos: (
    payload: Omit<KudosEntry, "id" | "ts">,
  ) => KudosEntry;
  removeKudos: (id: string) => void;
  kudosFor: (userId: string) => KudosEntry[];

  /** Capture a "snapshot" of the current page (UA + viewport + console
   *  logs) for the feedback widget pre-fill. */
  captureContext: () => FeedbackEntry["context"];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_FEEDBACK = 50;
const MAX_NPS = 30;
const MAX_KUDOS = 200;

const DEFAULT_NPS: NpsSchedule = {
  cadenceDays: 90,
  sampleEvery: 10,
};

// ── Console-log ring buffer ───────────────────────────────────────
//
// We monkey-patch `console.warn` / `console.error` once on first
// store import so the feedback widget can attach the last 30 lines
// to a bug report. The patch is idempotent.
const RING_LIMIT = 30;
const consoleRing: string[] = [];

function bootConsoleCapture(): void {
  if (typeof window === "undefined") return;
  const flag = "__vyneConsoleCaptured";
  const win = window as unknown as Record<string, boolean>;
  if (win[flag]) return;
  win[flag] = true;
  for (const level of ["warn", "error"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        consoleRing.push(
          `[${level}] ${args
            .map((a) =>
              typeof a === "string" ? a : (() => {
                try {
                  return JSON.stringify(a);
                } catch {
                  return String(a);
                }
              })(),
            )
            .join(" ")}`,
        );
        if (consoleRing.length > RING_LIMIT) consoleRing.shift();
      } catch {
        // ignore
      }
      orig(...args);
    };
  }
}

if (typeof window !== "undefined") bootConsoleCapture();

export const useFeedback = create<FeedbackStore>()(
  persist(
    (set, get) => ({
      feedback: [],
      nps: { responses: [], schedule: DEFAULT_NPS },
      kudos: [],

      // 27.1 feedback
      submitFeedback: (payload) => {
        const row: FeedbackEntry = {
          id: newId(),
          createdAt: new Date().toISOString(),
          ...payload,
        };
        set((s) => ({ feedback: [row, ...s.feedback].slice(0, MAX_FEEDBACK) }));
        return row;
      },
      removeFeedback: (id) =>
        set((s) => ({ feedback: s.feedback.filter((f) => f.id !== id) })),

      // 27.4 nps
      recordNpsResponse: (payload) => {
        const row: NpsResponse = {
          id: newId(),
          ts: payload.ts ?? new Date().toISOString(),
          score: Math.max(0, Math.min(10, Math.round(payload.score))),
          comment: payload.comment,
        };
        set((s) => ({
          nps: {
            schedule: {
              ...s.nps.schedule,
              lastAnsweredAt: row.ts,
            },
            responses: [row, ...s.nps.responses].slice(0, MAX_NPS),
          },
        }));
        return row;
      },
      setNpsSchedule: (patch) =>
        set((s) => ({
          nps: { ...s.nps, schedule: { ...s.nps.schedule, ...patch } },
        })),
      shouldShowNps: () => {
        const sched = get().nps.schedule;
        if (sched.lastAnsweredAt) {
          const since =
            Date.now() - new Date(sched.lastAnsweredAt).getTime();
          if (since < sched.cadenceDays * 24 * 3_600_000) return false;
        }
        if (sched.lastShownAt) {
          const since = Date.now() - new Date(sched.lastShownAt).getTime();
          if (since < 7 * 24 * 3_600_000) return false; // never re-show within 7 d
        }
        // Sample-every check: 1 in N users get the survey at any firing window.
        const r = Math.floor(Math.random() * Math.max(sched.sampleEvery, 1));
        return r === 0;
      },
      markNpsShown: () =>
        set((s) => ({
          nps: {
            ...s.nps,
            schedule: {
              ...s.nps.schedule,
              lastShownAt: new Date().toISOString(),
            },
          },
        })),

      // 27.8 kudos
      giveKudos: (payload) => {
        const row: KudosEntry = {
          id: newId(),
          ts: new Date().toISOString(),
          ...payload,
        };
        set((s) => ({ kudos: [row, ...s.kudos].slice(0, MAX_KUDOS) }));
        return row;
      },
      removeKudos: (id) =>
        set((s) => ({ kudos: s.kudos.filter((k) => k.id !== id) })),
      kudosFor: (userId) =>
        get().kudos.filter(
          (k) => k.toUserId === userId || k.fromUserId === userId,
        ),

      // Helpers
      captureContext: () => {
        if (typeof window === "undefined") {
          return {
            pathname: "",
            userAgent: "",
            viewport: { width: 0, height: 0 },
            consoleLogs: [],
          };
        }
        return {
          pathname: window.location.pathname,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          consoleLogs: [...consoleRing],
        };
      },
    }),
    { name: "vyne-feedback", version: 1 },
  ),
);
