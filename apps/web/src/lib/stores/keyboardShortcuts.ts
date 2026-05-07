"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Keyboard shortcut customizer (24.6).
 *
 * Each entry maps a stable action id → a keystroke sequence string
 * (`mod+k`, `g+h`, `?`). The `?` modal reads from this store so a
 * rebound shortcut shows the user's chosen keys, and the global
 * keydown handler matches against the same map so a rebound key
 * actually fires the action.
 *
 * Conflicts: when two actions resolve to the same chord, the most-
 * recently-set wins; the modal flags the orphaned action so the user
 * can rebind it.
 */

export interface ShortcutBinding {
  /** Stable action id, e.g. `palette.open`. */
  actionId: string;
  /** Default chord; falls back to this when the user has no override. */
  defaultChord: string;
  /** User's override, if set. */
  customChord?: string;
  /** Short label shown in the help modal. */
  label: string;
  /** Group ("Navigation" / "Actions" / "Editor"). */
  group: string;
}

interface KeyboardShortcutsStore {
  bindings: Record<string, ShortcutBinding>;
  /** Resolve the active chord for an action id. */
  chordFor: (actionId: string) => string;
  /** Override a chord. */
  rebind: (actionId: string, chord: string) => void;
  /** Drop a custom chord and revert to the default. */
  resetBinding: (actionId: string) => void;
  /** Drop every override. */
  resetAll: () => void;
  /** Find the action id (if any) currently resolved to a chord. */
  actionForChord: (chord: string) => string | null;
}

export const DEFAULT_BINDINGS: Record<string, ShortcutBinding> = {
  "palette.open": {
    actionId: "palette.open",
    defaultChord: "mod+k",
    label: "Open command palette",
    group: "Navigation",
  },
  "search.global": {
    actionId: "search.global",
    defaultChord: "ctrl+/",
    label: "Open global search",
    group: "Navigation",
  },
  "ai.sidebar": {
    actionId: "ai.sidebar",
    defaultChord: "mod+shift+/",
    label: "Toggle AI sidebar",
    group: "Navigation",
  },
  "shortcuts.help": {
    actionId: "shortcuts.help",
    defaultChord: "?",
    label: "Show keyboard shortcuts",
    group: "Navigation",
  },
  "focus.toggle": {
    actionId: "focus.toggle",
    defaultChord: "f",
    label: "Toggle focus mode",
    group: "Navigation",
  },
  "issue.new": {
    actionId: "issue.new",
    defaultChord: "c+i",
    label: "Create new issue",
    group: "Actions",
  },
  "deal.new": {
    actionId: "deal.new",
    defaultChord: "c+d",
    label: "Create new deal",
    group: "Actions",
  },
  "task.new": {
    actionId: "task.new",
    defaultChord: "c+t",
    label: "Create new task",
    group: "Actions",
  },
  "nav.home": {
    actionId: "nav.home",
    defaultChord: "g+h",
    label: "Go to Home",
    group: "Navigation",
  },
  "nav.crm": {
    actionId: "nav.crm",
    defaultChord: "g+c",
    label: "Go to CRM",
    group: "Navigation",
  },
  "nav.projects": {
    actionId: "nav.projects",
    defaultChord: "g+p",
    label: "Go to Projects",
    group: "Navigation",
  },
  "row.archive": {
    actionId: "row.archive",
    defaultChord: "e",
    label: "Archive selected row",
    group: "Lists",
  },
  "editor.heading1": {
    actionId: "editor.heading1",
    defaultChord: "mod+alt+1",
    label: "Heading 1 (editor)",
    group: "Editor",
  },
};

function normalizeChord(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/cmd|command/g, "mod")
    .replace(/control/g, "ctrl");
}

export const useKeyboardShortcuts = create<KeyboardShortcutsStore>()(
  persist(
    (set, get) => ({
      bindings: DEFAULT_BINDINGS,
      chordFor: (actionId) => {
        const b = get().bindings[actionId];
        if (!b) return "";
        return b.customChord ?? b.defaultChord;
      },
      rebind: (actionId, chord) => {
        const cleaned = normalizeChord(chord);
        if (!cleaned) return;
        set((s) => ({
          bindings: {
            ...s.bindings,
            [actionId]: {
              ...s.bindings[actionId],
              customChord: cleaned,
            },
          },
        }));
      },
      resetBinding: (actionId) =>
        set((s) => {
          const b = s.bindings[actionId];
          if (!b) return s;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { customChord, ...rest } = b;
          return { bindings: { ...s.bindings, [actionId]: rest as ShortcutBinding } };
        }),
      resetAll: () => set({ bindings: DEFAULT_BINDINGS }),
      actionForChord: (chord) => {
        const cleaned = normalizeChord(chord);
        const all = Object.values(get().bindings);
        const match = all.find((b) => (b.customChord ?? b.defaultChord) === cleaned);
        return match?.actionId ?? null;
      },
    }),
    { name: "vyne-keyboard-shortcuts", version: 1 },
  ),
);
