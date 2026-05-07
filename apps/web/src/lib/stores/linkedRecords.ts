"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Universal linked records (20.11). Bidirectional graph between any
 * two entities — deal ↔ project ↔ contact ↔ invoice ↔ ticket etc.
 *
 *   linkRecords({ from: "deal:DEAL-42", to: "project:P-9" });
 *   linksFor("deal:DEAL-42"); // returns every neighbour, both directions
 *
 * Each link carries a `relation` label so the UI can group them
 * ("Blocked by", "Spawned from"). Removing one side removes the
 * other automatically — links are stored once, not duplicated.
 */

export type EntityRef = string; // canonical "type:id" — e.g. "deal:DEAL-42"

export interface RecordLink {
  id: string;
  /** Canonical pair, sorted lexicographically so (a,b) and (b,a) stay one row. */
  a: EntityRef;
  b: EntityRef;
  /** Free-form relation label. Optional. Defaults to "related to". */
  relation?: string;
  createdAt: string;
  createdBy?: string;
}

interface LinkedRecordsStore {
  links: RecordLink[];
  link: (payload: {
    from: EntityRef;
    to: EntityRef;
    relation?: string;
    createdBy?: string;
  }) => RecordLink;
  unlink: (id: string) => void;
  unlinkPair: (a: EntityRef, b: EntityRef) => void;
  /** Every link touching `ref`, regardless of direction. */
  linksFor: (ref: EntityRef) => RecordLink[];
  /** Just the neighbouring refs (deduped). */
  neighbors: (ref: EntityRef) => EntityRef[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `lk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function canon(a: EntityRef, b: EntityRef): [EntityRef, EntityRef] {
  return a < b ? [a, b] : [b, a];
}

export const useLinkedRecords = create<LinkedRecordsStore>()(
  persist(
    (set, get) => ({
      links: [],
      link: ({ from, to, relation, createdBy }) => {
        if (from === to) {
          // Don't link a record to itself.
          return {
            id: "noop",
            a: from,
            b: to,
            relation,
            createdAt: new Date().toISOString(),
          };
        }
        const [a, b] = canon(from, to);
        const existing = get().links.find(
          (l) => l.a === a && l.b === b && (l.relation ?? null) === (relation ?? null),
        );
        if (existing) return existing;
        const row: RecordLink = {
          id: newId(),
          a,
          b,
          relation,
          createdAt: new Date().toISOString(),
          createdBy,
        };
        set((s) => ({ links: [row, ...s.links] }));
        return row;
      },
      unlink: (id) =>
        set((s) => ({ links: s.links.filter((l) => l.id !== id) })),
      unlinkPair: (a, b) => {
        const [x, y] = canon(a, b);
        set((s) => ({
          links: s.links.filter((l) => !(l.a === x && l.b === y)),
        }));
      },
      linksFor: (ref) =>
        get().links.filter((l) => l.a === ref || l.b === ref),
      neighbors: (ref) => {
        const out = new Set<EntityRef>();
        for (const l of get().links) {
          if (l.a === ref) out.add(l.b);
          else if (l.b === ref) out.add(l.a);
        }
        return Array.from(out);
      },
    }),
    { name: "vyne-linked-records", version: 1 },
  ),
);
