"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FieldType = "text" | "number" | "date" | "select" | "checkbox";

export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // for select
}

export interface CustomStatus {
  id: string;
  label: string;
  color: string;
}

interface ModuleSchema {
  fields: CustomField[];
  statuses: CustomStatus[];
}

interface CustomFieldsStore {
  schemas: Record<string, ModuleSchema>;

  getSchema: (moduleId: string) => ModuleSchema;
  addField: (moduleId: string, field: Omit<CustomField, "id">) => void;
  updateField: (moduleId: string, id: string, patch: Partial<CustomField>) => void;
  removeField: (moduleId: string, id: string) => void;
  reorderFields: (moduleId: string, fromIdx: number, toIdx: number) => void;

  addStatus: (moduleId: string, status: Omit<CustomStatus, "id">) => void;
  updateStatus: (moduleId: string, id: string, patch: Partial<CustomStatus>) => void;
  removeStatus: (moduleId: string, id: string) => void;
  reorderStatuses: (moduleId: string, fromIdx: number, toIdx: number) => void;

  resetModule: (moduleId: string) => void;
}

// Stable default instances so Zustand selectors returning the default
// compare equal across renders. Previously each call rebuilt the object
// and crashed React with "Maximum update depth exceeded" (error #185).
const DEFAULT_PROJECT_FIELDS: CustomField[] = [];
const DEFAULT_PROJECT_STATUSES: CustomStatus[] = [
  { id: "active", label: "Active", color: "var(--vyne-accent, #06B6D4)" },
  { id: "paused", label: "On Hold", color: "#F59E0B" },
  { id: "completed", label: "Completed", color: "#22C55E" },
];
const DEFAULT_PROJECT_SCHEMA: ModuleSchema = {
  fields: DEFAULT_PROJECT_FIELDS,
  statuses: DEFAULT_PROJECT_STATUSES,
};

const EMPTY_FIELDS: CustomField[] = [];
const EMPTY_STATUSES: CustomStatus[] = [];
const EMPTY_SCHEMA: ModuleSchema = {
  fields: EMPTY_FIELDS,
  statuses: EMPTY_STATUSES,
};

function defaultSchemaFor(moduleId: string): ModuleSchema {
  if (moduleId === "projects") return DEFAULT_PROJECT_SCHEMA;
  return EMPTY_SCHEMA;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useCustomFieldsStore = create<CustomFieldsStore>()(
  persist(
    (set, get) => ({
      schemas: {},

      getSchema: (moduleId) => {
        const s = get().schemas[moduleId];
        if (s) return s;
        return defaultSchemaFor(moduleId);
      },

      addField: (moduleId, field) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                fields: [...schema.fields, { ...field, id: newId() }],
              },
            },
          };
        }),

      updateField: (moduleId, id, patch) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                fields: schema.fields.map((f) =>
                  f.id === id ? { ...f, ...patch } : f,
                ),
              },
            },
          };
        }),

      removeField: (moduleId, id) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                fields: schema.fields.filter((f) => f.id !== id),
              },
            },
          };
        }),

      reorderFields: (moduleId, fromIdx, toIdx) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: { ...schema, fields: move(schema.fields, fromIdx, toIdx) },
            },
          };
        }),

      addStatus: (moduleId, status) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                statuses: [...schema.statuses, { ...status, id: newId() }],
              },
            },
          };
        }),

      updateStatus: (moduleId, id, patch) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                statuses: schema.statuses.map((s) =>
                  s.id === id ? { ...s, ...patch } : s,
                ),
              },
            },
          };
        }),

      removeStatus: (moduleId, id) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: {
                ...schema,
                statuses: schema.statuses.filter((s) => s.id !== id),
              },
            },
          };
        }),

      reorderStatuses: (moduleId, fromIdx, toIdx) =>
        set((state) => {
          const schema = state.schemas[moduleId] ?? defaultSchemaFor(moduleId);
          return {
            schemas: {
              ...state.schemas,
              [moduleId]: { ...schema, statuses: move(schema.statuses, fromIdx, toIdx) },
            },
          };
        }),

      resetModule: (moduleId) =>
        set((state) => {
          const next = { ...state.schemas };
          delete next[moduleId];
          return { schemas: next };
        }),
    }),
    { name: "vyne-custom-fields", version: 1 },
  ),
);
