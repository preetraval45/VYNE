"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Universal soft-delete trash store. Any module can hand a record to
 * the bin and it'll live for 30 days before purging; restoring re-runs
 * the caller's `restore` function with the original snapshot.
 *
 *   sendToTrash({
 *     entity: "deal",
 *     id: deal.id,
 *     name: deal.company,
 *     snapshot: deal,
 *     restore: (d) => useCRMStore.getState().addDeal(d),
 *   });
 *
 * Restore functions can't be persisted across reloads (functions are
 * not serialisable), so the trash UI gracefully falls back to "View
 * snapshot" for historic items — but newly trashed records in the same
 * session restore in one click.
 *
 * Distinct from <UndoToast /> (5-second instant undo). This is the
 * long-term graveyard, used for "I deleted that 3 days ago, can I get
 * it back?" workflows.
 */

export type TrashEntity =
  | "deal"
  | "contact"
  | "task"
  | "project"
  | "invoice"
  | "product"
  | "order"
  | "doc"
  | "automation"
  | "playbook"
  | "runbook"
  | "other";

export interface TrashedItem<T = unknown> {
  id: string;
  /** What kind of entity this is — used for grouping + filters. */
  entity: TrashEntity;
  /** Stable identifier — typically the entity's own id. */
  itemId: string;
  /** User-facing name for the row. */
  name: string;
  /** Frozen snapshot of the entity at the moment of deletion. */
  snapshot: T;
  /** Who deleted it. */
  actor?: string;
  /** ISO timestamp. */
  trashedAt: string;
  /** Free-form audit note (e.g. "duplicate of DEAL-42"). */
  reason?: string;
}

interface RestoreFn<T = unknown> {
  (snapshot: T): void;
}

interface TrashStore {
  items: TrashedItem[];
  /** In-memory restore handlers, keyed by trash item id. Functions can't
   *  be persisted, so this map empties on reload — historic items still
   *  surface their snapshot in the UI. */
  _restoreFns: Map<string, RestoreFn>;
  send: <T>(payload: {
    entity: TrashEntity;
    id: string;
    name: string;
    snapshot: T;
    restore?: RestoreFn<T>;
    actor?: string;
    reason?: string;
  }) => string;
  restore: (id: string) => boolean;
  purge: (id: string) => void;
  purgeAll: () => void;
  /** Drop anything older than 30 days. Idempotent — call from layout boot. */
  gc: () => number;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useTrashStore = create<TrashStore>()(
  persist(
    (set, get) => ({
      items: [],
      _restoreFns: new Map(),
      send: ({ entity, id: itemId, name, snapshot, restore, actor, reason }) => {
        const id = newId();
        const row: TrashedItem = {
          id,
          entity,
          itemId,
          name: name.slice(0, 120),
          snapshot,
          actor,
          trashedAt: new Date().toISOString(),
          reason,
        };
        set((s) => {
          const nextFns = new Map(s._restoreFns);
          if (restore) nextFns.set(id, restore as RestoreFn);
          return {
            items: [row, ...s.items],
            _restoreFns: nextFns,
          };
        });
        return id;
      },
      restore: (id) => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        if (!item) return false;
        const fn = state._restoreFns.get(id);
        if (fn) {
          try {
            fn(item.snapshot);
          } catch {
            return false;
          }
        }
        // Drop the row regardless — even if no live handler, the user
        // explicitly asked to restore.
        set((s) => {
          const nextFns = new Map(s._restoreFns);
          nextFns.delete(id);
          return {
            items: s.items.filter((i) => i.id !== id),
            _restoreFns: nextFns,
          };
        });
        return Boolean(fn);
      },
      purge: (id) =>
        set((s) => {
          const nextFns = new Map(s._restoreFns);
          nextFns.delete(id);
          return {
            items: s.items.filter((i) => i.id !== id),
            _restoreFns: nextFns,
          };
        }),
      purgeAll: () =>
        set({
          items: [],
          _restoreFns: new Map(),
        }),
      gc: () => {
        const cutoff = Date.now() - RETENTION_MS;
        let removed = 0;
        set((s) => {
          const next = s.items.filter((i) => {
            const keep = new Date(i.trashedAt).getTime() >= cutoff;
            if (!keep) removed += 1;
            return keep;
          });
          return { items: next };
        });
        return removed;
      },
    }),
    {
      name: "vyne-trash",
      version: 1,
      // Don't try to serialise the function map.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Module-level helper so non-React code can soft-delete. */
export function sendToTrash<T>(payload: {
  entity: TrashEntity;
  id: string;
  name: string;
  snapshot: T;
  restore?: RestoreFn<T>;
  actor?: string;
  reason?: string;
}): string {
  return useTrashStore.getState().send(payload);
}
