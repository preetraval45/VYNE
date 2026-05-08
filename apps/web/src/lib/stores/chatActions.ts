"use client";

// Inline action messages (UI_UPGRADE_PLAN.md 6.2).
//
// When a workflow / AI / teammate posts a message that needs a decision
// (e.g. "Deal $50k closing — approve?"), the renderer mounts inline
// Approve / Reject buttons whose ids resolve through this store. Each
// button click runs a registered ToolCall via the existing
// executeToolCall pipe and posts a confirmation reply.
//
// Message bodies embed the block via `[[action:{id}]]` — same pattern
// as polls + decisions — so the chat search index stays unchanged.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolCall } from "@/lib/ai/toolExecutor";

export type ActionVariant = "primary" | "danger" | "neutral";

export interface ActionButton {
  id: string;
  label: string;
  variant?: ActionVariant;
  /** Tool call invoked when the button is clicked. */
  call: ToolCall;
  /** Optional confirmation copy ("Are you sure?"). */
  confirm?: string;
  /** Restrict who can click — "owner" / "admin" / "any". */
  requiresRole?: "owner" | "admin" | "any";
}

export type ActionStatus = "pending" | "approved" | "rejected" | "failed";

export interface ActionBlock {
  id: string;
  channelId: string;
  /** Optional message id this block is attached to — surfaced for the
   *  reply linker. */
  messageId?: string;
  title: string;
  context?: string;
  buttons: ActionButton[];
  /** Resolved status — flipped on first button click. */
  status: ActionStatus;
  /** Which button id was clicked. */
  resolvedButtonId?: string;
  /** Who clicked. */
  resolvedBy?: string;
  /** ISO. */
  createdAt: string;
  resolvedAt?: string;
}

interface ChatActionsStore {
  blocks: ActionBlock[];

  createBlock: (
    payload: Omit<ActionBlock, "id" | "createdAt" | "status">,
  ) => ActionBlock;
  resolveBlock: (
    blockId: string,
    buttonId: string,
    actor: { id?: string; name?: string },
    status?: ActionStatus,
  ) => void;
  blockById: (id: string) => ActionBlock | null;
  blocksFor: (channelId: string) => ActionBlock[];
  removeBlock: (id: string) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_BLOCKS = 200;

export const useChatActions = create<ChatActionsStore>()(
  persist(
    (set, get) => ({
      blocks: [],

      createBlock: (payload) => {
        const row: ActionBlock = {
          ...payload,
          id: newId(),
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ blocks: [row, ...s.blocks].slice(0, MAX_BLOCKS) }));
        return row;
      },
      resolveBlock: (blockId, buttonId, actor, status = "approved") =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status,
                  resolvedButtonId: buttonId,
                  resolvedBy: actor.name ?? actor.id,
                  resolvedAt: new Date().toISOString(),
                }
              : b,
          ),
        })),
      blockById: (id) => get().blocks.find((b) => b.id === id) ?? null,
      blocksFor: (channelId) =>
        get().blocks.filter((b) => b.channelId === channelId),
      removeBlock: (id) =>
        set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),
    }),
    { name: "vyne-chat-actions", version: 1 },
  ),
);

const ACTION_RE = /\[\[action:([a-z0-9-]+)\]\]/i;

/** Returns the action id embedded in a message body, or null. */
export function extractActionId(body: string): string | null {
  const m = body.match(ACTION_RE);
  return m ? m[1] : null;
}

/** Returns the body with the action token stripped. */
export function stripActionToken(body: string): string {
  return body.replace(ACTION_RE, "").trim();
}
