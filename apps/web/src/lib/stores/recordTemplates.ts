"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Record templates (20.9). Pre-baked starter shapes for every entity
 * type — "New deal from template" pre-fills custom fields, tasks,
 * attached files in one click instead of hand-keying each row.
 *
 *   const tpl = saveTemplate({
 *     entity: "project",
 *     name: "Customer onboarding",
 *     payload: { ...full project shape... },
 *   });
 *
 *   const draft = applyTemplate(tpl.id);
 *   // → returns the payload + bumps a "uses" counter for popularity.
 *
 * Each template carries a `payload` blob so this store can serve
 * any entity type without per-shape schemas.
 */

export interface RecordTemplate {
  id: string;
  entity: string;
  name: string;
  description?: string;
  /** The pre-baked shape applied when the template is used. */
  payload: Record<string, unknown>;
  /** ISO. */
  createdAt: string;
  /** Times this template has been applied. Used to sort the picker. */
  uses: number;
  /** Optional emoji / icon for the picker. */
  icon?: string;
}

interface RecordTemplatesStore {
  templates: RecordTemplate[];
  saveTemplate: (
    payload: Omit<RecordTemplate, "id" | "createdAt" | "uses">,
  ) => RecordTemplate;
  removeTemplate: (id: string) => void;
  applyTemplate: (id: string) => Record<string, unknown> | null;
  templatesFor: (entity: string) => RecordTemplate[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rtpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useRecordTemplates = create<RecordTemplatesStore>()(
  persist(
    (set, get) => ({
      templates: [],
      saveTemplate: (payload) => {
        const row: RecordTemplate = {
          id: newId(),
          createdAt: new Date().toISOString(),
          uses: 0,
          ...payload,
        };
        set((s) => ({ templates: [row, ...s.templates] }));
        return row;
      },
      removeTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      applyTemplate: (id) => {
        const tpl = get().templates.find((t) => t.id === id);
        if (!tpl) return null;
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, uses: t.uses + 1 } : t,
          ),
        }));
        // Deep clone so the caller can mutate without polluting the store.
        return JSON.parse(JSON.stringify(tpl.payload)) as Record<string, unknown>;
      },
      templatesFor: (entity) =>
        get()
          .templates.filter((t) => t.entity === entity)
          .sort((a, b) => b.uses - a.uses),
    }),
    { name: "vyne-record-templates", version: 1 },
  ),
);
