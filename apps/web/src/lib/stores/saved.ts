"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedMessage {
  id: string;
  messageId: string;
  channelId: string;
  channelName: string;
  authorName: string;
  content: string;
  savedAt: string;
  note?: string;
}

interface SavedStore {
  saved: SavedMessage[];
  isSaved: (messageId: string) => boolean;
  toggleSave: (entry: Omit<SavedMessage, "id" | "savedAt">) => void;
  removeSaved: (messageId: string) => void;
  setNote: (messageId: string, note: string) => void;
  clear: () => void;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      saved: [],
      isSaved: (messageId) =>
        get().saved.some((s) => s.messageId === messageId),
      toggleSave: (entry) =>
        set((state) => {
          const exists = state.saved.find(
            (s) => s.messageId === entry.messageId,
          );
          if (exists) {
            return {
              saved: state.saved.filter(
                (s) => s.messageId !== entry.messageId,
              ),
            };
          }
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `saved-${Date.now()}`;
          return {
            saved: [
              {
                ...entry,
                id,
                savedAt: new Date().toISOString(),
              },
              ...state.saved,
            ].slice(0, 200),
          };
        }),
      removeSaved: (messageId) =>
        set((state) => ({
          saved: state.saved.filter((s) => s.messageId !== messageId),
        })),
      setNote: (messageId, note) =>
        set((state) => ({
          saved: state.saved.map((s) =>
            s.messageId === messageId ? { ...s, note } : s,
          ),
        })),
      clear: () => set({ saved: [] }),
    }),
    { name: "vyne-saved-messages", version: 1 },
  ),
);
