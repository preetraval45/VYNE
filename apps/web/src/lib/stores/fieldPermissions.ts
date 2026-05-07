"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoleId } from "@/lib/stores/securityPolicy";

/**
 * Field-level permissions (23.8).
 *
 * Mask sensitive fields (SSN / salary / API keys) for roles that
 * shouldn't see them. Each rule is `{ entity, field, action: "read" |
 * "write" | "mask", roles[] }`.
 *
 *   if (cannotRead("contact", "ssn", currentUser.role)) {
 *     return <span>•••</span>;
 *   }
 *
 * `mask` returns the field as `•••` instead of the raw value; this
 * is the safe default for HR / finance fields where an admin needs
 * to know the field exists but a viewer mustn't see it.
 */

export type FieldAction = "read" | "write" | "mask";

export interface FieldPermissionRule {
  id: string;
  entity: string;
  field: string;
  action: FieldAction;
  roles: RoleId[];
  createdAt: string;
}

interface FieldPermissionsStore {
  rules: FieldPermissionRule[];
  addRule: (
    rule: Omit<FieldPermissionRule, "id" | "createdAt">,
  ) => FieldPermissionRule;
  removeRule: (id: string) => void;
  /** Resolve the most-restrictive applicable action for a given access. */
  effectiveAction: (
    entity: string,
    field: string,
    role: RoleId,
  ) => FieldAction | null;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_RULES: FieldPermissionRule[] = [
  {
    id: "fp-ssn-mask",
    entity: "contact",
    field: "ssn",
    action: "mask",
    roles: ["member", "guest"],
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "fp-salary-mask",
    entity: "employee",
    field: "salary",
    action: "mask",
    roles: ["member", "guest", "manager"],
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "fp-apikey-mask",
    entity: "integration",
    field: "secret",
    action: "mask",
    roles: ["member", "guest", "manager"],
    createdAt: new Date(0).toISOString(),
  },
];

export const useFieldPermissions = create<FieldPermissionsStore>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      addRule: (rule) => {
        const row: FieldPermissionRule = {
          id: newId(),
          createdAt: new Date().toISOString(),
          ...rule,
        };
        set((s) => ({ rules: [row, ...s.rules] }));
        return row;
      },
      removeRule: (id) =>
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      effectiveAction: (entity, field, role) => {
        const matches = get().rules.filter(
          (r) =>
            r.entity === entity &&
            r.field === field &&
            r.roles.includes(role),
        );
        if (matches.length === 0) return null;
        // Hierarchy: write > read > mask. Most-restrictive wins.
        if (matches.some((m) => m.action === "mask")) return "mask";
        if (matches.some((m) => m.action === "read")) return "read";
        return "write";
      },
    }),
    { name: "vyne-field-permissions", version: 1 },
  ),
);

/** Helper: render a masked value (•••) when the role lacks read. */
export function maskField<T>(
  entity: string,
  field: string,
  role: RoleId,
  value: T,
): T | string {
  const action = useFieldPermissions
    .getState()
    .effectiveAction(entity, field, role);
  if (action === "mask") return "•••";
  return value;
}

/** Helper: predicate so detail panels can hide an entire row. */
export function canRead(entity: string, field: string, role: RoleId): boolean {
  const action = useFieldPermissions
    .getState()
    .effectiveAction(entity, field, role);
  return action !== "mask";
}

/** Helper: predicate so write paths can early-return when the role
 *  isn't allowed to mutate the field. */
export function canWrite(
  entity: string,
  field: string,
  role: RoleId,
): boolean {
  const action = useFieldPermissions
    .getState()
    .effectiveAction(entity, field, role);
  return action !== "mask" && action !== "read";
}
