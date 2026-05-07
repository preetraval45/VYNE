"use client";

import type { Typer } from "@/hooks/useTypingIndicator";

interface Props {
  typers: Typer[];
  size?: "sm" | "md";
}

/**
 * TypingIndicator — renders "Sarah is typing…" / "Sarah and Tony are
 * typing…" / "3 people are typing…" with three bouncing dots.
 *
 *   const { typers, onChange, onSubmit } = useTypingIndicator(scope);
 *   <TypingIndicator typers={typers} />
 */
export function TypingIndicator({ typers, size = "sm" }: Props) {
  if (typers.length === 0) return null;

  const label =
    typers.length === 1
      ? `${typers[0].name} is typing`
      : typers.length === 2
        ? `${typers[0].name} and ${typers[1].name} are typing`
        : `${typers.length} people are typing`;

  const fontSize = size === "md" ? 12 : 11;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize,
        color: "var(--text-tertiary)",
        fontStyle: "italic",
        lineHeight: 1.2,
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </span>
      <span>{label}…</span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.6,
        animation: "vyne-typing-bounce 1.1s ease-in-out infinite",
        animationDelay: delay,
        display: "inline-block",
      }}
    />
  );
}
