"use client";

import type { ReactNode } from "react";

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warn" | "danger" | "teal";
  icon?: ReactNode;
}

const TONE_MAP = {
  default: { fg: "var(--text-primary)", accent: "var(--vyne-teal)" },
  success: { fg: "var(--status-success)", accent: "var(--status-success)" },
  warn: { fg: "var(--status-warning)", accent: "var(--status-warning)" },
  danger: { fg: "var(--status-danger)", accent: "var(--status-danger)" },
  teal: { fg: "var(--vyne-teal)", accent: "var(--vyne-teal)" },
};

export function ProjectsStatsStrip({ items }: { items: StatItem[] }) {
  return (
    <div
      role="group"
      aria-label="Module stats"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))`,
        gap: 10,
        padding: "14px 20px 0",
      }}
    >
      {items.map((s) => {
        const t = TONE_MAP[s.tone ?? "default"];
        return (
          <article
            key={s.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "12px 14px",
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              boxShadow: "var(--elev-1)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 3,
                height: "100%",
                background: t.accent,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              <span>{s.label}</span>
              {s.icon && <span style={{ color: t.accent }}>{s.icon}</span>}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: t.fg,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
            {s.hint && (
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{s.hint}</div>
            )}
          </article>
        );
      })}
    </div>
  );
}
