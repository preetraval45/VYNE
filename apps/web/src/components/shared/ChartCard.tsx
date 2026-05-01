"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Top-right slot for filters / legend / actions */
  actions?: ReactNode;
  /** Show a small "vs prev" delta in the header */
  delta?: { value: string; positive?: boolean };
  /** Allow collapsing the chart body */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Min height of the chart body so layouts don't jump */
  minHeight?: number;
  children: ReactNode;
  /** Optional click-through (e.g., open full report) */
  onTitleClick?: () => void;
  style?: CSSProperties;
}

export function ChartCard({
  title,
  subtitle,
  actions,
  delta,
  collapsible = false,
  defaultCollapsed = false,
  minHeight = 220,
  children,
  onTitleClick,
  style,
}: ChartCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderBottom: collapsed ? "none" : "1px solid var(--content-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {collapsible && (
            <button
              type="button"
              aria-label={collapsed ? "Expand" : "Collapse"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((c) => !c)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h3
              onClick={onTitleClick}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                margin: 0,
                cursor: onTitleClick ? "pointer" : "default",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
              {delta && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: delta.positive ? "#0F9D58" : "#B91C1C",
                  }}
                >
                  {delta.value}
                </span>
              )}
            </h3>
            {subtitle && (
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </header>

      {!collapsed && (
        <div style={{ padding: 14, minHeight, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      )}
    </section>
  );
}
