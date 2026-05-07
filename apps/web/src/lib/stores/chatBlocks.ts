"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Polls + decision blocks (28.1.7).
 *
 * The chat composer's `/poll` and `/decision` slash commands stash
 * a block id in the message payload (`[[poll:abc123]]` /
 * `[[decision:def456]]`); the renderer looks the id up here and
 * mounts the right card inline.
 *
 * Decision blocks are also indexed for the global search via the
 * `is:decision` chip — so users can find every "we decided to ship X"
 * moment without scrolling.
 */

export interface PollOption {
  id: string;
  label: string;
}

export interface PollBlock {
  id: string;
  channelId: string;
  authorId: string;
  question: string;
  options: PollOption[];
  /** Map of voter id → option id. Single-vote per user. */
  votes: Record<string, string>;
  /** True after `closePoll(id)` is called. */
  closed: boolean;
  /** ISO. */
  createdAt: string;
  closedAt?: string;
  /** Multiple-choice when true (votes becomes Record<string, string[]>). */
  multi?: boolean;
}

export interface DecisionBlock {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  /** What was decided — one sentence. */
  decision: string;
  /** Optional context paragraph. */
  context?: string;
  /** Tags for the search index — "ship-decision" / "spend" / "personnel". */
  tags?: string[];
  /** ISO. */
  decidedAt: string;
  /** Optional ISO when the decision was reversed. */
  reversedAt?: string;
}

interface ChatBlocksStore {
  polls: PollBlock[];
  decisions: DecisionBlock[];

  // Polls
  createPoll: (
    payload: Omit<PollBlock, "id" | "votes" | "closed" | "createdAt"> & {
      id?: string;
      multi?: boolean;
    },
  ) => PollBlock;
  votePoll: (pollId: string, voterId: string, optionId: string) => void;
  closePoll: (pollId: string) => void;
  pollById: (id: string) => PollBlock | null;

  // Decisions
  createDecision: (
    payload: Omit<DecisionBlock, "id" | "decidedAt"> & {
      id?: string;
      decidedAt?: string;
    },
  ) => DecisionBlock;
  reverseDecision: (id: string) => void;
  decisionById: (id: string) => DecisionBlock | null;
  /** Every decision in a channel — used by the channel's "Decisions" tab. */
  decisionsFor: (channelId: string) => DecisionBlock[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useChatBlocks = create<ChatBlocksStore>()(
  persist(
    (set, get) => ({
      polls: [],
      decisions: [],

      // Polls
      createPoll: (payload) => {
        const row: PollBlock = {
          id: payload.id ?? newId(),
          channelId: payload.channelId,
          authorId: payload.authorId,
          question: payload.question.slice(0, 240),
          options: payload.options.slice(0, 10),
          votes: {},
          closed: false,
          multi: payload.multi,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ polls: [row, ...s.polls] }));
        return row;
      },
      votePoll: (pollId, voterId, optionId) =>
        set((s) => ({
          polls: s.polls.map((p) => {
            if (p.id !== pollId || p.closed) return p;
            if (!p.options.some((o) => o.id === optionId)) return p;
            return { ...p, votes: { ...p.votes, [voterId]: optionId } };
          }),
        })),
      closePoll: (pollId) =>
        set((s) => ({
          polls: s.polls.map((p) =>
            p.id === pollId
              ? { ...p, closed: true, closedAt: new Date().toISOString() }
              : p,
          ),
        })),
      pollById: (id) => get().polls.find((p) => p.id === id) ?? null,

      // Decisions
      createDecision: (payload) => {
        const row: DecisionBlock = {
          id: payload.id ?? newId(),
          channelId: payload.channelId,
          authorId: payload.authorId,
          authorName: payload.authorName,
          decision: payload.decision.slice(0, 240),
          context: payload.context,
          tags: payload.tags,
          decidedAt: payload.decidedAt ?? new Date().toISOString(),
        };
        set((s) => ({ decisions: [row, ...s.decisions] }));
        return row;
      },
      reverseDecision: (id) =>
        set((s) => ({
          decisions: s.decisions.map((d) =>
            d.id === id
              ? { ...d, reversedAt: new Date().toISOString() }
              : d,
          ),
        })),
      decisionById: (id) => get().decisions.find((d) => d.id === id) ?? null,
      decisionsFor: (channelId) =>
        get()
          .decisions.filter((d) => d.channelId === channelId)
          .sort(
            (a, b) =>
              new Date(b.decidedAt).getTime() -
              new Date(a.decidedAt).getTime(),
          ),
    }),
    { name: "vyne-chat-blocks", version: 1 },
  ),
);

/**
 * Vote tally helper. Returns each option with its absolute count and
 * percentage of total votes — caller renders the bar.
 */
export function tallyPoll(
  poll: PollBlock,
): Array<{ option: PollOption; count: number; pct: number }> {
  const counts = new Map<string, number>();
  for (const optionId of Object.values(poll.votes)) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }
  const total = Object.keys(poll.votes).length;
  return poll.options.map((option) => {
    const count = counts.get(option.id) ?? 0;
    return {
      option,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}
