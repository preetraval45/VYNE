"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MsgMessage } from "@/lib/api/client";

export interface PinnedMessage {
  channelId: string;
  message: MsgMessage;
  pinnedAt: string;
  pinnedBy: string;
}

interface PinnedMessagesState {
  byChannel: Record<string, PinnedMessage[]>;
  pin: (channelId: string, msg: MsgMessage, pinnedBy?: string) => void;
  unpin: (channelId: string, messageId: string) => void;
  isPinned: (channelId: string, messageId: string) => boolean;
  forChannel: (channelId: string) => PinnedMessage[];
}

export const usePinnedMessagesStore = create<PinnedMessagesState>()(
  persist(
    (set, get) => ({
      byChannel: {},

      pin: (channelId, msg, pinnedBy = "You") =>
        set((s) => {
          const list = s.byChannel[channelId] ?? [];
          if (list.some((p) => p.message.id === msg.id)) return s;
          return {
            byChannel: {
              ...s.byChannel,
              [channelId]: [
                ...list,
                {
                  channelId,
                  message: msg,
                  pinnedAt: new Date().toISOString(),
                  pinnedBy,
                },
              ].slice(-50),
            },
          };
        }),

      unpin: (channelId, messageId) =>
        set((s) => ({
          byChannel: {
            ...s.byChannel,
            [channelId]: (s.byChannel[channelId] ?? []).filter(
              (p) => p.message.id !== messageId,
            ),
          },
        })),

      isPinned: (channelId, messageId) =>
        (get().byChannel[channelId] ?? []).some(
          (p) => p.message.id === messageId,
        ),

      forChannel: (channelId) => get().byChannel[channelId] ?? [],
    }),
    { name: "vyne-pinned-messages", version: 1 },
  ),
);
