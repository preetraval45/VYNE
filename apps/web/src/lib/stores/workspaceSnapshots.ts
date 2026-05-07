"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Workspace snapshots — point-in-time backups of every persisted
 * Zustand store. Restoring re-hydrates each store from the snapshot,
 * so the user can roll the entire workspace back to any of the last
 * 7 manual or automatic snapshots.
 *
 *   await captureSnapshot("Pre-import sanity check");
 *   …
 *   const ok = await restoreSnapshot(snap.id);
 *
 * Storage strategy:
 *   - Snapshots live in a dedicated localStorage key (`vyne-snapshots`)
 *     so the main stores' partialize hooks aren't affected.
 *   - Capped at 7 snapshots. Oldest evicted FIFO.
 *   - Auto-snapshot fires once per day on first dashboard mount.
 *
 * Mismatched store-version migrations are caller's problem — restore
 * is a hard overwrite of `localStorage[key]`, then triggers a reload
 * to make every persisted store re-read its blob.
 */

export interface WorkspaceSnapshot {
  id: string;
  /** User-supplied label or "Auto · 2026-05-05". */
  name: string;
  createdAt: string;
  /** Free-form note (e.g. "before CSV import of 1.2k contacts"). */
  notes?: string;
  /** Map of localStorage key → JSON string. */
  blob: Record<string, string>;
  /** Approximate size in bytes of the snapshotted blob. */
  sizeBytes: number;
}

interface SnapshotStore {
  snapshots: WorkspaceSnapshot[];
  capture: (name: string, notes?: string) => Promise<WorkspaceSnapshot>;
  restore: (id: string) => Promise<boolean>;
  remove: (id: string) => void;
  /** Run the daily auto-snapshot if the last one is > 24 h ago. */
  ensureDaily: () => void;
}

const MAX = 7;
const PREFIX = "vyne-";
const SKIP_KEYS = new Set([
  "vyne-snapshots", // never snapshot ourselves
]);

function readAllVyneStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith(PREFIX)) continue;
    if (SKIP_KEYS.has(key)) continue;
    const value = localStorage.getItem(key);
    if (value != null) out[key] = value;
  }
  return out;
}

function approxBytes(blob: Record<string, string>): number {
  let n = 0;
  for (const k of Object.keys(blob)) {
    n += k.length + (blob[k]?.length ?? 0);
  }
  return n;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useWorkspaceSnapshots = create<SnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      capture: async (name, notes) => {
        const blob = readAllVyneStorage();
        const row: WorkspaceSnapshot = {
          id: newId(),
          name: name.slice(0, 80) || "Untitled snapshot",
          createdAt: new Date().toISOString(),
          notes,
          blob,
          sizeBytes: approxBytes(blob),
        };
        set((s) => ({ snapshots: [row, ...s.snapshots].slice(0, MAX) }));
        return row;
      },
      restore: async (id) => {
        if (typeof window === "undefined") return false;
        const snap = get().snapshots.find((s) => s.id === id);
        if (!snap) return false;
        try {
          // Drop every existing vyne-* key first so a sparse snapshot
          // (e.g. a sub-set of stores) doesn't leak unrelated state.
          const live = readAllVyneStorage();
          for (const key of Object.keys(live)) {
            localStorage.removeItem(key);
          }
          for (const [key, value] of Object.entries(snap.blob)) {
            localStorage.setItem(key, value);
          }
          // Hard reload so every persisted store re-reads its blob.
          window.location.reload();
          return true;
        } catch {
          return false;
        }
      },
      remove: (id) =>
        set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) })),
      ensureDaily: () => {
        const last = get().snapshots[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (last && new Date(last.createdAt).getTime() >= today.getTime()) {
          return;
        }
        const blob = readAllVyneStorage();
        const stamp = today.toISOString().slice(0, 10);
        const row: WorkspaceSnapshot = {
          id: newId(),
          name: `Auto · ${stamp}`,
          createdAt: new Date().toISOString(),
          blob,
          sizeBytes: approxBytes(blob),
        };
        set((s) => ({ snapshots: [row, ...s.snapshots].slice(0, MAX) }));
      },
    }),
    { name: "vyne-snapshots", version: 1 },
  ),
);
