import { create } from "zustand";

export interface UndoableAction {
  id: string;
  label: string;
  undo: () => void | Promise<void>;
  expiresAt: number;
}

interface UndoStore {
  pending: UndoableAction | null;

  /**
   * Register an undoable action.
   * The toast will auto-dismiss after `ttlMs` (default 6s). While it's visible,
   * clicking "Undo" calls `undo()` and clears it.
   */
  push: (params: {
    label: string;
    undo: () => void | Promise<void>;
    ttlMs?: number;
  }) => void;

  invokeUndo: () => Promise<void>;
  clear: () => void;
}

const DEFAULT_TTL = 6000;

export const useUndoStore = create<UndoStore>((set, get) => ({
  pending: null,

  push: ({ label, undo, ttlMs = DEFAULT_TTL }) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = Date.now() + ttlMs;
    set({ pending: { id, label, undo, expiresAt } });

    // Auto-clear after TTL
    setTimeout(() => {
      const current = get().pending;
      if (current?.id === id) set({ pending: null });
    }, ttlMs + 50);
  },

  invokeUndo: async () => {
    const current = get().pending;
    if (!current) return;
    set({ pending: null });
    await current.undo();
  },

  clear: () => set({ pending: null }),
}));
