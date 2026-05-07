"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Saved searches store. Distinct from `useSavedViews` (per-page filter
 * combinations) — these are workspace-level "starred" Cmd+K queries
 * the user keeps coming back to.
 */

export interface SavedSearch {
  id: string;
  /** The raw query string, including any `from:`/`type:` chips. */
  query: string;
  /** User-supplied label, defaults to the query itself. */
  name: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Pinned searches sort to the top of the saved list. */
  pinned?: boolean;
}

interface SavedSearchesStore {
  items: SavedSearch[];
  save: (query: string, name?: string) => SavedSearch;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  togglePin: (id: string) => void;
  clear: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const MAX_SAVED = 30;

export const useSavedSearches = create<SavedSearchesStore>()(
  persist(
    (set, get) => ({
      items: [],
      save: (query, name) => {
        const trimmed = query.trim();
        if (!trimmed) {
          // Caller's responsibility — but return a synthetic row so the
          // type signature stays simple.
          return {
            id: "noop",
            query: "",
            name: "(empty)",
            createdAt: new Date().toISOString(),
          };
        }
        const existing = get().items.find((s) => s.query === trimmed);
        if (existing) return existing;
        const row: SavedSearch = {
          id: newId(),
          query: trimmed,
          name: (name ?? trimmed).slice(0, 60),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ items: [row, ...s.items].slice(0, MAX_SAVED) }));
        return row;
      },
      rename: (id, name) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, name: name.slice(0, 60) } : i,
          ),
        })),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      togglePin: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, pinned: !i.pinned } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "vyne-saved-searches", version: 1 },
  ),
);
