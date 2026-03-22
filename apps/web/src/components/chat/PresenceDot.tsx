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
        background: PRESENCE_COLORS[status ?? "offline"] ?? "#6B6B8A",
        border: "1.5px solid #FAFAFE",
      }}
    />
  );
}
