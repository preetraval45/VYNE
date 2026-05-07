"use client";

import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

/**
 * AiConfidenceBadge — colour-coded confidence chip rendered next to
 * any AI-generated answer.
 *
 *   <AiConfidenceBadge score={0.82} />
 *
 * Mapping:
 *   ≥ 0.75 → High   (green ShieldCheck)
 *   ≥ 0.40 → Medium (amber ShieldAlert)
 *   < 0.40 → Low    (red   ShieldX, "verify before using")
 *
 * Score sources (caller's choice — the badge is presentation-only):
 *   - logprobs / perplexity from the model
 *   - tool-call success ratio (1.0 if every tool returned data)
 *   - retrieval coverage % (how many sources back the answer)
 *   - heuristic blend
 *
 * `verifyHint` flips on automatically below the medium threshold so
 * the user always sees the safety prompt for low-confidence replies.
 */

export interface AiConfidenceBadgeProps {
  /** 0..1 inclusive. Values outside the range get clamped. */
  score: number;
  /** Tooltip body. Default: a one-liner explaining the level. */
  reason?: string;
  /** Hide the "Verify before using" tail on low-confidence chips. */
  hideVerifyHint?: boolean;
  /** Compact 2-letter mode (HI / MD / LO) for table rows. */
  compact?: boolean;
}

export function AiConfidenceBadge({
  score,
  reason,
  hideVerifyHint = false,
  compact = false,
}: AiConfidenceBadgeProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const level: "high" | "medium" | "low" =
    clamped >= 0.75 ? "high" : clamped >= 0.4 ? "medium" : "low";
  const palette =
    level === "high"
      ? {
          bg: "rgba(34, 197, 94, 0.10)",
          border: "rgba(34, 197, 94, 0.45)",
          color: "#16A34A",
          Icon: ShieldCheck,
          label: "High confidence",
          short: "HI",
        }
      : level === "medium"
        ? {
            bg: "rgba(245, 158, 11, 0.12)",
            border: "rgba(245, 158, 11, 0.50)",
            color: "#D97706",
            Icon: ShieldAlert,
            label: "Medium confidence",
            short: "MD",
          }
        : {
            bg: "rgba(239, 68, 68, 0.10)",
            border: "rgba(239, 68, 68, 0.50)",
            color: "#DC2626",
            Icon: ShieldX,
            label: "Low confidence — verify",
            short: "LO",
          };

  const tooltip = reason ?? `${palette.label} · ${Math.round(clamped * 100)}%`;
  const showVerifyHint = level === "low" && !hideVerifyHint;

  return (
    <span
      role="status"
      aria-label={`${palette.label}, ${Math.round(clamped * 100)} percent`}
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: compact ? "1px 6px" : "2px 9px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      <palette.Icon size={compact ? 9 : 10} />
      {compact ? palette.short : palette.label}
      {!compact && (
        <span
          style={{
            opacity: 0.75,
            fontWeight: 600,
            marginLeft: 2,
          }}
        >
          {Math.round(clamped * 100)}%
        </span>
      )}
      {showVerifyHint && !compact && (
        <span
          style={{
            opacity: 0.85,
            fontWeight: 500,
            marginLeft: 2,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          · verify
        </span>
      )}
    </span>
  );
}
