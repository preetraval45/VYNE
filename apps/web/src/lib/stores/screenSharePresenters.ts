"use client";

import { create } from "zustand";

/**
 * Multi-presenter state (28.4.4) + shared-screen history (28.4.10).
 *
 *   addPresenter({ id, name, callId, streamLabel });
 *   selectPresenter(callId, id);     // viewers swap with arrow keys
 *   archivePresenter(id, { thumbnail, recordingClipUrl });
 *
 * Two distinct concerns share one store because the history is just
 * "presenters that already finished sharing" — same shape, different
 * lifecycle bucket.
 */

export interface ActivePresenter {
  id: string;
  callId: string;
  name: string;
  /** Optional avatar / hue. */
  hue?: number;
  /** Free-form label the call panel renders ("Sarah · Slides"). */
  streamLabel?: string;
  /** Source surface ("monitor" / "window" / "browser"). */
  surface?: string;
  startedAt: string;
  /** Used by the "selected presenter" pointer per call. */
  isPrimary?: boolean;
}

export interface PastShare {
  id: string;
  callId: string;
  name: string;
  streamLabel?: string;
  startedAt: string;
  endedAt: string;
  /** Snapshot of the last frame (data URL). */
  thumbnail?: string;
  /** Slice of the recording that covers this presenter's window
   *  (when the call was being recorded). */
  recordingClipUrl?: string;
}

interface ScreenSharePresentersState {
  active: ActivePresenter[];
  history: PastShare[];
  /** Per-call selected presenter id. */
  selected: Record<string, string | null>;

  addPresenter: (
    payload: Omit<ActivePresenter, "startedAt" | "isPrimary">,
  ) => ActivePresenter;
  removePresenter: (id: string, history?: Partial<PastShare>) => void;
  selectPresenter: (callId: string, id: string | null) => void;
  /** Active presenters for a given call. */
  presentersFor: (callId: string) => ActivePresenter[];
  /** Past shares for a given call. */
  historyFor: (callId: string) => PastShare[];
  clearCall: (callId: string) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

const MAX_HISTORY = 24;

export const useScreenSharePresenters = create<ScreenSharePresentersState>(
  (set, get) => ({
    active: [],
    history: [],
    selected: {},

    addPresenter: (payload) => {
      const row: ActivePresenter = {
        ...payload,
        hue: payload.hue ?? hueOf(payload.id),
        startedAt: new Date().toISOString(),
      };
      set((s) => ({
        active: [...s.active.filter((p) => p.id !== row.id), row],
        // First presenter on a call auto-selects.
        selected: s.selected[row.callId]
          ? s.selected
          : { ...s.selected, [row.callId]: row.id },
      }));
      return row;
    },
    removePresenter: (id, history) => {
      const cur = get().active.find((p) => p.id === id);
      if (!cur) return;
      const past: PastShare = {
        id: newId(),
        callId: cur.callId,
        name: cur.name,
        streamLabel: cur.streamLabel,
        startedAt: cur.startedAt,
        endedAt: new Date().toISOString(),
        thumbnail: history?.thumbnail,
        recordingClipUrl: history?.recordingClipUrl,
      };
      set((s) => {
        const remaining = s.active.filter((p) => p.id !== id);
        const nextSelected = { ...s.selected };
        if (nextSelected[cur.callId] === id) {
          // Pick the next active presenter (or null) for the call.
          const next = remaining.find((p) => p.callId === cur.callId);
          nextSelected[cur.callId] = next?.id ?? null;
        }
        return {
          active: remaining,
          history: [past, ...s.history].slice(0, MAX_HISTORY),
          selected: nextSelected,
        };
      });
    },
    selectPresenter: (callId, id) =>
      set((s) => ({ selected: { ...s.selected, [callId]: id } })),
    presentersFor: (callId) =>
      get().active.filter((p) => p.callId === callId),
    historyFor: (callId) =>
      get().history.filter((p) => p.callId === callId),
    clearCall: (callId) =>
      set((s) => {
        const nextSelected = { ...s.selected };
        delete nextSelected[callId];
        return {
          active: s.active.filter((p) => p.callId !== callId),
          history: s.history.filter((p) => p.callId !== callId),
          selected: nextSelected,
        };
      }),
  }),
);
