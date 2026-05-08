"use client";

// Huddle session state (UI_UPGRADE_PLAN.md 6.1). One active huddle at
// a time per tab; the dock stays visible across navigation. State is
// in-memory only — closing the tab disconnects.

import { create } from "zustand";

export interface HuddleSession {
  channelId: string;
  channelName: string;
  /** LiveKit room id (`huddle-${channelId}`). */
  room: string;
  /** Token + URL minted by /api/huddles/token. */
  token: string;
  url: string;
  /** Local user identity. */
  identity: string;
  displayName: string;
  /** Local mute state. */
  muted: boolean;
  /** ISO of join. */
  joinedAt: string;
}

interface HuddleStore {
  active: HuddleSession | null;
  startSession: (s: Omit<HuddleSession, "joinedAt" | "muted">) => void;
  endSession: () => void;
  setMuted: (muted: boolean) => void;
}

export const useHuddleStore = create<HuddleStore>((set) => ({
  active: null,
  startSession: (s) =>
    set({
      active: {
        ...s,
        muted: false,
        joinedAt: new Date().toISOString(),
      },
    }),
  endSession: () => set({ active: null }),
  setMuted: (muted) =>
    set((state) =>
      state.active ? { active: { ...state.active, muted } } : state,
    ),
}));
