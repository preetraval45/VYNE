"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Branching conversations (28.2.2).
 *
 * A "branch" is a fork from a specific message in a conversation.
 * Each branch carries its own message tail; the chat UI shows a
 * tab strip across the top so the user can swap between branches.
 *
 *   const b = forkBranch({
 *     conversationId: "c-1",
 *     parentMessageId: "m-42",
 *     name: "What if we used Sonnet?",
 *   });
 *   const branches = branchesFor("c-1");      // tab strip data
 *   selectBranch("c-1", b.id);                 // swap active
 *
 * The actual messages stay in `aiMemory.conversations[].messages`;
 * each branch carries the *fork point* (parentMessageId) + a list of
 * message ids that belong only to this branch. The renderer walks
 * the conversation up to `parentMessageId` (shared trunk) and then
 * splices in the active branch's tail.
 */

export interface AiBranch {
  id: string;
  conversationId: string;
  /** Stable id of the message the branch forked from. The shared
   *  trunk includes this message + everything before it. */
  parentMessageId: string;
  /** User-visible name. */
  name: string;
  /** Branch-only message ids (in order). */
  messageIds: string[];
  /** ISO. */
  createdAt: string;
  /** Optional colour for the tab strip. */
  color?: string;
}

interface AiBranchesStore {
  branches: AiBranch[];
  /** Per-conversation active branch id. null = main trunk. */
  active: Record<string, string | null>;

  forkBranch: (
    payload: Omit<AiBranch, "id" | "messageIds" | "createdAt"> & {
      messageIds?: string[];
    },
  ) => AiBranch;
  /** Append a message id to the active branch on the conversation. */
  appendMessageToActive: (conversationId: string, messageId: string) => void;
  /** Drop a branch + its tail messages. The host's message store is
   *  responsible for removing the actual rows. */
  removeBranch: (id: string) => void;
  selectBranch: (conversationId: string, branchId: string | null) => void;
  branchesFor: (conversationId: string) => AiBranch[];
  activeBranchFor: (conversationId: string) => AiBranch | null;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `br-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export const useAiBranches = create<AiBranchesStore>()(
  persist(
    (set, get) => ({
      branches: [],
      active: {},

      forkBranch: (payload) => {
        const row: AiBranch = {
          id: newId(),
          createdAt: new Date().toISOString(),
          messageIds: payload.messageIds ?? [],
          color: payload.color ?? pickColor(payload.name),
          ...payload,
        };
        set((s) => ({
          branches: [row, ...s.branches],
          // New branch becomes active immediately.
          active: { ...s.active, [payload.conversationId]: row.id },
        }));
        return row;
      },
      appendMessageToActive: (conversationId, messageId) =>
        set((s) => {
          const activeId = s.active[conversationId];
          if (!activeId) return s; // on the main trunk, host store appends directly
          return {
            branches: s.branches.map((b) =>
              b.id === activeId
                ? { ...b, messageIds: [...b.messageIds, messageId] }
                : b,
            ),
          };
        }),
      removeBranch: (id) =>
        set((s) => {
          const target = s.branches.find((b) => b.id === id);
          const nextActive = { ...s.active };
          if (target && nextActive[target.conversationId] === id) {
            nextActive[target.conversationId] = null;
          }
          return {
            branches: s.branches.filter((b) => b.id !== id),
            active: nextActive,
          };
        }),
      selectBranch: (conversationId, branchId) =>
        set((s) => ({
          active: { ...s.active, [conversationId]: branchId },
        })),
      branchesFor: (conversationId) =>
        get()
          .branches.filter((b) => b.conversationId === conversationId)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          ),
      activeBranchFor: (conversationId) => {
        const id = get().active[conversationId];
        if (!id) return null;
        return get().branches.find((b) => b.id === id) ?? null;
      },
    }),
    { name: "vyne-ai-branches", version: 1 },
  ),
);

/**
 * Reconstruct the visible message list for a conversation: trunk up
 * to + including `parentMessageId`, then the active branch's tail.
 *
 *   const visible = resolveVisibleMessages(allMessages, "c-1");
 *
 * `allMessages` is the host's full message list for the conversation
 * (already in chronological order). When the user is on the main
 * trunk, the function returns the input unchanged.
 */
export function resolveVisibleMessages<
  T extends { id: string; createdAt?: string },
>(allMessages: T[], conversationId: string): T[] {
  const branch = useAiBranches.getState().activeBranchFor(conversationId);
  if (!branch) return allMessages;
  const cutoff = allMessages.findIndex((m) => m.id === branch.parentMessageId);
  if (cutoff < 0) return allMessages;
  const trunk = allMessages.slice(0, cutoff + 1);
  const branchSet = new Set(branch.messageIds);
  const tail = allMessages.filter((m) => branchSet.has(m.id));
  return [...trunk, ...tail];
}
