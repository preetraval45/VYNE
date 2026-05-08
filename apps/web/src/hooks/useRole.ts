"use client";

// Client-side role gate (UI_UPGRADE_PLAN.md 7.2).
//
// Single source of truth for "can the current user edit / delete this
// entity?" in the UI. Reads the role from the persisted auth store
// + falls back to "owner" in demo mode so demo workspaces stay fully
// editable. Server-side gates in lib/api/crud.ts mirror this logic.

import { useAuthStore } from "@/lib/stores/auth";
import { useEffect, useState } from "react";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "guest"
  | "viewer";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  member: 40,
  viewer: 30,
  guest: 20,
};

export const ALL_WRITE_ROLES: WorkspaceRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
];

export const ADMIN_ONLY: WorkspaceRole[] = ["owner", "admin"];

/** Returns the current user's role. Falls back to "owner" in demo
 *  mode + when the store hasn't hydrated yet so the UI doesn't flash
 *  read-only on first paint. */
export function useCurrentRole(): WorkspaceRole {
  const user = useAuthStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return "owner";
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && !user) return "owner";
  return ((user?.role as WorkspaceRole) ?? "guest") as WorkspaceRole;
}

/** Returns true when the role meets or exceeds the required level. */
export function roleAtLeast(
  role: WorkspaceRole,
  atLeast: WorkspaceRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[atLeast];
}

/** Hook predicate: true when the current role can perform writes. */
export function useCanWrite(): boolean {
  const role = useCurrentRole();
  return ALL_WRITE_ROLES.includes(role);
}

/** Hook predicate: true when the current role can perform deletes
 *  (admin or owner). */
export function useCanDelete(): boolean {
  const role = useCurrentRole();
  return ADMIN_ONLY.includes(role);
}

/** Convenience: combined "can the user act on this entity at all?". */
export function useCanEdit(): boolean {
  return useCanWrite();
}
