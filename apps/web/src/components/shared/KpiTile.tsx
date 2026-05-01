"use client";

import type { CSSProperties, ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KpiTrend = "up" | "down" | "flat";

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  /** Sparkline data points (any numeric range; auto-normalized) */
  sparkline?: number[];
  /** e.g. "+12%" or "-3.2%" — colored by trend */
  delta?: string;
  trend?: KpiTrend;
  /** Optional sub-line under the value, e.g. "vs last 7d" */
  hint?: string;
  /** Higher trend better? (false flips colors, e.g. error rate) */
  goodWhenUp?: boolean;
  /** Click handler — if set, tile becomes a button */
  onClick?: () => void;
  /** Optional accent color override (defaults to vyne-teal) */
  accentColor?: string;
}

function inferTrend(sparkline?: number[], explicit?: KpiTrend): KpiTrend {
  if (explicit) return explicit;
  if (!sparkline || sparkline.length < 2) return "flat";
  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  const delta = last - first;
  const eps = Math.max(Math.abs(first), 0.0001) * 0.02;
  if (delta > eps) return "up";
  if (delta < -eps) return "down";
  return "flat";
}

function trendColor(trend: KpiTrend, goodWhenUp: boolean, accent: string): string {
  if (trend === "flat") return "var(--text-tertiary)";
  const isPositive = goodWhenUp ? trend === "up" : trend === "down";
  if (isPositive) return "#0F9D58";
  return "#B91C1C";
}

function Sparkline({
  data,
  color,
  width = 96,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;

  const gradId = `spark-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2}
        fill={color}
      />
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  sparkline,
  delta,
  trend: trendProp,
  hint,
  goodWhenUp = true,
  onClick,
  accentColor = "var(--vyne-teal)",
}: KpiTileProps) {
  const trend = inferTrend(sparkline, trendProp);
  const color = trendColor(trend, goodWhenUp, accentColor);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const Tag = onClick ? "button" : "div";

  const baseStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 14px",
    borderRadius: 12,
    background: "var(--content-bg)",
    border: "1px solid var(--content-border)",
    textAlign: "left",
    width: "100%",
    cursor: onClick ? "pointer" : "default",
    transition: "border-color 0.15s, transform 0.08s",
    minHeight: 96,
  };

  // Phase 6.7 a11y — concatenate label + value + delta into a single aria-label
  // so screen readers announce the tile in one pass instead of fragmenting it
  // into "Revenue", "$120k", "+12%". Keeps role="group" on non-button tiles.
  const ariaLabel = [
    label,
    typeof value === "string" || typeof value === "number" ? String(value) : null,
    delta ? `${delta} ${trend === "up" ? "up" : trend === "down" ? "down" : "flat"}` : null,
    hint,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      role={onClick ? undefined : "group"}
      aria-label={ariaLabel}
      className="vyne-kpi-tile"
      style={baseStyle}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = "var(--text-tertiary)";
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = "var(--content-border)";
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

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <div style={{ flexShrink: 0 }}>
            <Sparkline data={sparkline} color={color} />
          </div>
        )}
      </div>

      {(delta || hint) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {delta && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color, fontWeight: 600 }}>
              <TrendIcon size={11} />
              {delta}
            </span>
          )}
          {hint && (
            <span style={{ color: "var(--text-tertiary)" }}>
              {delta ? "·" : ""} {hint}
            </span>
          )}
        </div>
      )}
    </Tag>
  );
}
