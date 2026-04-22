"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Document } from "@/types";

/* ───────────────────────────────────────────────────────────────
 * Local docs store. The HTTP-backed docsApi pointed at a backend
 * that doesn't exist in this deployment, which silently swallowed
 * "Add page" clicks. Mirroring the rest of the modules (projects,
 * crm, contacts, etc.), docs are now persisted to localStorage.
 * ─────────────────────────────────────────────────────────────── */

interface DocsState {
  docs: Document[];
  add: (input: {
    title?: string;
    parentId?: string | null;
    icon?: string;
    content?: string;
  }) => Document;
  update: (
    id: string,
    data: Partial<Pick<Document, "title" | "icon" | "coverUrl" | "content">>,
  ) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Document | null;
}

function uid(): string {
  return `doc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextPosition(siblings: Document[]): number {
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((s) => s.position ?? 0)) + 1;
}

const SEED: Document[] = [
  {
    id: "doc-welcome",
    orgId: "vyne",
    parentId: null,
    title: "Welcome to VYNE Docs",
    icon: "📘",
    coverUrl: null,
    isPublished: true,
    isTemplate: false,
    createdBy: "system",
    updatedBy: null,
    position: 0,
    content:
      "# Welcome\n\nThis is your workspace for product specs, runbooks, and meeting notes. Use the + buttons in the tree on the left to create new pages.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export const useDocsStore = create<DocsState>()(
  persist(
    (set, get) => ({
      docs: SEED,

      add: (input) => {
        const parentId = input.parentId ?? null;
        const siblings = get().docs.filter((d) => (d.parentId ?? null) === parentId);
        const doc: Document = {
          id: uid(),
          orgId: "vyne",
          parentId,
          title: input.title?.trim() || "Untitled",
          icon: input.icon ?? null,
          coverUrl: null,
          isPublished: false,
          isTemplate: false,
          createdBy: "you",
          updatedBy: null,
          position: nextPosition(siblings),
          content: input.content ?? "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set({ docs: [...get().docs, doc] });
        return doc;
      },

      update: (id, data) => {
        set({
          docs: get().docs.map((d) =>
            d.id === id ? { ...d, ...data, updatedAt: nowIso() } : d,
          ),
        });
      },

      remove: (id) => {
        // Cascade: collect descendant ids first.
        const all = get().docs;
        const toRemove = new Set<string>([id]);
        let added = true;
        while (added) {
          added = false;
          for (const d of all) {
            if (d.parentId && toRemove.has(d.parentId) && !toRemove.has(d.id)) {
              toRemove.add(d.id);
              added = true;
            }
          }
        }
        set({ docs: all.filter((d) => !toRemove.has(d.id)) });
      },

      duplicate: (id) => {
        const src = get().docs.find((d) => d.id === id);
        if (!src) return null;
        const siblings = get().docs.filter(
          (d) => (d.parentId ?? null) === (src.parentId ?? null),
        );
        const copy: Document = {
          ...src,
          id: uid(),
          title: `${src.title} (copy)`,
          position: nextPosition(siblings),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set({ docs: [...get().docs, copy] });
        return copy;
      },
    }),
    {
      name: "vyne-docs",
      partialize: (state) => ({ docs: state.docs }),
    },
  ),
);
