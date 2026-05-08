"use client";

// Chat workflow builder (UI_UPGRADE_PLAN.md 6.3).
//
// Trigger-action rules that fire when a chat message matches. The
// matcher runs client-side on every incoming message; matched rules
// dispatch their action via the existing tool executor or post a
// system notification.
//
// Schema is deliberately small + JSON-serialisable so a follow-up can
// move it to a server-side workflow runner without touching this file.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolCall } from "@/lib/ai/toolExecutor";

export type TriggerKind = "contains" | "regex" | "mention" | "reaction";

export interface TriggerCondition {
  kind: TriggerKind;
  /** For `contains`: case-insensitive substring. For `regex`: a JS regex.
   *  For `mention`: the user id / display name to match. For `reaction`: emoji. */
  value: string;
}

export type ActionKind = "tool" | "notify" | "post-action-block";

export interface ChatWorkflowAction {
  kind: ActionKind;
  /** When kind === "tool", the call to dispatch via executeToolCall. */
  call?: ToolCall;
  /** When kind === "notify", the title shown in the bell. */
  notifyTitle?: string;
  notifyBody?: string;
  /** When kind === "post-action-block", details for the inline block. */
  blockTitle?: string;
  blockButtonLabel?: string;
  blockToolCall?: ToolCall;
}

export interface ChatWorkflow {
  id: string;
  name: string;
  /** Channel id this rule scopes to. `*` = all channels. */
  channelId: string;
  /** Conditions are AND'd. Add multiple rows for OR (= multiple workflows). */
  conditions: TriggerCondition[];
  action: ChatWorkflowAction;
  enabled: boolean;
  createdAt: string;
  /** Cumulative fire count — visible in the editor for sanity. */
  fireCount: number;
  lastFiredAt?: string;
}

interface ChatWorkflowsStore {
  workflows: ChatWorkflow[];

  saveWorkflow: (
    payload: Omit<ChatWorkflow, "id" | "createdAt" | "fireCount"> & {
      id?: string;
    },
  ) => ChatWorkflow;
  removeWorkflow: (id: string) => void;
  toggleWorkflow: (id: string) => void;
  recordFire: (id: string) => void;

  /** Returns every enabled workflow that matches the message. */
  matchAgainstMessage: (
    message: { channelId: string; content: string; mentions?: string[] },
  ) => ChatWorkflow[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function conditionMatches(
  cond: TriggerCondition,
  message: { content: string; mentions?: string[] },
): boolean {
  const text = message.content ?? "";
  switch (cond.kind) {
    case "contains":
      return text.toLowerCase().includes(cond.value.toLowerCase());
    case "regex":
      try {
        return new RegExp(cond.value, "i").test(text);
      } catch {
        return false;
      }
    case "mention":
      return Boolean(
        (message.mentions ?? []).some(
          (m) => m.toLowerCase() === cond.value.toLowerCase(),
        ),
      );
    case "reaction":
      // Reactions arrive separately; this matcher handles only the
      // text-level kinds. The reaction-bus emits its own events.
      return false;
    default:
      return false;
  }
}

export const useChatWorkflows = create<ChatWorkflowsStore>()(
  persist(
    (set, get) => ({
      workflows: [],

      saveWorkflow: (payload) => {
        const id = payload.id ?? newId();
        const row: ChatWorkflow = {
          id,
          name: payload.name.trim() || "Untitled workflow",
          channelId: payload.channelId,
          conditions:
            payload.conditions.length > 0
              ? payload.conditions
              : [{ kind: "contains", value: "" }],
          action: payload.action,
          enabled: payload.enabled,
          createdAt: new Date().toISOString(),
          fireCount: 0,
        };
        set((s) => {
          const existingIdx = s.workflows.findIndex((w) => w.id === id);
          if (existingIdx >= 0) {
            const next = [...s.workflows];
            next[existingIdx] = {
              ...row,
              fireCount: s.workflows[existingIdx].fireCount,
              lastFiredAt: s.workflows[existingIdx].lastFiredAt,
              createdAt: s.workflows[existingIdx].createdAt,
            };
            return { workflows: next };
          }
          return { workflows: [row, ...s.workflows].slice(0, 80) };
        });
        return row;
      },
      removeWorkflow: (id) =>
        set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),
      toggleWorkflow: (id) =>
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w,
          ),
        })),
      recordFire: (id) =>
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id
              ? {
                  ...w,
                  fireCount: w.fireCount + 1,
                  lastFiredAt: new Date().toISOString(),
                }
              : w,
          ),
        })),

      matchAgainstMessage: (message) => {
        const matched: ChatWorkflow[] = [];
        for (const w of get().workflows) {
          if (!w.enabled) continue;
          if (w.channelId !== "*" && w.channelId !== message.channelId) continue;
          if (w.conditions.length === 0) continue;
          const allMatch = w.conditions.every((c) =>
            conditionMatches(c, message),
          );
          if (allMatch) matched.push(w);
        }
        return matched;
      },
    }),
    { name: "vyne-chat-workflows", version: 1 },
  ),
);
