// PH-I — Formal RBAC matrix.
//
// This file is the canonical authority for "what can a role do?" —
// every API route + UI gate that says `if user can X` should consult
// `can(role, "X")` rather than role.includes(...) string checks.
// Auditors look here to verify the access-control claim in the SOC 2
// control matrix (CC6.3).
//
// Roles already exist in lib/auth/role.ts; this layer adds the
// resource-level permission catalogue on top.

import type { WorkspaceRole } from "./role";

// Every gate-able capability in VYNE. When a new module ships,
// extend this union — the compiler will then force every role's
// permission map to declare a value for it.
export type Permission =
  // CRUD on operational data (the 21 resources behind createCrudHandlers)
  | "data.read"
  | "data.write"
  | "data.delete"
  // Workspace + member management
  | "workspace.settings"
  | "workspace.members.invite"
  | "workspace.members.role.change"
  | "workspace.members.remove"
  // Billing
  | "billing.view"
  | "billing.manage"
  // Security
  | "security.audit.view"
  | "security.audit.export"
  | "security.mfa.enforce"
  | "security.deletion.request"
  | "security.deletion.cancel"
  // Admin-only
  | "admin.backup.run"
  | "admin.restore.run"
  | "admin.tenant.cross-view";

// Master matrix. owner > admin > manager > member > guest.
// Add a new permission column above; this map keeps it
// per-role-explicit (no "default deny" magic — every cell is filled).
const MATRIX: Record<WorkspaceRole, Record<Permission, boolean>> = {
  owner: {
    "data.read": true,
    "data.write": true,
    "data.delete": true,
    "workspace.settings": true,
    "workspace.members.invite": true,
    "workspace.members.role.change": true,
    "workspace.members.remove": true,
    "billing.view": true,
    "billing.manage": true,
    "security.audit.view": true,
    "security.audit.export": true,
    "security.mfa.enforce": true,
    "security.deletion.request": true,
    "security.deletion.cancel": true,
    "admin.backup.run": true,
    "admin.restore.run": true,
    "admin.tenant.cross-view": false, // no cross-tenant access ever
  },
  admin: {
    "data.read": true,
    "data.write": true,
    "data.delete": true,
    "workspace.settings": true,
    "workspace.members.invite": true,
    "workspace.members.role.change": true,
    "workspace.members.remove": true,
    "billing.view": true,
    "billing.manage": false, // billing is owner-only
    "security.audit.view": true,
    "security.audit.export": true,
    "security.mfa.enforce": true,
    "security.deletion.request": false, // owner-only — full workspace deletion
    "security.deletion.cancel": false,
    "admin.backup.run": true,
    "admin.restore.run": true,
    "admin.tenant.cross-view": false,
  },
  manager: {
    "data.read": true,
    "data.write": true,
    "data.delete": false,
    "workspace.settings": false,
    "workspace.members.invite": true,
    "workspace.members.role.change": false,
    "workspace.members.remove": false,
    "billing.view": false,
    "billing.manage": false,
    "security.audit.view": true,
    "security.audit.export": false,
    "security.mfa.enforce": false,
    "security.deletion.request": false,
    "security.deletion.cancel": false,
    "admin.backup.run": false,
    "admin.restore.run": false,
    "admin.tenant.cross-view": false,
  },
  member: {
    "data.read": true,
    "data.write": true,
    "data.delete": false,
    "workspace.settings": false,
    "workspace.members.invite": false,
    "workspace.members.role.change": false,
    "workspace.members.remove": false,
    "billing.view": false,
    "billing.manage": false,
    "security.audit.view": false,
    "security.audit.export": false,
    "security.mfa.enforce": false,
    "security.deletion.request": false,
    "security.deletion.cancel": false,
    "admin.backup.run": false,
    "admin.restore.run": false,
    "admin.tenant.cross-view": false,
  },
  guest: {
    "data.read": true,
    "data.write": false,
    "data.delete": false,
    "workspace.settings": false,
    "workspace.members.invite": false,
    "workspace.members.role.change": false,
    "workspace.members.remove": false,
    "billing.view": false,
    "billing.manage": false,
    "security.audit.view": false,
    "security.audit.export": false,
    "security.mfa.enforce": false,
    "security.deletion.request": false,
    "security.deletion.cancel": false,
    "admin.backup.run": false,
    "admin.restore.run": false,
    "admin.tenant.cross-view": false,
  },
};

/**
 * Returns true if the given role has the named permission.
 * Use as the single source of truth — never role.includes(...).
 */
export function can(role: WorkspaceRole, permission: Permission): boolean {
  return MATRIX[role]?.[permission] === true;
}

/**
 * Useful for diffing matrix changes in a PR — emit a flat table
 * of [role, permission, granted] tuples.
 */
export function matrixSnapshot(): Array<{
  role: WorkspaceRole;
  permission: Permission;
  granted: boolean;
}> {
  const out: Array<{
    role: WorkspaceRole;
    permission: Permission;
    granted: boolean;
  }> = [];
  for (const role of Object.keys(MATRIX) as WorkspaceRole[]) {
    for (const perm of Object.keys(MATRIX[role]) as Permission[]) {
      out.push({ role, permission: perm, granted: MATRIX[role][perm] });
    }
  }
  return out;
}

/**
 * All permissions a role currently holds (useful for /api/auth/me
 * payload + UI gating).
 */
export function permissionsForRole(role: WorkspaceRole): Permission[] {
  return (Object.keys(MATRIX[role]) as Permission[]).filter((p) =>
    can(role, p),
  );
}
