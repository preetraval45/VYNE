"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Feature voting board (27.2). Canny / ProductBoard-style.
 *
 * Each "request" carries a body, status, and a per-user vote map so
 * the count never double-fires and an undo just decrements.
 *
 *   const { items, postRequest, vote } = useFeatureVoting();
 *
 * Status vocabulary mirrors what users see on the board:
 *   "open" | "planned" | "in-progress" | "shipped" | "wontfix"
 *
 * Sorted by `votes desc` then `createdAt desc` so the leaderboard
 * stays stable across re-renders.
 */

export type RequestStatus =
  | "open"
  | "planned"
  | "in-progress"
  | "shipped"
  | "wontfix";

export interface FeatureRequest {
  id: string;
  title: string;
  body: string;
  status: RequestStatus;
  /** Module the request is filed against. */
  module?: string;
  /** Author display name + id. */
  authorId: string;
  authorName: string;
  /** Per-user vote count (1 = upvoted, 0 = not). */
  votes: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  /** Optional ISO when shipped — used for the changelog cross-link. */
  shippedAt?: string;
  /** Comment / discussion thread ids the UI can render below. */
  commentCount: number;
}

interface FeatureVotingStore {
  items: FeatureRequest[];
  postRequest: (
    payload: Omit<
      FeatureRequest,
      "id" | "votes" | "createdAt" | "updatedAt" | "commentCount" | "status"
    > & { status?: RequestStatus },
  ) => FeatureRequest;
  updateStatus: (id: string, status: RequestStatus) => void;
  vote: (id: string, userId: string) => boolean;
  unvote: (id: string, userId: string) => void;
  removeRequest: (id: string) => void;
  /** Sort helper. */
  ranked: () => FeatureRequest[];
  /** Sum of votes across all entries; surfaced as a community count. */
  totalVotes: () => number;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function voteCount(item: FeatureRequest): number {
  return Object.values(item.votes).reduce((s, n) => s + n, 0);
}

const SEED: FeatureRequest[] = [
  {
    id: "seed-fr-1",
    title: "Native iOS app",
    body: "PWA is great but a real iOS shell would help with push reliability + share-sheet features.",
    status: "planned",
    module: "global",
    authorId: "system",
    authorName: "VYNE",
    votes: {},
    createdAt: new Date(Date.now() - 21 * 24 * 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 3_600_000).toISOString(),
    commentCount: 0,
  },
  {
    id: "seed-fr-2",
    title: "Slack two-way deal sync",
    body: "Mention a deal in Slack and have it appear as a CRM activity automatically.",
    status: "in-progress",
    module: "crm",
    authorId: "system",
    authorName: "VYNE",
    votes: {},
    createdAt: new Date(Date.now() - 14 * 24 * 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3_600_000).toISOString(),
    commentCount: 0,
  },
];

export const useFeatureVoting = create<FeatureVotingStore>()(
  persist(
    (set, get) => ({
      items: SEED,
      postRequest: (payload) => {
        const row: FeatureRequest = {
          id: newId(),
          title: payload.title.slice(0, 120),
          body: payload.body,
          module: payload.module,
          authorId: payload.authorId,
          authorName: payload.authorName,
          status: payload.status ?? "open",
          votes: { [payload.authorId]: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commentCount: 0,
        };
        set((s) => ({ items: [row, ...s.items] }));
        return row;
      },
      updateStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  shippedAt:
                    status === "shipped" && !item.shippedAt
                      ? new Date().toISOString()
                      : item.shippedAt,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        })),
      vote: (id, userId) => {
        let added = false;
        set((s) => ({
          items: s.items.map((item) => {
            if (item.id !== id) return item;
            if (item.votes[userId] === 1) return item;
            added = true;
            return {
              ...item,
              votes: { ...item.votes, [userId]: 1 },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        return added;
      },
      unvote: (id, userId) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (item.id !== id) return item;
            if (!item.votes[userId]) return item;
            const nextVotes = { ...item.votes };
            delete nextVotes[userId];
            return {
              ...item,
              votes: nextVotes,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),
      removeRequest: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      ranked: () =>
        [...get().items].sort((a, b) => {
          const va = voteCount(a);
          const vb = voteCount(b);
          if (vb !== va) return vb - va;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
      totalVotes: () =>
        get().items.reduce((sum, item) => sum + voteCount(item), 0),
    }),
    { name: "vyne-feature-voting", version: 1 },
  ),
);

/** Aggregate-vote helper that the UI calls per row. */
export function votesOf(item: FeatureRequest): number {
  return voteCount(item);
}
