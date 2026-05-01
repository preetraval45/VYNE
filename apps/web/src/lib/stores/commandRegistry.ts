import { create } from "zustand";
import type { ReactNode } from "react";

/**
 * Registered cross-module command. Pages call useRegisterCommands() to
 * contribute actions; the CommandPalette merges all registered items into
 * the "Page actions" section so the user can invoke them from anywhere.
 *
 * `scope` is the page id (e.g. "crm", "projects/p_42") — when the user
 * is on that page, scoped commands rank higher. Global commands (no scope)
 * always show.
 */
export interface RegisteredCommand {
  id: string;
  label: string;
  description?: string;
  /** Lucide-react icon component, rendered at 16px */
  icon: ReactNode;
  action: () => void;
  /** Free-form search keywords that don't appear in label/description */
  keywords?: string;
  /** Page id this command belongs to. Omit for global. */
  scope?: string;
  /** Optional shortcut hint, e.g. "⌘ Shift D" — display only */
  shortcut?: string;
  /** Tag shown on the right (e.g. "AI") */
  badge?: string;
}

interface CommandRegistryState {
  commands: RegisteredCommand[];
  /** Replace all commands for a given scope (single source-of-truth per page) */
  setScopeCommands: (scope: string, commands: RegisteredCommand[]) => void;
  /** Remove all commands for a given scope (e.g. on page unmount) */
  clearScope: (scope: string) => void;
  /** Add a single global command at runtime (rare; prefer setScopeCommands) */
  addGlobal: (command: RegisteredCommand) => void;
  removeGlobal: (id: string) => void;
}

export const useCommandRegistry = create<CommandRegistryState>((set) => ({
  commands: [],

  setScopeCommands: (scope, next) =>
    set((state) => {
      const without = state.commands.filter((c) => c.scope !== scope);
      // Stamp scope onto every entry so callers don't have to repeat it.
      const stamped = next.map((c) => ({ ...c, scope }));
      return { commands: [...without, ...stamped] };
    }),

  clearScope: (scope) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.scope !== scope),
    })),

  addGlobal: (command) =>
    set((state) => {
      // De-dupe by id
      const without = state.commands.filter((c) => c.id !== command.id);
      return { commands: [...without, { ...command, scope: undefined }] };
    }),

  removeGlobal: (id) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    })),
}));

// NOTE: An earlier version of this file exported `selectCommandsForScope`,
// a curried selector that returned a fresh array on every call. That broke
// React 19's useSyncExternalStore snapshot-stability check and crashed pages
// with "Maximum update depth exceeded" (#185). Consumers should subscribe
// to `(s) => s.commands` and derive the scoped list via useMemo instead.
