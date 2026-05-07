"use client";

import { create } from "zustand";

/**
 * Multi-select + bulk-actions state for chat (28.1.3).
 *
 *   const sel = useMessageSelection();
 *   sel.toggle(message.id);       // ctrl-click / checkbox
 *   sel.range(prevId, nextId);    // shift-click range select
 *   sel.clear();                  // Esc / row click outside selection
 *
 * Pairs with the existing `<BulkActionsBar />` (Phase 8.2). Once any
 * id is selected, the bar slides up with Forward / Star / Delete /
 * Export / Pin actions — same vocabulary as CRM and contacts.
 *
 * Selection lives in memory only — closing the channel clears it.
 * Range select needs the host to pass the current ordered id list so
 * we can pick everything between `prevId` and `nextId` (Shift-click).
 */

interface MessageSelectionStore {
  /** Currently selected message ids. */
  ids: Set<string>;
  /** True while the user is in multi-select mode. */
  active: boolean;
  /** Anchor for shift-click range select. */
  anchorId: string | null;

  toggle: (id: string) => void;
  /** Replace selection with a single id (used by mouse-click without modifier). */
  selectOnly: (id: string) => void;
  /** Add every id in `orderedIds` between `anchorId` and `id` (inclusive). */
  range: (id: string, orderedIds: string[]) => void;
  /** Add every id (e.g. "Select all visible"). */
  selectAll: (ids: string[]) => void;
  clear: () => void;
  has: (id: string) => boolean;
  size: () => number;
}

export const useMessageSelection = create<MessageSelectionStore>((set, get) => ({
  ids: new Set<string>(),
  active: false,
  anchorId: null,

  toggle: (id) => {
    set((s) => {
      const next = new Set(s.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return {
        ids: next,
        active: next.size > 0,
        anchorId: next.has(id) ? id : s.anchorId,
      };
    });
  },
  selectOnly: (id) =>
    set({ ids: new Set([id]), active: true, anchorId: id }),
  range: (id, orderedIds) => {
    set((s) => {
      const anchor = s.anchorId;
      if (!anchor || !orderedIds.includes(anchor)) {
        return { ids: new Set([id]), active: true, anchorId: id };
      }
      const a = orderedIds.indexOf(anchor);
      const b = orderedIds.indexOf(id);
      if (a === -1 || b === -1) return s;
      const [start, end] = a < b ? [a, b] : [b, a];
      const next = new Set(s.ids);
      for (let i = start; i <= end; i++) next.add(orderedIds[i]);
      return { ids: next, active: next.size > 0, anchorId: id };
    });
  },
  selectAll: (ids) =>
    set({
      ids: new Set(ids),
      active: ids.length > 0,
      anchorId: ids[ids.length - 1] ?? null,
    }),
  clear: () => set({ ids: new Set(), active: false, anchorId: null }),
  has: (id) => get().ids.has(id),
  size: () => get().ids.size,
}));
