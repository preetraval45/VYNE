"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  TIME_RANGE_LABELS,
  TIME_RANGE_OPTIONS,
  type TimeRange,
} from "@/hooks/usePageDashboard";
import { KpiTile, type KpiTileProps } from "./KpiTile";

export interface PageDashboardProps {
  /** Stable id for localStorage (collapsed state, etc.) */
  storageKey: string;
  kpis: KpiTileProps[];
  /** Primary chart slot (60% width on desktop) */
  primaryChart?: ReactNode;
  /** Secondary chart slot (40% width on desktop). Omit for full-width primary. */
  secondaryChart?: ReactNode;
  /** Time-range filter — wire to usePageDashboard() in parent */
  range?: TimeRange;
  onRangeChange?: (next: TimeRange) => void;
  /** Extra controls in the top-right (e.g. filter chips) */
  toolbar?: ReactNode;
  /** Default-collapsed state of the entire dashboard */
  defaultCollapsed?: boolean;
  /** When true, hides the dashboard entirely (e.g., empty state) */
  hidden?: boolean;
  /** Render shimmer skeletons for KPI tiles while data is loading */
  loading?: boolean;
  style?: CSSProperties;
}

function KpiTileSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        minHeight: 96,
      }}
    >
      <div
        style={{
          width: 60,
          height: 8,
          borderRadius: 3,
          background: "var(--content-secondary)",
        }}
      />
      <div
        style={{
          width: "70%",
          height: 22,
          borderRadius: 4,
          background: "var(--content-secondary)",
          marginTop: 4,
        }}
      />
      <div
        style={{
          width: 100,
          height: 6,
          borderRadius: 3,
          background: "var(--content-secondary)",
        }}
      />
    </div>
  );
}

const COLLAPSE_KEY_PREFIX = "vyne-dash-collapsed:";

export function PageDashboard({
  storageKey,
  kpis,
  primaryChart,
  secondaryChart,
  range,
  onRangeChange,
  toolbar,
  defaultCollapsed = false,
  hidden = false,
  loading = false,
  style,
}: PageDashboardProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    try {
      const saved = window.localStorage.getItem(
        `${COLLAPSE_KEY_PREFIX}${storageKey}`,
      );
      if (saved === "1") return true;
      if (saved === "0") return false;
    } catch {
      // ignore
    }
    return defaultCollapsed;
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          `${COLLAPSE_KEY_PREFIX}${storageKey}`,
          next ? "1" : "0",
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (hidden) return null;

  const hasCharts = Boolean(primaryChart || secondaryChart);

  return (
    <section
      aria-label="Page dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 24px 18px",
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Show dashboard" : "Hide dashboard"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px 4px 8px",
              borderRadius: 7,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            Overview
          </button>
        </div>

        {/* Right cluster (filters + range) controls the KPI body — hide it
            when collapsed so it doesn't float orphaned with no context. */}
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {toolbar}
            {range && onRangeChange && (
              <TimeRangeSelect value={range} onChange={onRangeChange} />
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {loading && kpis.length === 0 && (
            <div
              role="status"
              aria-busy="true"
              aria-live="polite"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
                gap: 10,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiTileSkeleton key={i} />
              ))}
            </div>
          )}

          {kpis.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
                gap: 10,
              }}
            >
              {kpis.map((kpi, i) => (
                <KpiTile key={`${kpi.label}-${i}`} {...kpi} />
              ))}
            </div>
          )}

          {hasCharts && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: secondaryChart
                  ? "minmax(0, 3fr) minmax(0, 2fr)"
                  : "1fr",
                gap: 10,
              }}
            >
              {primaryChart && (
                <div style={{ minWidth: 0 }}>{primaryChart}</div>
              )}
              {secondaryChart && (
                <div style={{ minWidth: 0 }}>{secondaryChart}</div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TimeRangeSelect({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: "var(--text-tertiary)",
      }}
    >
      <span style={{ fontWeight: 500 }}>Range</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TimeRange)}
        style={{
          padding: "4px 8px",
          borderRadius: 7,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {TIME_RANGE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {TIME_RANGE_LABELS[opt]}
          </option>
        ))}
      </select>
    </label>
  );
}
