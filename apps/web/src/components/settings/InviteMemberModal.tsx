"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Link2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface InviteMemberModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onInvite: (email: string, role: "member" | "viewer") => void;
}

// Until the email-delivery backend is wired up, an invite link the user
// can paste into Slack / email / wherever is the only honest fallback.
// We generate a throwaway token so links look real, but the "accept"
// flow is still unimplemented — that's fine as long as the link gives
// teammates something to hold onto before the real backend lands.
function generateInviteToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export default function InviteMemberModal({
  open,
  onClose,
  onInvite,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);

  // Regenerate token each time the modal opens so closed invites don't
  // leak across sessions. We hold it in state so the visible URL in the
  // copy field stays stable while the modal is open.
  const inviteToken = useMemo(() => generateInviteToken(), [open]);
  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${inviteToken}?role=${role}`
      : `https://vyne.app/invite/${inviteToken}?role=${role}`;

  if (!open) return null;

  function handleInvite() {
    if (!email) return;
    onInvite(email, role);
    setEmail("");
    setRole("member");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied — paste it anywhere");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the link and copy manually");
    }
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Invite team member"
        tabIndex={-1}
        style={{
          background: "var(--content-bg)",
          borderRadius: 12,
          width: 440,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          outline: "none",
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
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Invite Team Member
          </span>
          <button
            type="button"
            aria-label="Close"
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
        <div style={{ marginBottom: 18 }}>
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
          <select
            aria-label="Select option"
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

        {/* Share-link fallback */}
        <div
          style={{
            marginBottom: 20,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--content-secondary)",
            border: "1px dashed var(--content-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Link2 size={12} /> Or share a link
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              readOnly
              aria-label="Invite link"
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                padding: "7px 10px",
                border: "1px solid var(--input-border)",
                borderRadius: 8,
                background: "var(--content-bg)",
                outline: "none",
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                boxSizing: "border-box",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy invite link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--vyne-teal-border)",
                background: copied
                  ? "var(--vyne-teal)"
                  : "var(--vyne-teal-soft)",
                color: copied ? "#fff" : "var(--vyne-teal)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 10.5,
              color: "var(--text-tertiary)",
              lineHeight: 1.45,
            }}
          >
            Paste this link into email, Slack, or anywhere else. No email server
            needed — whoever receives it clicks to join.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
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
            type="button"
            onClick={handleInvite}
            disabled={!email}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: email ? "var(--vyne-accent, #06B6D4)" : "var(--content-border)",
              color: email ? "#fff" : "var(--text-tertiary)",
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
