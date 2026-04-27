"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UnreadState {
  /** Map of channelId or dmId → unread count */
  counts: Record<string, number>;
  /** Set the unread count for a channel/DM (used to seed from server data) */
  setUnread: (id: string, n: number) => void;
  /** Bulk seed (only sets keys that aren't already in the store) */
  seed: (entries: Array<{ id: string; count: number }>) => void;
  /** Mark a channel/DM as read — sets count to 0 */
  markRead: (id: string) => void;
  /** Increment unread when a new message arrives in a channel that's not focused */
  incrementUnread: (id: string) => void;
  /** Total unread across all channels + DMs */
  totalUnread: () => number;
  /** Get unread count for one channel/DM */
  unreadFor: (id: string) => number;
}

export const useUnreadStore = create<UnreadState>()(
  persist(
    (set, get) => ({
      counts: {},

      setUnread: (id, n) =>
        set((s) => ({ counts: { ...s.counts, [id]: Math.max(0, n) } })),

      seed: (entries) =>
        set((s) => {
          const next = { ...s.counts };
          for (const { id, count } of entries) {
            // Only seed if we haven't tracked this id yet — preserves
            // user's read state across page refreshes.
            if (next[id] === undefined) {
              next[id] = count;
            }
          }
          return { counts: next };
        }),

      markRead: (id) =>
        set((s) => {
          if (!s.counts[id]) return s;
          return { counts: { ...s.counts, [id]: 0 } };
        }),

      incrementUnread: (id) =>
        set((s) => ({
          counts: { ...s.counts, [id]: (s.counts[id] ?? 0) + 1 },
        })),

      totalUnread: () =>
        Object.values(get().counts).reduce((a, b) => a + b, 0),

      unreadFor: (id) => get().counts[id] ?? 0,
    }),
    {
      name: "vyne-unread",
      version: 1,
    },
  ),
);
