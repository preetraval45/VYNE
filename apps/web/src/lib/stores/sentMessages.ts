"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MsgMessage } from "@/lib/api/client";

/**
 * Persists user-sent messages (and optimistic ones) to localStorage so a
 * page refresh doesn't lose what the user just typed. Real backend will
 * eventually replace this — for now, demo mode only.
 *
 * Keyed by channel/DM id so each conversation persists independently.
 * The stored messages are merged on top of the mock messages + any
 * API-loaded messages in useMessages so the user sees a continuous
 * timeline across refreshes.
 */
interface SentMessagesState {
  byChannel: Record<string, MsgMessage[]>;
  push: (channelId: string, msg: MsgMessage) => void;
  /** Update a previously-pushed message (e.g. when the API echo replaces the optimistic id). */
  replace: (channelId: string, oldId: string, msg: MsgMessage) => void;
  forChannel: (channelId: string) => MsgMessage[];
  /** Clear sent history for one channel (useful on "delete all" UX) */
  clearChannel: (channelId: string) => void;
  /** Clear everything */
  clearAll: () => void;
}

export const useSentMessagesStore = create<SentMessagesState>()(
  persist(
    (set, get) => ({
      byChannel: {},

      push: (channelId, msg) =>
        set((s) => {
          const existing = s.byChannel[channelId] ?? [];
          // Avoid duplicates (the optimistic + API echo case)
          if (existing.some((m) => m.id === msg.id)) return s;
          return {
            byChannel: {
              ...s.byChannel,
              [channelId]: [...existing, msg].slice(-200), // cap per channel
            },
          };
        }),

      replace: (channelId, oldId, msg) =>
        set((s) => {
          const existing = s.byChannel[channelId];
          if (!existing) return s;
          return {
            byChannel: {
              ...s.byChannel,
              [channelId]: existing.map((m) => (m.id === oldId ? msg : m)),
            },
          };
        }),

      forChannel: (channelId) => get().byChannel[channelId] ?? [],

      clearChannel: (channelId) =>
        set((s) => {
          const next = { ...s.byChannel };
          delete next[channelId];
          return { byChannel: next };
        }),

      clearAll: () => set({ byChannel: {} }),
    }),
    {
      name: "vyne-sent-messages",
      version: 1,
    },
  ),
);
