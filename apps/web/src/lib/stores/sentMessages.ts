"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MsgMessage } from "@/lib/api/client";

// Broadcast across tabs without importing the hook (avoid circular dep)
function pingTabs() {
  if (typeof window === "undefined") return;
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel("vyne-tab-sync");
    bc.postMessage({ type: "rehydrate", key: "vyne-sent-messages" });
    bc.close();
  } catch {
    /* ignore */
  }
}

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
  /** Tombstones for deleted messages so they're hidden even from mock seeds */
  deleted: Record<string, true>;
  /** Edited content overrides keyed by message id */
  edits: Record<string, { content: string; updatedAt: string }>;
  push: (channelId: string, msg: MsgMessage) => void;
  /** Update a previously-pushed message (e.g. when the API echo replaces the optimistic id). */
  replace: (channelId: string, oldId: string, msg: MsgMessage) => void;
  /** Edit a message — works on both persisted user messages AND mock seeds (overlay) */
  editMessage: (messageId: string, newContent: string) => void;
  /** Soft-delete — adds tombstone so the message is hidden everywhere */
  deleteMessage: (channelId: string, messageId: string) => void;
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
      deleted: {},
      edits: {},

      push: (channelId, msg) => {
        let mutated = false;
        set((s) => {
          const existing = s.byChannel[channelId] ?? [];
          if (existing.some((m) => m.id === msg.id)) return s;
          mutated = true;
          return {
            byChannel: {
              ...s.byChannel,
              [channelId]: [...existing, msg].slice(-200),
            },
          };
        });
        if (mutated) pingTabs();
      },

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

      editMessage: (messageId, newContent) => {
        pingTabs();
        set((s) => {
          // Update in byChannel if it's a user-sent message
          const nextByChannel: Record<string, MsgMessage[]> = {};
          let touched = false;
          for (const [cid, list] of Object.entries(s.byChannel)) {
            if (list.some((m) => m.id === messageId)) {
              touched = true;
              nextByChannel[cid] = list.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content: newContent,
                      updatedAt: new Date().toISOString(),
                    }
                  : m,
              );
            } else {
              nextByChannel[cid] = list;
            }
          }
          // Always also write the edits overlay so mock-seeded messages
          // can be "edited" (overlay merges in useMessages on load).
          return {
            byChannel: touched ? nextByChannel : s.byChannel,
            edits: {
              ...s.edits,
              [messageId]: {
                content: newContent,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteMessage: (channelId, messageId) => {
        pingTabs();
        set((s) => {
          const list = s.byChannel[channelId];
          const nextByChannel = list
            ? {
                ...s.byChannel,
                [channelId]: list.filter((m) => m.id !== messageId),
              }
            : s.byChannel;
          return {
            byChannel: nextByChannel,
            deleted: { ...s.deleted, [messageId]: true },
          };
        });
      },

      forChannel: (channelId) => get().byChannel[channelId] ?? [],

      clearChannel: (channelId) =>
        set((s) => {
          const next = { ...s.byChannel };
          delete next[channelId];
          return { byChannel: next };
        }),

      clearAll: () => set({ byChannel: {}, deleted: {}, edits: {} }),
    }),
    {
      name: "vyne-sent-messages",
      version: 1,
    },
  ),
);
