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
  /** Reorder a pinned item from index `from` to index `to`. */
  movePin: (fromIdx: number, toIdx: number) => void;

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

      movePin: (fromIdx, toIdx) =>
        set((state) => {
          if (
            fromIdx === toIdx ||
            fromIdx < 0 ||
            toIdx < 0 ||
            fromIdx >= state.pinned.length ||
            toIdx >= state.pinned.length
          ) {
            return state;
          }
          const next = [...state.pinned];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return { pinned: next };
        }),

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
