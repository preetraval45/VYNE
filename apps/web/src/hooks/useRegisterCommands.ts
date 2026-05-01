"use client";

import { useEffect } from "react";
import {
  useCommandRegistry,
  type RegisteredCommand,
} from "@/lib/stores/commandRegistry";

/**
 * useRegisterCommands — page-scoped command palette contributions.
 *
 * Drop into any page or feature component. Commands are registered on mount
 * and torn down on unmount, so the palette stays scoped to what the user
 * is actually looking at.
 *
 * Usage:
 *   useRegisterCommands("crm", [
 *     { id: "crm-add-deal", label: "Add deal", icon: <Plus size={16} />, action: () => setOpen(true) },
 *     { id: "crm-export", label: "Export pipeline as CSV", icon: <Download size={16} />, action: () => exportCsv() },
 *   ]);
 *
 * Pass an empty array (or null/undefined) to clear all commands for the scope.
 */
export function useRegisterCommands(
  scope: string,
  commands: ReadonlyArray<Omit<RegisteredCommand, "scope">> | null | undefined,
) {
  const setScopeCommands = useCommandRegistry((s) => s.setScopeCommands);
  const clearScope = useCommandRegistry((s) => s.clearScope);

  // Stringify for stable identity — pages typically inline the array, so
  // the reference changes every render but the content does not.
  const serialized = JSON.stringify(commands ?? []);

  useEffect(() => {
    if (!commands || commands.length === 0) {
      clearScope(scope);
      return () => clearScope(scope);
    }
    setScopeCommands(scope, [...commands] as RegisteredCommand[]);
    return () => clearScope(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, serialized]);
}
