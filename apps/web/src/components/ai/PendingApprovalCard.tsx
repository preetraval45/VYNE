"use client";

// Approval card for AI write tools (UI_UPGRADE_PLAN.md 5.3).
// Renders one card per pending ToolCall with Approve / Cancel buttons.
// The chat page passes its own onApprove + onCancel handlers so it can
// run the call through the live executor and render a result chip.

import { useState } from "react";
import { CheckCircle2, X, Edit3, Shield } from "lucide-react";
import {
  describeWriteCall,
  type ToolCall,
} from "@/lib/ai/toolExecutor";

export interface PendingApprovalCardProps {
  call: ToolCall;
  onApprove: (call: ToolCall) => void | Promise<void>;
  onCancel: () => void;
  /** Optional pre-edit step — opens a textarea where the user can tweak
   * the JSON args before approving. Disabled by default. */
  allowEdit?: boolean;
}

export function PendingApprovalCard({
  call,
  onApprove,
  onCancel,
  allowEdit = true,
}: PendingApprovalCardProps) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [argsJson, setArgsJson] = useState(() =>
    JSON.stringify(call.args, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const desc = describeWriteCall(call);

  async function handleApprove() {
    let finalCall: ToolCall = call;
    if (editing) {
      try {
        const parsed = JSON.parse(argsJson) as Record<string, unknown>;
        finalCall = { ...call, args: parsed };
        setParseError(null);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Invalid JSON",
        );
        return;
      }
    }
    setBusy(true);
    try {
      await onApprove(finalCall);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="region"
      aria-label={`Approve ${call.tool}`}
      style={{
        border: "1px solid var(--vyne-accent, var(--vyne-purple))",
        borderRadius: 10,
        padding: 12,
        margin: "8px 0",
        background: "var(--content-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Shield
          size={14}
          aria-hidden="true"
          color="var(--vyne-accent, var(--vyne-purple))"
        />
        <strong style={{ fontSize: 13 }}>Approve write</strong>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {call.tool}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
          {desc.title}
        </div>
        {desc.detail && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {desc.detail}
          </div>
        )}
      </div>

      {call.rationale && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            fontStyle: "italic",
          }}
        >
          {call.rationale}
        </div>
      )}

      {editing && (
        <>
          <textarea
            value={argsJson}
            onChange={(e) => {
              setArgsJson(e.target.value);
              setParseError(null);
            }}
            rows={Math.min(12, argsJson.split("\n").length + 1)}
            spellCheck={false}
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 12,
              padding: 8,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              resize: "vertical",
            }}
          />
          {parseError && (
            <div style={{ fontSize: 12, color: "var(--accent-error)" }}>
              {parseError}
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={handleApprove}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <CheckCircle2 size={13} />
          {busy ? "Running…" : "Approve"}
        </button>
        {allowEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              fontSize: 12,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <Edit3 size={13} />
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            fontSize: 12,
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
}
