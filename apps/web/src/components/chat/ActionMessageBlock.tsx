"use client";

// Inline action message renderer (UI_UPGRADE_PLAN.md 6.2).
//
// Mounts where the chat layer detects [[action:{id}]] in a message
// body. Resolves the block via useChatActions, renders the buttons,
// fires the registered ToolCall on click, and reports status back into
// the store.

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import {
  useChatActions,
  type ActionBlock,
  type ActionVariant,
} from "@/lib/stores/chatActions";
import { executeToolCall } from "@/lib/ai/toolExecutor";
import toast from "react-hot-toast";

const VARIANT_BG: Record<ActionVariant, string> = {
  primary: "var(--vyne-accent, var(--vyne-purple))",
  danger: "var(--accent-error)",
  neutral: "var(--content-elevated)",
};

const VARIANT_FG: Record<ActionVariant, string> = {
  primary: "#fff",
  danger: "#fff",
  neutral: "var(--text-primary)",
};

interface Props {
  blockId: string;
  /** Current user id — fed to resolveBlock + role-gating. */
  actorId?: string;
  actorName?: string;
  actorRole?: "owner" | "admin" | "member" | "guest";
}

export function ActionMessageBlock({
  blockId,
  actorId,
  actorName,
  actorRole,
}: Props) {
  const block = useChatActions((s) =>
    s.blocks.find((b) => b.id === blockId),
  );
  const resolveBlock = useChatActions((s) => s.resolveBlock);
  const [busy, setBusy] = useState<string | null>(null);

  if (!block) return null;

  async function click(buttonId: string) {
    if (!block) return;
    if (block.status !== "pending") return;
    const button = block.buttons.find((b) => b.id === buttonId);
    if (!button) return;
    if (
      button.requiresRole &&
      button.requiresRole !== "any" &&
      actorRole !== "owner" &&
      actorRole !== button.requiresRole
    ) {
      toast.error(`Only ${button.requiresRole}s can ${button.label.toLowerCase()}.`);
      return;
    }
    if (button.confirm && !confirm(button.confirm)) return;
    setBusy(buttonId);
    try {
      const result = await executeToolCall(button.call);
      if (result.ok) {
        resolveBlock(
          block.id,
          buttonId,
          { id: actorId, name: actorName },
          button.variant === "danger" ? "rejected" : "approved",
        );
        toast.success(result.label || `${button.label} ✓`);
      } else {
        resolveBlock(block.id, buttonId, { id: actorId, name: actorName }, "failed");
        toast.error(result.detail ?? "Action failed");
      }
    } catch (err) {
      resolveBlock(block.id, buttonId, { id: actorId, name: actorName }, "failed");
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const resolved = block.status !== "pending";
  const StatusIcon =
    block.status === "approved"
      ? CheckCircle2
      : block.status === "rejected"
        ? XCircle
        : block.status === "failed"
          ? XCircle
          : Shield;

  return (
    <div
      role="region"
      aria-label="Action required"
      style={{
        marginTop: 6,
        padding: "10px 12px",
        background: "var(--content-elevated)",
        border: `1px solid ${
          resolved
            ? "var(--content-border)"
            : "var(--vyne-accent, var(--vyne-purple))"
        }`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <StatusIcon
          size={13}
          aria-hidden="true"
          color={
            block.status === "approved"
              ? "var(--accent-success)"
              : block.status === "rejected" || block.status === "failed"
                ? "var(--accent-error)"
                : "var(--vyne-accent, var(--vyne-purple))"
          }
        />
        {block.title}
      </div>
      {block.context && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {block.context}
        </p>
      )}
      {!resolved && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {block.buttons.map((b) => {
            const variant = b.variant ?? "primary";
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => void click(b.id)}
                disabled={busy !== null}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${VARIANT_BG[variant]}`,
                  borderRadius: 6,
                  background: VARIANT_BG[variant],
                  color: VARIANT_FG[variant],
                  cursor: busy === null ? "pointer" : "wait",
                  opacity: busy === null || busy === b.id ? 1 : 0.5,
                }}
              >
                {busy === b.id && <Loader2 size={11} className="animate-spin" />}
                {b.label}
              </button>
            );
          })}
        </div>
      )}
      {resolved && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {block.status === "approved" && "Approved"}
          {block.status === "rejected" && "Rejected"}
          {block.status === "failed" && "Failed"}
          {block.resolvedBy ? ` by ${block.resolvedBy}` : ""}
          {block.resolvedAt
            ? ` · ${new Date(block.resolvedAt).toLocaleTimeString()}`
            : ""}
        </div>
      )}
    </div>
  );
}
