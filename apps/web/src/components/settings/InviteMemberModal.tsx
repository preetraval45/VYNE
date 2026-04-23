"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface InviteMemberModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onInvite: (email: string, role: "member" | "viewer") => void;
}

export default function InviteMemberModal({
  open,
  onClose,
  onInvite,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");

  if (!open) return null;

  function handleInvite() {
    if (!email) return;
    onInvite(email, role);
    setEmail("");
    setRole("member");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          borderRadius: 12,
          width: 400,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Invite Team Member
          </span>
          <button aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="invite-email"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Email Address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--input-border)",
              borderRadius: 8,
              background: "var(--content-secondary)",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="invite-role"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Role
          </label>
          <select aria-label="Select option"
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "viewer")}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--input-border)",
              borderRadius: 8,
              background: "var(--content-secondary)",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary)",
              boxSizing: "border-box",
            }}
          >
            <option value="member">Member &mdash; Can view &amp; edit</option>
            <option value="viewer">Viewer &mdash; Read only</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!email}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: email ? "#06B6D4" : "#E8E8F0",
              color: email ? "#fff" : "#A0A0B8",
              cursor: email ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
