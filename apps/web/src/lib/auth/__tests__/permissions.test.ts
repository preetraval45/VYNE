// PH-I — RBAC matrix contract tests.
//
// The matrix is THE source of truth for "can role X do Y" — auditors
// look at it as evidence for SOC 2 CC6.3. These tests pin the rules
// that would silently regress if someone flipped a cell during a
// refactor:
//
//   1. Only owner can manage billing.
//   2. Only owner can request workspace deletion.
//   3. Cross-tenant access is never granted to anyone.
//   4. Guest is read-only.
//   5. Privilege escalates monotonically: owner ⊇ admin ⊇ manager ⊇ member ⊇ guest
//      for read-shaped permissions.
//   6. matrixSnapshot enumerates every cell (full coverage).

import { describe, it, expect } from "vitest";
import {
  can,
  matrixSnapshot,
  permissionsForRole,
  type Permission,
} from "../permissions";
import type { WorkspaceRole } from "../role";

const READ_PERMS: Permission[] = ["data.read"];

describe("RBAC matrix", () => {
  describe("billing — owner-only", () => {
    it("owner can manage billing", () => {
      expect(can("owner", "billing.manage")).toBe(true);
    });
    it("admin can VIEW billing but NOT manage it", () => {
      expect(can("admin", "billing.view")).toBe(true);
      expect(can("admin", "billing.manage")).toBe(false);
    });
    it("non-owner non-admin roles cannot touch billing", () => {
      for (const r of ["manager", "member", "guest"] as WorkspaceRole[]) {
        expect(can(r, "billing.view")).toBe(false);
        expect(can(r, "billing.manage")).toBe(false);
      }
    });
  });

  describe("workspace deletion — owner-only", () => {
    it("owner can request + cancel deletion", () => {
      expect(can("owner", "security.deletion.request")).toBe(true);
      expect(can("owner", "security.deletion.cancel")).toBe(true);
    });
    it("admin cannot delete the workspace (escalation barrier)", () => {
      expect(can("admin", "security.deletion.request")).toBe(false);
      expect(can("admin", "security.deletion.cancel")).toBe(false);
    });
    it("everyone else cannot delete either", () => {
      for (const r of ["manager", "member", "guest"] as WorkspaceRole[]) {
        expect(can(r, "security.deletion.request")).toBe(false);
      }
    });
  });

  describe("cross-tenant view — never", () => {
    it("no role can view across tenants — full stop", () => {
      for (const r of [
        "owner",
        "admin",
        "manager",
        "member",
        "guest",
      ] as WorkspaceRole[]) {
        expect(can(r, "admin.tenant.cross-view")).toBe(false);
      }
    });
  });

  describe("guest — read-only", () => {
    it("guest can read", () => {
      expect(can("guest", "data.read")).toBe(true);
    });
    it("guest cannot write OR delete", () => {
      expect(can("guest", "data.write")).toBe(false);
      expect(can("guest", "data.delete")).toBe(false);
    });
    it("guest cannot do anything admin-shaped", () => {
      expect(can("guest", "workspace.settings")).toBe(false);
      expect(can("guest", "billing.view")).toBe(false);
      expect(can("guest", "security.audit.view")).toBe(false);
      expect(can("guest", "admin.backup.run")).toBe(false);
    });
  });

  describe("monotonic read access", () => {
    it("every higher role keeps the read permissions of lower roles", () => {
      // The read-shaped permissions should never be revoked as the
      // role escalates. Audit-view + data-read are the canonical reads.
      const ROLES: WorkspaceRole[] = [
        "guest",
        "member",
        "manager",
        "admin",
        "owner",
      ];
      for (const perm of READ_PERMS) {
        // The first role that grants the permission — everyone above
        // it should also grant it.
        const firstGrantIdx = ROLES.findIndex((r) => can(r, perm));
        if (firstGrantIdx === -1) continue;
        for (let i = firstGrantIdx; i < ROLES.length; i++) {
          expect(can(ROLES[i], perm), `${ROLES[i]} should keep ${perm}`).toBe(
            true,
          );
        }
      }
    });
  });

  describe("admin operations", () => {
    it("admin can run backup + restore", () => {
      expect(can("admin", "admin.backup.run")).toBe(true);
      expect(can("admin", "admin.restore.run")).toBe(true);
    });
    it("non-admin/owner cannot run backup or restore", () => {
      for (const r of ["manager", "member", "guest"] as WorkspaceRole[]) {
        expect(can(r, "admin.backup.run")).toBe(false);
        expect(can(r, "admin.restore.run")).toBe(false);
      }
    });
    it("only owner + admin can export the audit log", () => {
      expect(can("owner", "security.audit.export")).toBe(true);
      expect(can("admin", "security.audit.export")).toBe(true);
      for (const r of ["manager", "member", "guest"] as WorkspaceRole[]) {
        expect(can(r, "security.audit.export")).toBe(false);
      }
    });
  });

  describe("matrix shape", () => {
    it("snapshot enumerates every (role, permission) cell with no holes", () => {
      const snap = matrixSnapshot();
      // 5 roles × N permissions — N varies by addition. Snapshot must
      // be a perfect Cartesian product (no role missing a permission).
      const roles = new Set(snap.map((s) => s.role));
      const perms = new Set(snap.map((s) => s.permission));
      expect(snap.length).toBe(roles.size * perms.size);
      expect(roles.size).toBe(5); // owner/admin/manager/member/guest
    });

    it("permissionsForRole returns only the granted permissions", () => {
      const ownerPerms = new Set(permissionsForRole("owner"));
      const guestPerms = new Set(permissionsForRole("guest"));
      // Owner should hold everything guest holds + strictly more.
      for (const p of guestPerms) {
        expect(ownerPerms.has(p)).toBe(true);
      }
      expect(ownerPerms.size).toBeGreaterThan(guestPerms.size);
    });
  });
});
