"use client";

import { create } from "zustand";

/**
 * Raise-hand + emoji reactions during calls (28.3.4).
 *
 *   useCallReactions().raiseHand({ id: "u-1", name: "Sarah" });
 *   useCallReactions().fire("u-1", "🎉");
 *
 * Per-participant raise-hand is sticky (until the user lowers their
 * hand or the host calls `lowerAll`). Reactions are ephemeral — they
 * persist for 4 s on screen and disappear so the speaker tile stays
 * uncluttered.
 *
 * The store is in-memory + posts to Pusher so every participant
 * sees the same animation. Pairs with the call layer's existing
 * presence channel.
 */

export interface RaisedHand {
  id: string;
  name: string;
  raisedAt: string;
  /** Stable hue derived from id; matches `colorForSpeaker`. */
  hue: number;
}

export type ReactionEmoji = "👍" | "❤️" | "🎉" | "👏" | "🙏" | "🤔" | "👀" | "❓";

export const REACTION_PALETTE: ReactionEmoji[] = [
  "👍",
  "❤️",
  "🎉",
  "👏",
  "🙏",
  "🤔",
  "👀",
  "❓",
];

export interface FloatingReaction {
  id: string;
  participantId: string;
  participantName?: string;
  emoji: ReactionEmoji;
  /** ms since epoch — UI fades after FADE_MS. */
  startedAt: number;
}

const FADE_MS = 4_000;

interface CallReactionsState {
  hands: RaisedHand[];
  reactions: FloatingReaction[];

  raiseHand: (member: { id: string; name: string }) => void;
  lowerHand: (id: string) => void;
  lowerAll: () => void;
  fire: (
    participantId: string,
    emoji: ReactionEmoji,
    name?: string,
  ) => FloatingReaction;
  /** Drop reactions older than FADE_MS. UI calls on every render
   *  tick (rAF or 250 ms interval). */
  reapExpired: () => void;
  clearAll: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function hue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export const useCallReactions = create<CallReactionsState>((set) => ({
  hands: [],
  reactions: [],

  raiseHand: ({ id, name }) =>
    set((s) => {
      if (s.hands.some((h) => h.id === id)) return s;
      return {
        hands: [
          ...s.hands,
          {
            id,
            name,
            raisedAt: new Date().toISOString(),
            hue: hue(id),
          },
        ],
      };
    }),
  lowerHand: (id) =>
    set((s) => ({ hands: s.hands.filter((h) => h.id !== id) })),
  lowerAll: () => set({ hands: [] }),
  fire: (participantId, emoji, name) => {
    const row: FloatingReaction = {
      id: newId(),
      participantId,
      participantName: name,
      emoji,
      startedAt: Date.now(),
    };
    set((s) => ({ reactions: [...s.reactions.slice(-30), row] }));
    return row;
  },
  reapExpired: () =>
    set((s) => {
      const cutoff = Date.now() - FADE_MS;
      const next = s.reactions.filter((r) => r.startedAt > cutoff);
      return next.length === s.reactions.length ? s : { reactions: next };
    }),
  clearAll: () => set({ hands: [], reactions: [] }),
}));
