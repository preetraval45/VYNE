"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import type { OrgMember } from "@/lib/stores/settings";
import InviteMemberModal from "./InviteMemberModal";

// ─── Helpers ─────────────────────────────────────────────────────
function RoleBadge({ role }: Readonly<{ role: string }>) {
  const map: Record<string, { bg: string; color: string }> = {
    admin: { bg: "rgba(6, 182, 212,0.1)", color: "#06B6D4" },
    member: { bg: "#EFF6FF", color: "#1E40AF" },
    viewer: { bg: "#F0F0F8", color: "var(--text-secondary)" },
  };
  const s = map[role] ?? map.viewer;
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}

function SectionCard({
  title,
  children,
  action,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────
interface MembersSettingsProps {
  readonly onToast: (message: string) => void;
}

// ─── Component ───────────────────────────────────────────────────
export default function MembersSettings({ onToast }: MembersSettingsProps) {
  const members = useSettingsStore((s) => s.members);
  const addMember = useSettingsStore((s) => s.addMember);
  const updateMemberRole = useSettingsStore((s) => s.updateMemberRole);
  const removeMember = useSettingsStore((s) => s.removeMember);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleInvite = useCallback(
    (email: string, role: "member" | "viewer") => {
      const newMember: OrgMember = {
        id: `u${Date.now()}`,
        name: email.split("@")[0],
        email,
        role,
        status: "invited",
      };
      addMember(newMember);
      setInviteOpen(false);
      onToast(`Invite sent to ${email}`);
    },
    [addMember, onToast],
  );

  const handleRoleChange = useCallback(
    async (id: string, role: OrgMember["role"]) => {
      try {
        await updateMemberRole(id, role);
        onToast("Member role updated");
      } catch {
        onToast("Failed to update role");
      }
    },
    [updateMemberRole, onToast],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removeMember(id);
        setConfirmDeleteId(null);
        onToast("Member removed");
      } catch {
        onToast("Failed to remove member");
      }
    },
    [removeMember, onToast],
  );

  return (
    <div>
      <SectionCard
        title={`Members (${members.length})`}
        action={
          <button
            onClick={() => setInviteOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              background: "#06B6D4",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <Plus size={12} /> Invite
          </button>
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Member", "Email", "Role", "Joined", "Status", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 0",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                style={{ borderTop: "1px solid var(--content-border)" }}
              >
                {/* Name */}
                <td style={{ padding: "10px 0" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: `hsl(${((m.name.codePointAt(0) ?? 0) * 12) % 360}, 60%, 55%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.name}
                    </span>
                  </div>
                </td>

                {/* Email */}
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {m.email}
                </td>

                {/* Role */}
                <td style={{ padding: "10px 12px" }}>
                  {m.role === "admin" ? (
                    <RoleBadge role="admin" />
                  ) : (
                    <select aria-label="Select option"
                      value={m.role}
                      onChange={(e) =>
                        handleRoleChange(
                          m.id,
                          e.target.value as OrgMember["role"],
                        )
                      }
                      style={{
                        padding: "3px 8px",
                        borderRadius: 7,
                        border: "1px solid var(--input-border)",
                        background: "var(--content-bg)",
                        fontSize: 12,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                </td>

                {/* Joined */}
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {m.joinedAt
                    ? new Date(m.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "--"}
                </td>

                {/* Status */}
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      background: m.status === "active" ? "#F0FDF4" : "#FFFBEB",
                      color: m.status === "active" ? "#166534" : "#92400E",
                    }}
                  >
                    {m.status === "active" ? "Active" : "Invited"}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: "10px 0", textAlign: "right" }}>
                  {m.role !== "admin" &&
                    (confirmDeleteId === m.id ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => handleRemove(m.id)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: "none",
                            background: "#EF4444",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--input-border)",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 11,
                            color: "var(--text-secondary)",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button aria-label="Delete"
                        onClick={() => setConfirmDeleteId(m.id)}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 6,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "#EF4444";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "#A0A0B8";
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── Custom roles + permissions matrix ────────────────── */}
      <RolesMatrix onToast={onToast} />

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}

// ─── Custom roles + permissions matrix ─────────────────────────────
type Permission =
  | "issues.read"
  | "issues.write"
  | "docs.read"
  | "docs.write"
  | "orders.read"
  | "orders.write"
  | "billing.read"
  | "billing.write"
  | "members.invite"
  | "members.remove"
  | "settings.write"
  | "ai.use"
  | "audit.read"
  | "api.keys";

const PERM_GROUPS: Array<{ name: string; perms: Array<{ id: Permission; label: string }> }> = [
  {
    name: "Projects & Docs",
    perms: [
      { id: "issues.read", label: "View issues" },
      { id: "issues.write", label: "Create / edit issues" },
      { id: "docs.read", label: "View docs" },
      { id: "docs.write", label: "Create / edit docs" },
    ],
  },
  {
    name: "ERP & Finance",
    perms: [
      { id: "orders.read", label: "View orders" },
      { id: "orders.write", label: "Manage orders" },
      { id: "billing.read", label: "View billing" },
      { id: "billing.write", label: "Manage billing" },
    ],
  },
  {
    name: "Workspace",
    perms: [
      { id: "members.invite", label: "Invite members" },
      { id: "members.remove", label: "Remove members" },
      { id: "settings.write", label: "Edit workspace settings" },
      { id: "ai.use", label: "Use AI features" },
      { id: "audit.read", label: "View audit log" },
      { id: "api.keys", label: "Manage API keys" },
    ],
  },
];

interface RoleDef {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  perms: Set<Permission>;
}

const ALL_PERMS = new Set<Permission>(
  PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id)),
);

const DEFAULT_ROLES: RoleDef[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access to everything.",
    isBuiltin: true,
    perms: new Set(ALL_PERMS),
  },
  {
    id: "admin",
    name: "Admin",
    description: "Can manage members + workspace, but can't change billing.",
    isBuiltin: true,
    perms: new Set([
      "issues.read",
      "issues.write",
      "docs.read",
      "docs.write",
      "orders.read",
      "orders.write",
      "billing.read",
      "members.invite",
      "members.remove",
      "settings.write",
      "ai.use",
      "audit.read",
      "api.keys",
    ]),
  },
  {
    id: "member",
    name: "Member",
    description: "Day-to-day collaborator.",
    isBuiltin: true,
    perms: new Set([
      "issues.read",
      "issues.write",
      "docs.read",
      "docs.write",
      "orders.read",
      "ai.use",
    ]),
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access.",
    isBuiltin: true,
    perms: new Set([
      "issues.read",
      "docs.read",
      "orders.read",
      "billing.read",
    ]),
  },
];

function RolesMatrix({ onToast }: { onToast: (m: string) => void }) {
  const [roles, setRoles] = useState<RoleDef[]>(DEFAULT_ROLES);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  function togglePerm(roleId: string, perm: Permission) {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const next = new Set(r.perms);
        if (next.has(perm)) next.delete(perm);
        else next.add(perm);
        return { ...r, perms: next };
      }),
    );
  }

  function createRole() {
    if (!newRoleName.trim()) {
      onToast("Role needs a name");
      return;
    }
    setRoles((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        name: newRoleName,
        description: newRoleDesc || "Custom role",
        isBuiltin: false,
        perms: new Set([
          "issues.read",
          "docs.read",
          "ai.use",
        ]),
      },
    ]);
    onToast(`Role "${newRoleName}" created`);
    setCreating(false);
    setNewRoleName("");
    setNewRoleDesc("");
  }

  function removeRole(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    onToast("Role removed");
  }

  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Roles &amp; permissions
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Built-in roles cover most cases. Define custom roles for
            contractors, auditors, or vertical-specific access.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            borderRadius: 7,
            border: "none",
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={12} /> New role
        </button>
      </div>

      {creating && (
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid var(--content-border)",
            background: "rgba(6, 182, 212,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name (e.g. Auditor)"
              aria-label="Role name"
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <input
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              placeholder="Short description"
              aria-label="Description"
              style={{
                flex: 2,
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setCreating(false)}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createRole}
              style={{
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                background: "var(--vyne-purple)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Matrix */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--table-header-bg)",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  position: "sticky",
                  left: 0,
                  background: "var(--table-header-bg)",
                  minWidth: 220,
                }}
              >
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r.id}
                  style={{
                    padding: "10px 12px",
                    textAlign: "center",
                    minWidth: 110,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    {r.name}
                    {r.isBuiltin && (
                      <span
                        title="Built-in role"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "var(--content-secondary)",
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        builtin
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      marginTop: 1,
                      fontWeight: 400,
                    }}
                  >
                    {r.description}
                  </div>
                  {!r.isBuiltin && (
                    <button
                      type="button"
                      aria-label={`Delete role ${r.name}`}
                      onClick={() => removeRole(r.id)}
                      style={{
                        marginTop: 4,
                        padding: "1px 8px",
                        borderRadius: 5,
                        border: "1px solid var(--status-danger)",
                        background: "transparent",
                        color: "var(--status-danger)",
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERM_GROUPS.map((group) => (
              <RolesGroup
                key={group.name}
                group={group}
                roles={roles}
                onToggle={togglePerm}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesGroup({
  group,
  roles,
  onToggle,
}: {
  group: { name: string; perms: Array<{ id: Permission; label: string }> };
  roles: RoleDef[];
  onToggle: (roleId: string, perm: Permission) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={1 + roles.length}
          style={{
            padding: "8px 14px",
            background: "var(--content-secondary)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
          }}
        >
          {group.name}
        </td>
      </tr>
      {group.perms.map((perm) => (
        <tr
          key={perm.id}
          style={{
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <td
            style={{
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--text-primary)",
              position: "sticky",
              left: 0,
              background: "var(--content-bg)",
            }}
          >
            <div>{perm.label}</div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, monospace",
                marginTop: 1,
              }}
            >
              {perm.id}
            </div>
          </td>
          {roles.map((r) => {
            const has = r.perms.has(perm.id);
            const disabled = r.isBuiltin && r.id === "owner";
            const pressedValue: "true" | "false" = has ? "true" : "false";
            return (
              <td
                key={r.id}
                style={{
                  padding: 6,
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => !disabled && onToggle(r.id, perm.id)}
                  disabled={disabled}
                  aria-label={`${has ? "Remove" : "Grant"} ${perm.id} for ${r.name}`}
                  aria-pressed={pressedValue}
                  title={
                    disabled
                      ? "Owner has every permission by definition"
                      : has
                        ? "Granted — click to revoke"
                        : "Click to grant"
                  }
                  style={{
                    width: 28,
                    height: 22,
                    borderRadius: 5,
                    border: `1px solid ${has ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background: has
                      ? "rgba(6, 182, 212,0.15)"
                      : "var(--content-bg)",
                    color: has ? "var(--vyne-purple)" : "var(--text-tertiary)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  {has ? "✓" : ""}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
