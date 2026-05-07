"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Universal tag / label system. Tags are scoped per entity type so
 * "P0" on tasks doesn't auto-pollute deals — the same string is
 * still a separate row when used on different entity types.
 *
 *   const list = listTags("task");
 *   addTag("task", "P0", "#EF4444");
 *   tagEntity("task", "T-42", "P0");
 */

export type TaggableEntity =
  | "deal"
  | "contact"
  | "task"
  | "project"
  | "invoice"
  | "product"
  | "doc"
  | "automation"
  | "playbook";

export interface Tag {
  id: string;
  /** User-facing label. */
  label: string;
  /** Hex colour or CSS var. */
  color: string;
  /** Per-entity scope so the same string can have different colours for different types. */
  entity: TaggableEntity;
  createdAt: string;
}

export interface EntityTagAssignment {
  entity: TaggableEntity;
  /** Stable id of the entity. */
  entityId: string;
  tagId: string;
  /** ISO; useful for "tagged this week" filters. */
  taggedAt: string;
}

interface TagsStore {
  tags: Tag[];
  assignments: EntityTagAssignment[];
  /** Add a new tag definition; idempotent on (entity, label). */
  addTag: (entity: TaggableEntity, label: string, color?: string) => Tag;
  removeTag: (id: string) => void;
  updateTag: (id: string, patch: Partial<Pick<Tag, "label" | "color">>) => void;
  /** Apply / remove a tag from a record. */
  tagEntity: (entity: TaggableEntity, entityId: string, tagId: string) => void;
  untagEntity: (entity: TaggableEntity, entityId: string, tagId: string) => void;
  /** Query helpers. */
  listTags: (entity: TaggableEntity) => Tag[];
  tagsFor: (entity: TaggableEntity, entityId: string) => Tag[];
  entitiesByTag: (tagId: string) => string[];
}

const PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
  "#84CC16",
  "#F97316",
];

let _hue = 0;
function pickColor(seed?: string): string {
  if (!seed) return PALETTE[_hue++ % PALETTE.length];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useTags = create<TagsStore>()(
  persist(
    (set, get) => ({
      tags: [],
      assignments: [],

      addTag: (entity, label, color) => {
        const trimmed = label.trim();
        const existing = get().tags.find(
          (t) => t.entity === entity && t.label.toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing;
        const tag: Tag = {
          id: newId(),
          label: trimmed.slice(0, 32),
          color: color ?? pickColor(trimmed),
          entity,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tags: [tag, ...s.tags] }));
        return tag;
      },
      removeTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          assignments: s.assignments.filter((a) => a.tagId !== id),
        })),
      updateTag: (id, patch) =>
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      tagEntity: (entity, entityId, tagId) =>
        set((s) => {
          if (
            s.assignments.some(
              (a) => a.entity === entity && a.entityId === entityId && a.tagId === tagId,
            )
          ) {
            return s;
          }
          return {
            assignments: [
              ...s.assignments,
              { entity, entityId, tagId, taggedAt: new Date().toISOString() },
            ],
          };
        }),
      untagEntity: (entity, entityId, tagId) =>
        set((s) => ({
          assignments: s.assignments.filter(
            (a) =>
              !(a.entity === entity && a.entityId === entityId && a.tagId === tagId),
          ),
        })),
      listTags: (entity) =>
        get()
          .tags.filter((t) => t.entity === entity)
          .sort((a, b) => a.label.localeCompare(b.label)),
      tagsFor: (entity, entityId) => {
        const ids = new Set(
          get()
            .assignments.filter(
              (a) => a.entity === entity && a.entityId === entityId,
            )
            .map((a) => a.tagId),
        );
        return get().tags.filter((t) => ids.has(t.id));
      },
      entitiesByTag: (tagId) =>
        get()
          .assignments.filter((a) => a.tagId === tagId)
          .map((a) => a.entityId),
    }),
    { name: "vyne-tags", version: 1 },
  ),
);
