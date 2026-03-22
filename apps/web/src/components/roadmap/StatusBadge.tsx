"use client";

import { STATUS_CONFIG, type RoadmapStatus } from "./roadmapData";

interface StatusBadgeProps {
  readonly status: RoadmapStatus;
  readonly size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const s = STATUS_CONFIG[status];
  const fontSize = size === "sm" ? 11 : 12;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding,
        borderRadius: 20,
        fontSize,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.borderColor}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}
