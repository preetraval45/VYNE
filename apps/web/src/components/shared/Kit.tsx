"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

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
    // Darker teal foreground on teal-soft bg meets WCAG AA (≥4.5:1)
    // against the pill background in both light and dark themes.
    fg: "#0E7490",
    bg: "rgba(6, 182, 212, 0.10)",
    ring: "rgba(6, 182, 212, 0.28)",
  },
  success: {
    fg: "#0F9D58",
    bg: "rgba(15, 157, 88, 0.07)",
    ring: "rgba(15, 157, 88, 0.18)",
  },
  warn: {
    fg: "#C2410C",
    bg: "rgba(217, 119, 6, 0.08)",
    ring: "rgba(217, 119, 6, 0.22)",
  },
  danger: {
    fg: "#B91C1C",
    bg: "rgba(220, 38, 38, 0.07)",
    ring: "rgba(220, 38, 38, 0.18)",
  },
  info: {
    fg: "#1E40AF",
    bg: "rgba(37, 99, 235, 0.07)",
    ring: "rgba(37, 99, 235, 0.18)",
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
        padding: "0 12px",
        height: 30,
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: "#fff",
        background: "var(--vyne-purple)",
        textDecoration: "none",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 0 rgba(16,24,40,0.08)",
        border: "1px solid rgba(67,65,184,0.6)",
        transition: "background 0.12s, transform 0.08s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--vyne-purple-dark, #4341B8)";
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
      role="status"
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
          aria-hidden="true"
          style={{
            position: "relative",
            width: 72,
            height: 72,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            background:
              "radial-gradient(circle at 50% 40%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0.04) 70%, transparent)",
            color: "var(--vyne-teal)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              border: "1px dashed rgba(6, 182, 212, 0.35)",
            }}
          />
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.015em",
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

/* ─── Board primitives (Odoo/Trello-style kanban) ─────────────── */

export function Board({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "4px 4px 24px",
        overflowX: "auto",
        alignItems: "flex-start",
        minHeight: "100%",
      }}
    >
      {children}
    </div>
  );
}

export function BoardColumn({
  title,
  count,
  accent = "neutral",
  progress,
  // onAdd / addHref kept for backwards compat with existing call sites
  // but the per-column "+" affordance was removed by request — column
  // headers stay clean; users add via the page-level "New" CTA.
  onDropItem,
  children,
}: {
  title: string;
  count?: number;
  accent?: Tone;
  /** 0–1 fraction filled in the slim bar under the header */
  progress?: number;
  onAdd?: () => void;
  addHref?: string;
  /** Called with the dragged item id when something is dropped on this column */
  onDropItem?: (itemId: string) => void;
  children: ReactNode;
}) {
  const t = TONE_TOKENS[accent];
  const dropHandlers = onDropItem
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          e.currentTarget.setAttribute("data-drag-over", "true");
        },
        onDragLeave: (e: React.DragEvent) => {
          e.currentTarget.removeAttribute("data-drag-over");
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.currentTarget.removeAttribute("data-drag-over");
          const id = e.dataTransfer.getData("text/kit-item-id");
          if (id) onDropItem(id);
        },
      }
    : {};

  return (
    <div
      {...dropHandlers}
      style={{
        flex: "0 0 280px",
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 4,
        borderRadius: 12,
        transition: "background 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ padding: "0 6px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h3>
          {typeof count === "number" && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-tertiary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </span>
          )}
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--content-secondary)",
            overflow: "hidden",
          }}
        >
          {typeof progress === "number" && progress > 0 && (
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                background: t.fg,
                transition: "width 0.4s var(--ease-out-quart)",
              }}
            />
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

export function BoardCard({
  title,
  starred,
  onStar,
  dateRange,
  tag,
  footer,
  onClick,
  href,
  dragId,
}: {
  title: ReactNode;
  starred?: boolean;
  onStar?: () => void;
  dateRange?: { from: string; to: string };
  tag?: { label: string; tone?: Tone };
  footer?: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Set to make the card draggable; value is passed to the column's onDropItem */
  dragId?: string;
}) {
  const dragProps = dragId
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          e.dataTransfer.setData("text/kit-item-id", dragId);
          e.dataTransfer.effectAllowed = "move";
        },
      }
    : {};
  const inner = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: dateRange || tag ? 8 : 10,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar?.();
          }}
          aria-label={starred ? "Unstar" : "Star"}
          style={{
            width: 18,
            height: 18,
            border: "none",
            background: "transparent",
            cursor: onStar ? "pointer" : "default",
            padding: 0,
            color: starred ? "#F5A623" : "var(--text-tertiary)",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={starred ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {title}
        </div>
      </div>
      {dateRange && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <Clock size={11} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {dateRange.from}
          </span>
          <span aria-hidden="true" style={{ opacity: 0.6 }}>→</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {dateRange.to}
          </span>
        </div>
      )}
      {tag && (
        <div style={{ marginBottom: 10 }}>
          <Pill tone={tag.tone ?? "success"}>{tag.label}</Pill>
        </div>
      )}
      {footer && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 6,
          }}
        >
          {footer}
        </div>
      )}
    </>
  );

  const cardStyle: CSSProperties = {
    display: "block",
    background: "var(--content-bg)",
    border: "1px solid var(--content-border)",
    borderRadius: 12,
    padding: "12px 14px",
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
    cursor: onClick || href ? "pointer" : "default",
    textDecoration: "none",
    color: "inherit",
    transition:
      "box-shadow 0.15s var(--ease-out-quart), transform 0.15s var(--ease-out-quart), border-color 0.15s",
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.boxShadow = "0 6px 20px rgba(16, 24, 40, 0.08)";
    el.style.transform = "translateY(-1px)";
    el.style.borderColor = "var(--text-tertiary)";
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.boxShadow = "0 1px 2px rgba(16, 24, 40, 0.04)";
    el.style.transform = "translateY(0)";
    el.style.borderColor = "var(--content-border)";
  };

  // Draggable cards can't use a Next <Link> — anchors have native drag
  // behavior that hijacks `dataTransfer` (dragging the URL instead of the
  // card). When dragId is set we render a div and navigate via router on
  // click, preserving both behaviors.
  if (href && !dragId) {
    return (
      <Link href={href} style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {inner}
      </Link>
    );
  }

  return (
    <DraggableCardShell
      cardStyle={cardStyle}
      onEnter={onEnter}
      onLeave={onLeave}
      onClick={onClick}
      href={href}
      dragProps={dragProps}
    >
      {inner}
    </DraggableCardShell>
  );
}

function DraggableCardShell({
  cardStyle,
  onEnter,
  onLeave,
  onClick,
  href,
  dragProps,
  children,
}: {
  cardStyle: CSSProperties;
  onEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onLeave: (e: React.MouseEvent<HTMLElement>) => void;
  onClick?: () => void;
  href?: string;
  dragProps: Record<string, unknown>;
  children: ReactNode;
}) {
  const router = useRouter();
  const activate = onClick ?? (href ? () => router.push(href) : undefined);
  return (
    <div
      {...dragProps}
      role={activate ? "button" : undefined}
      tabIndex={activate ? 0 : undefined}
      onClick={activate}
      onKeyDown={(e) => {
        if (activate && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          activate();
        }
      }}
      style={cardStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

/* ─── View toggle (kanban / list) ────────────────────────────── */

export function ViewToggle<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (v: V) => void;
  options: ReadonlyArray<{ value: V; label: string; icon: ReactNode }>;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: 10,
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 26,
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              background: active ? "var(--content-bg)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: active ? "0 1px 2px rgba(16,24,40,0.06)" : "none",
            }}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}

/* ─── PipelineBreadcrumb ───────────────────────────────────────
 * Odoo-style clickable arrow-chevron stages for record detail pages.
 * Reusable across Projects, Maintenance, CRM, MRP, HR, etc.
 * Click a stage to advance the record; supports a subtle meta label
 * per-stage ("24d", "1M") to show time-in-stage.
 * ─────────────────────────────────────────────────────────────── */

export interface PipelineStage {
  id: string;
  label: string;
  meta?: string;
  tone?: Tone;
}

export function PipelineBreadcrumb({
  stages,
  activeId,
  onSelect,
}: {
  stages: PipelineStage[];
  activeId: string;
  onSelect?: (id: string) => void;
}) {
  const activeIdx = Math.max(0, stages.findIndex((s) => s.id === activeId));

  return (
    <nav
      aria-label="Record pipeline"
      style={{
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
        scrollbarWidth: "thin",
        gap: 0,
        padding: "8px 0",
      }}
    >
      {stages.map((stage, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        const isFuture = i > activeIdx;
        const t = stage.tone ? TONE_TOKENS[stage.tone] : TONE_TOKENS.purple;

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect?.(stage.id)}
            aria-current={isActive ? "step" : undefined}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 22px 9px 26px",
              marginLeft: i === 0 ? 0 : -12,
              minHeight: 36,
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 500,
              letterSpacing: "-0.005em",
              color: isActive
                ? "#fff"
                : isPast
                  ? t.fg
                  : "var(--text-tertiary)",
              background: isActive
                ? "var(--vyne-teal)"
                : isPast
                  ? t.bg
                  : "var(--content-secondary)",
              border: `1px solid ${
                isActive
                  ? "var(--vyne-teal)"
                  : isPast
                    ? t.ring
                    : "var(--content-border)"
              }`,
              cursor: onSelect ? "pointer" : "default",
              transition: "all 0.15s var(--ease-out-quart)",
              // chevron shape
              clipPath:
                i === 0
                  ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                  : i === stages.length - 1
                    ? "polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)"
                    : "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)",
              whiteSpace: "nowrap",
              zIndex: isActive ? 2 : isPast ? 1 : 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive && onSelect) {
                (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.filter = "";
            }}
          >
            <span>{stage.label}</span>
            {stage.meta && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  opacity: 0.7,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stage.meta}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── ModuleRecordHeader ─────────────────────────────────────── */

export function ModuleRecordHeader({
  breadcrumbs,
  title,
  subtitle,
  tabs,
  activeTabId,
  onTabChange,
  stages,
  activeStageId,
  onStageChange,
  actions,
}: {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title: string;
  subtitle?: string;
  tabs?: Array<{ id: string; label: string; count?: number | string }>;
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  stages?: PipelineStage[];
  activeStageId?: string;
  onStageChange?: (id: string) => void;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 24px 0",
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {b.href ? (
                <Link href={b.href} style={{ color: "var(--text-secondary)" }}>
                  {b.label}
                </Link>
              ) : (
                <span>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span style={{ opacity: 0.5 }}>/</span>}
            </span>
          ))}
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "4px 0 0", letterSpacing: "-0.005em" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {tabs.map((t) => {
            const active = t.id === activeTabId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange?.(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                  color: active ? "var(--vyne-teal)" : "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "2px solid var(--vyne-teal)" : "2px solid transparent",
                  marginBottom: -1,
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {t.label}
                {t.count !== undefined && t.count !== null && t.count !== "" && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: active ? "var(--vyne-teal)" : "var(--text-tertiary)",
                      background: active ? "rgba(6,182,212,0.12)" : "var(--content-secondary)",
                      padding: "2px 7px",
                      borderRadius: 999,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {stages && stages.length > 0 && activeStageId && (
        <PipelineBreadcrumb
          stages={stages}
          activeId={activeStageId}
          onSelect={onStageChange}
        />
      )}
    </header>
  );
}
