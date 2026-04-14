"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import type { OrgMember } from "@/lib/stores/settings";
import InviteMemberModal from "./InviteMemberModal";

// ─── Helpers ─────────────────────────────────────────────────────
function RoleBadge({ role }: Readonly<{ role: string }>) {
  const map: Record<string, { bg: string; color: string }> = {
    admin: { bg: "rgba(108,71,255,0.1)", color: "#6C47FF" },
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
              background: "#6C47FF",
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

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
