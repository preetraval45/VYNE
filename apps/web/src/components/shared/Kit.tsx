"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/* ───────────────────────────────────────────────────────────────
 * VYNE design-system kit — small, opinionated primitives so every
 * page stops reinventing its own pill/header/empty-state visuals.
 *
 * Design intent:  muted, Linear/Notion/Vercel-adjacent. No candy
 * colors on badges. One tonal palette driven by semantic names,
 * not by raw hex values scattered across pages.
 * ─────────────────────────────────────────────────────────────── */

export type Tone =
  | "neutral"
  | "purple"
  | "success"
  | "warn"
  | "danger"
  | "info";

const TONE_TOKENS: Record<Tone, { fg: string; bg: string; ring: string }> = {
  neutral: {
    fg: "var(--text-secondary)",
    bg: "var(--content-secondary)",
    ring: "var(--content-border)",
  },
  purple: {
    fg: "#6C47FF",
    bg: "rgba(108, 71, 255, 0.08)",
    ring: "rgba(108, 71, 255, 0.22)",
  },
  success: {
    fg: "#059669",
    bg: "rgba(16, 185, 129, 0.08)",
    ring: "rgba(16, 185, 129, 0.22)",
  },
  warn: {
    fg: "#B45309",
    bg: "rgba(245, 158, 11, 0.10)",
    ring: "rgba(245, 158, 11, 0.25)",
  },
  danger: {
    fg: "#B91C1C",
    bg: "rgba(239, 68, 68, 0.08)",
    ring: "rgba(239, 68, 68, 0.22)",
  },
  info: {
    fg: "#1D4ED8",
    bg: "rgba(59, 130, 246, 0.08)",
    ring: "rgba(59, 130, 246, 0.22)",
  },
};

/* ─── Pill ────────────────────────────────────────────────────── */

export function Pill({
  children,
  tone = "neutral",
  dot = false,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  style?: CSSProperties;
}) {
  const t = TONE_TOKENS[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        height: 22,
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.ring}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: t.fg,
            opacity: 0.9,
          }}
        />
      )}
      {children}
    </span>
  );
}

/* ─── PageHeader ──────────────────────────────────────────────── */

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 24px",
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {icon && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.015em",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}

/* ─── Primary button (ties together "+ New X" CTAs) ───────────── */

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        height: 32,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        color: "#fff",
        background: "var(--vyne-purple)",
        textDecoration: "none",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--vyne-purple-light, #8B6BFF)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--vyne-purple)";
      }}
    >
      {children}
    </Link>
  );
}

/* ─── SectionTitle ────────────────────────────────────────────── */

export function SectionTitle({
  children,
  meta,
}: {
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        margin: "4px 0 10px",
      }}
    >
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
          margin: 0,
        }}
      >
        {children}
      </h2>
      {meta && (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{meta}</div>
      )}
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px",
        textAlign: "center",
      }}
    >
      {icon && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {body && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            maxWidth: 360,
            lineHeight: 1.55,
            marginTop: 6,
            marginBottom: action ? 18 : 0,
          }}
        >
          {body}
        </p>
      )}
      {action}
    </div>
  );
}

/* ─── Stat card (for dashboards) ─────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  const t = TONE_TOKENS[tone];
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12,
            color: t.fg,
            marginTop: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
