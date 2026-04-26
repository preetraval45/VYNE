"use client";

import { PRESENCE_COLORS } from "./constants";

interface PresenceDotProps {
  readonly status?: string;
}

export function PresenceDot({ status }: PresenceDotProps) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        background:
          PRESENCE_COLORS[status ?? "offline"] ?? "var(--text-secondary)",
        border: "1.5px solid var(--content-bg-secondary)",
      }}
    />
  );
}
