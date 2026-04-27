"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Read-receipts store.
 *
 * Per channel/DM: tracks the last-seen timestamp PER user. Combined with
 * a message's createdAt, the chat decides whether to show ✓ (delivered)
 * or ✓✓ (seen) on a message the current user sent.
 *
 * Demo mode: we simulate other users' "seen" timestamps deterministically
 * from a tiny set of demo participants so the UI feels alive without a
 * real backend. Each channel/DM has its own roster.
 */

export interface ReadReceipt {
  /** ISO timestamp the user last viewed this conversation */
  lastSeenAt: string;
  /** Display name */
  name: string;
}

interface ReadReceiptsState {
  /** byChannel[channelId][userId] = receipt */
  byChannel: Record<string, Record<string, ReadReceipt>>;
  /** Mark the current user as having read up to "now" in this channel */
  markSeen: (channelId: string, userId: string, name: string) => void;
  /** Get all receipts for a channel */
  receiptsFor: (channelId: string) => Record<string, ReadReceipt>;
  /** Returns the count of OTHER users who have seen a message sent at `messageTs`. */
  seenCount: (channelId: string, messageTs: string, excludeUserId: string) => number;
}

// Demo "team" presence: members whose seen timestamps simulate live activity.
const DEMO_SEEN_ROSTER: Record<string, Array<{ id: string; name: string }>> = {
  // Channels — bigger roster
  "1": [
    { id: "u2", name: "Sarah K." },
    { id: "u3", name: "Tony M." },
    { id: "u4", name: "Alex R." },
    { id: "u5", name: "Jordan B." },
  ],
  "2": [
    { id: "u3", name: "Tony M." },
    { id: "u4", name: "Alex R." },
  ],
  "3": [
    { id: "u3", name: "Tony M." },
    { id: "u4", name: "Alex R." },
  ],
  "4": [
    { id: "u2", name: "Sarah K." },
    { id: "u3", name: "Tony M." },
    { id: "u4", name: "Alex R." },
    { id: "u5", name: "Jordan B." },
  ],
  // DMs — just the other person
  dm1: [{ id: "u2", name: "Sarah K." }],
  dm2: [{ id: "u3", name: "Tony M." }],
  dm3: [{ id: "u4", name: "Alex R." }],
  dm4: [{ id: "u5", name: "Jordan B." }],
};

export const useReadReceiptsStore = create<ReadReceiptsState>()(
  persist(
    (set, get) => ({
      byChannel: {},

      markSeen: (channelId, userId, name) =>
        set((s) => ({
          byChannel: {
            ...s.byChannel,
            [channelId]: {
              ...(s.byChannel[channelId] ?? {}),
              [userId]: {
                lastSeenAt: new Date().toISOString(),
                name,
              },
            },
          },
        })),

      receiptsFor: (channelId) => get().byChannel[channelId] ?? {},

      seenCount: (channelId, messageTs, excludeUserId) => {
        const messageTime = new Date(messageTs).getTime();
        const realReceipts = get().byChannel[channelId] ?? {};
        // Demo-simulated peer seen state — peers "saw" your message after a
        // small random delay (5s-90s) since it was sent. This gives the UI
        // a real feel even without a backend.
        const roster = DEMO_SEEN_ROSTER[channelId] ?? [];
        const now = Date.now();
        let count = 0;
        for (const peer of roster) {
          if (peer.id === excludeUserId) continue;
          const real = realReceipts[peer.id];
          if (real && new Date(real.lastSeenAt).getTime() >= messageTime) {
            count++;
            continue;
          }
          // Simulate: peer "saw" the message if at least 5s have passed
          // since it was posted. Stable per-message via deterministic delay.
          const hash = simpleHash(`${peer.id}:${messageTs}`);
          const simulatedDelay = 5_000 + (hash % 85_000); // 5-90s
          if (now >= messageTime + simulatedDelay) {
            count++;
          }
        }
        return count;
      },
    }),
    { name: "vyne-read-receipts", version: 1 },
  ),
);

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
