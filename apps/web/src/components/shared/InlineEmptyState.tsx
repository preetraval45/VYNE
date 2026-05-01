"use client";

import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  /** Use compact spacing for inline placements (sidebars, cards). */
  compact?: boolean;
}

/** Smaller sibling of `<EmptyState />` from `Kit.tsx`. Used inside dashboard
 *  cards (deal coach, dunning ladder, etc.) where the surrounding card already
 *  carries the visual weight, so a 240px hero illustration would feel out of
 *  place. Renders a quiet message + optional action chip. */
export function InlineEmptyState({ icon, title, body, action, compact }: Props) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "14px 16px" : "22px 18px",
        gap: 6,
        color: "var(--text-tertiary)",
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--content-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
            marginBottom: 2,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{title}</div>
      {body && <div style={{ fontSize: 11.5, lineHeight: 1.5, maxWidth: 280 }}>{body}</div>}
      {action}
    </div>
  );
}
