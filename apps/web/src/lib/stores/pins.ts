import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PinnedItem {
  href: string;
  label: string;
  icon?: string; // lucide icon name
  module?: string;
}

interface PinsStore {
  pinned: PinnedItem[];
  recent: PinnedItem[];

  isPinned: (href: string) => boolean;
  pin: (item: PinnedItem) => void;
  unpin: (href: string) => void;
  togglePin: (item: PinnedItem) => void;

  trackVisit: (item: PinnedItem) => void;
  clearRecent: () => void;
}

const MAX_RECENT = 8;

export const usePinsStore = create<PinsStore>()(
  persist(
    (set, get) => ({
      pinned: [],
      recent: [],

      isPinned: (href) => get().pinned.some((p) => p.href === href),

      pin: (item) =>
        set((state) => {
          if (state.pinned.some((p) => p.href === item.href)) return state;
          return { pinned: [...state.pinned, item] };
        }),

      unpin: (href) =>
        set((state) => ({
          pinned: state.pinned.filter((p) => p.href !== href),
        })),

      togglePin: (item) => {
        const { isPinned, pin, unpin } = get();
        if (isPinned(item.href)) unpin(item.href);
        else pin(item);
      },

      trackVisit: (item) =>
        set((state) => {
          const deduped = state.recent.filter((r) => r.href !== item.href);
          return { recent: [item, ...deduped].slice(0, MAX_RECENT) };
        }),

      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: "vyne-pins",
      partialize: (state) => ({ pinned: state.pinned, recent: state.recent }),
    },
  ),
);
