"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Plugin SDK manifest store (21.10).
 *
 * A plugin is a third-party React component (compiled to ES modules)
 * that mounts into a known VYNE slot — currently:
 *   - "detail-panel-rail" → right rail on every record detail panel
 *   - "home-card"          → bottom of /home
 *   - "command-palette"    → custom commands surfaced in Cmd+K
 *
 * Each manifest carries the publish URL, requested scopes, and a
 * sandboxing flag. Loading a plugin is the host's responsibility —
 * this store is just the registry the host walks at boot.
 *
 * Real plugin runtime: production loads the plugin script in a
 * sandboxed iframe with `postMessage` routing so a buggy plugin
 * can't steal the user's session token.
 */

export type PluginSlot =
  | "detail-panel-rail"
  | "home-card"
  | "command-palette"
  | "settings-tab"
  | "topbar";

export type PluginScope =
  | "read:records"
  | "write:records"
  | "read:user"
  | "ai:invoke"
  | "ui:render";

export interface PluginManifest {
  id: string;
  /** Author-supplied stable id (`com.acme.deal-coach`). */
  manifestId: string;
  name: string;
  description: string;
  /** Publisher (URL or org name). */
  publisher: string;
  version: string;
  /** ES module URL — host fetches this at boot. */
  entryUrl: string;
  /** UI slots the plugin wants to mount in. */
  slots: PluginSlot[];
  /** Permissions the plugin needs. Surfaced to the user before install. */
  scopes: PluginScope[];
  /** When true, runs in an iframe sandbox. Default true. */
  sandboxed: boolean;
  installedAt: string;
  enabled: boolean;
  /** Optional icon (emoji or URL). */
  icon?: string;
}

interface PluginsStore {
  plugins: PluginManifest[];
  installPlugin: (
    payload: Omit<PluginManifest, "id" | "installedAt" | "enabled" | "sandboxed"> & {
      sandboxed?: boolean;
    },
  ) => PluginManifest;
  removePlugin: (id: string) => void;
  togglePlugin: (id: string) => void;
  pluginsForSlot: (slot: PluginSlot) => PluginManifest[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const usePlugins = create<PluginsStore>()(
  persist(
    (set, get) => ({
      plugins: [],
      installPlugin: (payload) => {
        const row: PluginManifest = {
          id: newId(),
          ...payload,
          sandboxed: payload.sandboxed ?? true,
          installedAt: new Date().toISOString(),
          enabled: true,
        };
        set((s) => ({ plugins: [row, ...s.plugins] }));
        return row;
      },
      removePlugin: (id) =>
        set((s) => ({ plugins: s.plugins.filter((p) => p.id !== id) })),
      togglePlugin: (id) =>
        set((s) => ({
          plugins: s.plugins.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p,
          ),
        })),
      pluginsForSlot: (slot) =>
        get().plugins.filter((p) => p.enabled && p.slots.includes(slot)),
    }),
    { name: "vyne-plugins", version: 1 },
  ),
);
