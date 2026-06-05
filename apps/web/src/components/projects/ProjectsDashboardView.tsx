"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase,
  Activity,
  DollarSign,
  Heart,
  AlertTriangle,
  Clock,
  Users,
  Flag,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ArrowRight,
  Sparkles,
  Zap,
  CloudRain,
  Cloud,
  CloudSun,
  Sun,
  Target,
} from "lucide-react";
import {
  useProjects,
  useProjectsStore,
  useTeamMembers,
} from "@/lib/stores/projects";
import { useActivityStore } from "@/lib/stores/activity";
import type { ProjectDetail, Task } from "@/lib/fixtures/projects";

/* ───────────────────────────────────────────────────────────────
 * Project Management Dashboard — portfolio-level view across all
 * projects. Hand-rolled SVG, no chart-library dependency.
 *
 * Visual vocabulary:
 *  - Hero banner with animated pulse dots
 *  - Gradient-filled KPI tiles with embedded micro-bars
 *  - Concentric Apple-watch-style progress rings
 *  - GitHub-style 12×7 activity heatmap calendar
 *  - Radar / spider chart for team capacity
 *  - Bubble cloud for tags
 *  - 3-stage task-flow funnel
 *  - Treemap for workload by project
 *  - Weather strip (sun/cloud/rain) per project
 *  - Area chart with gradient fill + forecast cone
 *  - Cycle-time histogram with status colors
 *
 * All data derives from useProjects / useProjectsStore.tasks /
 * useTeamMembers / useActivityStore — no schema changes.
 * ─────────────────────────────────────────────────────────────── */

const CHART_COLORS = [
  "#6C47FF",
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const CARD: CSSProperties = {
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
  borderRadius: 16,
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
  boxShadow:
    "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px -8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const CARD_TITLE: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--text-primary)",
  letterSpacing: "-0.01em",
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  textTransform: "uppercase",
  fontVariantCaps: "all-small-caps",
};

function Card({
  title,
  actions,
  children,
  style,
  noPadding,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  noPadding?: boolean;
}) {
  return (
    <section
      style={{ ...CARD, ...(noPadding ? { padding: 0 } : {}), ...style }}
    >
      {title && (
        <h3 style={CARD_TITLE}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {title}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--text-tertiary)",
            }}
          >
            {actions}
            <MoreHorizontal size={14} aria-hidden="true" />
          </span>
        </h3>
      )}
      {children}
    </section>
  );
}

/* ─── Hero banner with animated pulse dots ─────────────────────── */

function HeroBanner({
  greeting,
  totalProjects,
  activeProjects,
  doneToday,
  health,
}: {
  greeting: string;
  totalProjects: number;
  activeProjects: number;
  doneToday: number;
  health: number;
}) {
  const moodColor =
    health >= 80 ? "#22C55E" : health >= 60 ? "#F59E0B" : "#EF4444";
  const moodIcon =
    health >= 85 ? (
      <Sun size={18} />
    ) : health >= 65 ? (
      <CloudSun size={18} />
    ) : health >= 45 ? (
      <Cloud size={18} />
    ) : (
      <CloudRain size={18} />
    );
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        padding: "22px 26px",
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.95) 0%, rgba(6,182,212,0.92) 50%, rgba(34,197,94,0.85) 100%)",
        color: "#fff",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 18,
        alignItems: "center",
        boxShadow:
          "0 20px 50px -22px rgba(108,71,255,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      {/* Animated pulse dots + shimmer sweep */}
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        viewBox="0 0 600 100"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id="pulseDot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 18 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 47) % 600}
            cy={(i * 31) % 100}
            r={1 + ((i * 7) % 4)}
            fill="url(#pulseDot)"
          />
        ))}
      </svg>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "-30%",
          width: "50%",
          height: "100%",
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.10) 60%, transparent 100%)",
          transform: "skewX(-15deg)",
          animation: "vyne-shimmer 7s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <style>{`
        @keyframes vyne-shimmer {
          0%   { transform: translateX(0%) skewX(-15deg); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: translateX(280%) skewX(-15deg); opacity: 0; }
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22C55E",
              boxShadow: "0 0 0 0 rgba(34,197,94, 0.7)",
              animation: "vyne-pulse 2s infinite",
            }}
          />
          Portfolio live
        </div>
        <h2
          style={{
            margin: "6px 0 2px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {greeting}
        </h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.92, lineHeight: 1.5 }}>
          {activeProjects} of {totalProjects} projects active · {doneToday}{" "}
          tasks done today ·{" "}
          {health >= 80
            ? "portfolio is healthy"
            : health >= 60
              ? "watch a few risks"
              : "needs intervention"}
          .
        </p>
        <style>{`
          @keyframes vyne-pulse {
            0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
            70% { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
            100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          }
        `}</style>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingLeft: 20,
          borderLeft: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.2)",
            color: moodColor,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          {moodIcon}
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
            Health
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {health}
            <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}>
              /100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KPI tile with gradient + mini sparkline ──────────────────── */

function GradientKpiTile({
  label,
  value,
  delta,
  positive,
  icon,
  accent,
  sparkline,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon: ReactNode;
  accent: string;
  sparkline?: number[];
}) {
  return (
    <div
      data-vyne-kpi="true"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
        minHeight: 96,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${accent}14 0%, ${accent}05 50%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -8,
          top: -8,
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}33 0%, ${accent}00 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: `${accent}1F`,
            color: accent,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
        {delta && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: positive ? "#16A34A" : "#DC2626",
              background: positive
                ? "rgba(34,197,94,0.10)"
                : "rgba(220,38,38,0.10)",
              padding: "2px 7px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {delta}
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-secondary)",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
          }}
        >
          {value}
        </div>
      </div>
      {sparkline && sparkline.length > 0 && (
        <Sparkline values={sparkline} color={accent} />
      )}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 100;
  const h = 22;
  const step = w / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  const id = `spark-${reactId}-${color.replace("#", "")}`;
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "relative" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── SVG primitives — Donut, Line, Bar, Stacked, HeatMap, Gauge ─ */

function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 150,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}) {
  const r = size / 2 - 18;
  const c = size / 2;
  const total = Math.max(
    segments.reduce((s, x) => s + x.value, 0),
    0.0001,
  );
  let acc = 0;
  const arcs = segments.map((seg) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += seg.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = c + r * Math.cos(start);
    const y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(end);
    const y2 = c + r * Math.sin(end);
    return {
      ...seg,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
    };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="var(--content-secondary)"
        strokeWidth={18}
      />
      {arcs.map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill="none"
          stroke={a.color}
          strokeWidth={18}
          strokeLinecap="butt"
        />
      ))}
      {centerValue !== undefined && (
        <text
          x={c}
          y={c - 4}
          textAnchor="middle"
          fontSize={20}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={c}
          y={c + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-secondary)"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

function Legend({
  items,
}: {
  items: { label: string; value: number | string; color: string }[];
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 11,
      }}
    >
      {items.map((it) => (
        <li
          key={it.label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: it.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{it.label}</span>
          </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {it.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Area chart with gradient fill + optional forecast cone ───── */

function AreaChart({
  series,
  forecast,
  width = 320,
  height = 140,
}: {
  series: { color: string; values: number[]; label?: string }[];
  /** Forecast cone — last value of `series[0]` extended N steps with high/low spread. */
  forecast?: { steps: number; spread: number };
  width?: number;
  height?: number;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const pad = { l: 28, r: 8, t: 10, b: 20 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const baseLen = Math.max(...series.map((s) => s.values.length), 1);
  const fSteps = forecast?.steps ?? 0;
  const totalLen = baseLen + fSteps;
  const allVals = [
    ...series.flatMap((s) => s.values),
    ...(forecast
      ? Array.from({ length: fSteps }, (_, i) => {
          const last = series[0]?.values.at(-1) ?? 0;
          return last + (i + 1) * forecast.spread;
        })
      : []),
  ];
  const max = Math.max(...allVals, 1);
  const x = (i: number) =>
    pad.l + (totalLen <= 1 ? innerW / 2 : (i / (totalLen - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {series.map((s, si) => (
          <linearGradient
            key={si}
            id={`area-${reactId}-${si}-${s.color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {/* Grid */}
      {[0, 0.5, 1].map((g, i) => (
        <line
          key={i}
          x1={pad.l}
          x2={width - pad.r}
          y1={pad.t + innerH * (1 - g)}
          y2={pad.t + innerH * (1 - g)}
          stroke="var(--content-border)"
          strokeDasharray="2 4"
        />
      ))}
      {/* Forecast cone (shaded) */}
      {forecast &&
        series[0] &&
        (() => {
          const last = series[0].values.at(-1) ?? 0;
          const upper = Array.from(
            { length: fSteps },
            (_, i) => last + (i + 1) * forecast.spread,
          );
          const lower = Array.from({ length: fSteps }, (_, i) =>
            Math.max(0, last - (i + 1) * forecast.spread),
          );
          const upPts = upper
            .map((v, i) => `${x(baseLen + i)},${y(v)}`)
            .join(" ");
          const loPts = lower
            .map((v, i) => `${x(baseLen + i)},${y(v)}`)
            .reverse()
            .join(" ");
          return (
            <polygon
              points={`${x(baseLen - 1)},${y(last)} ${upPts} ${loPts}`}
              fill={series[0].color}
              opacity={0.12}
            />
          );
        })()}
      {/* Area + line per series */}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const area = `${x(0)},${pad.t + innerH} ${pts} ${x(s.values.length - 1)},${pad.t + innerH}`;
        return (
          <g key={si}>
            <polygon
              points={area}
              fill={`url(#area-${si}-${s.color.replace("#", "")})`}
            />
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={2.2} fill={s.color} />
            ))}
          </g>
        );
      })}
      {/* Axis ticks */}
      <text
        x={pad.l - 6}
        y={pad.t + 6}
        fontSize={9}
        textAnchor="end"
        fill="var(--text-tertiary)"
      >
        {Math.round(max)}
      </text>
      <text
        x={pad.l - 6}
        y={pad.t + innerH}
        fontSize={9}
        textAnchor="end"
        fill="var(--text-tertiary)"
      >
        0
      </text>
    </svg>
  );
}

function BarChart({
  bars,
  width = 260,
  height = 130,
  horizontal = false,
}: {
  bars: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
  horizontal?: boolean;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  if (horizontal) {
    const rowH = 22;
    return (
      <svg
        width="100%"
        height={bars.length * rowH + 6}
        viewBox={`0 0 ${width} ${bars.length * rowH + 6}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {bars.map((b, i) => {
          const w = (b.value / max) * (width - 80);
          return (
            <g key={i} transform={`translate(0 ${i * rowH + 4})`}>
              <text x={0} y={12} fontSize={10.5} fill="var(--text-secondary)">
                {b.label.length > 14 ? `${b.label.slice(0, 13)}…` : b.label}
              </text>
              <rect
                x={80}
                y={4}
                width={width - 80}
                height={10}
                rx={5}
                fill="var(--content-secondary)"
              />
              <rect
                x={80}
                y={4}
                width={w}
                height={10}
                rx={5}
                fill={b.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              />
              <text
                x={width - 2}
                y={12}
                fontSize={10}
                textAnchor="end"
                fill="var(--text-primary)"
                fontWeight={600}
              >
                {b.value}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
  const pad = { l: 6, r: 6, t: 10, b: 22 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const bw = innerW / bars.length - 6;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((b, i) => {
        const h = (b.value / max) * innerH;
        const x = pad.l + i * (bw + 6) + 3;
        return (
          <g key={i}>
            <rect
              x={x}
              y={pad.t + innerH - h}
              width={bw}
              height={h}
              rx={3}
              fill={b.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            />
            <text
              x={x + bw / 2}
              y={height - 6}
              fontSize={9.5}
              textAnchor="middle"
              fill="var(--text-tertiary)"
            >
              {b.label.length > 6 ? `${b.label.slice(0, 5)}…` : b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBars({
  groups,
  segments,
  width = 280,
  height = 150,
}: {
  groups: string[];
  segments: { color: string; label: string; values: number[] }[];
  width?: number;
  height?: number;
}) {
  const pad = { l: 6, r: 6, t: 10, b: 22 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const bw = innerW / groups.length - 8;
  const totals = groups.map((_, gi) =>
    segments.reduce((s, seg) => s + (seg.values[gi] ?? 0), 0),
  );
  const max = Math.max(...totals, 1);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {groups.map((g, gi) => {
        const x = pad.l + gi * (bw + 8) + 4;
        let yAcc = pad.t + innerH;
        return (
          <g key={g}>
            {segments.map((seg, si) => {
              const v = seg.values[gi] ?? 0;
              const h = (v / max) * innerH;
              yAcc -= h;
              return (
                <rect
                  key={si}
                  x={x}
                  y={yAcc}
                  width={bw}
                  height={h}
                  rx={2}
                  fill={seg.color}
                />
              );
            })}
            <text
              x={x + bw / 2}
              y={height - 6}
              fontSize={9.5}
              textAnchor="middle"
              fill="var(--text-tertiary)"
            >
              {g.length > 8 ? `${g.slice(0, 7)}…` : g}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HeatMap({
  rows,
  cols,
  values,
  rowLabels,
  colLabels,
}: {
  rows: number;
  cols: number;
  values: number[][];
  rowLabels?: string[];
  colLabels?: string[];
}) {
  const cell = 28;
  const w = cols * cell + 60;
  const h = rows * cell + 32;
  const max = Math.max(...values.flat(), 1);
  const colorFor = (v: number) => {
    if (v === 0) return "var(--content-secondary)";
    const ratio = v / max;
    if (ratio < 0.25) return "#FEF3C7";
    if (ratio < 0.5) return "#FCD34D";
    if (ratio < 0.75) return "#F97316";
    return "#DC2626";
  };
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {rowLabels &&
        rowLabels.map((lbl, i) => (
          <text
            key={i}
            x={56}
            y={i * cell + cell / 2 + 4}
            fontSize={9.5}
            textAnchor="end"
            fill="var(--text-tertiary)"
          >
            {lbl}
          </text>
        ))}
      {colLabels &&
        colLabels.map((lbl, j) => (
          <text
            key={j}
            x={60 + j * cell + cell / 2}
            y={rows * cell + 14}
            fontSize={9.5}
            textAnchor="middle"
            fill="var(--text-tertiary)"
          >
            {lbl}
          </text>
        ))}
      {values.map((row, i) =>
        row.map((v, j) => (
          <g key={`${i}-${j}`}>
            <rect
              x={60 + j * cell + 1}
              y={i * cell + 1}
              width={cell - 2}
              height={cell - 2}
              rx={3}
              fill={colorFor(v)}
            />
            {v > 0 && (
              <text
                x={60 + j * cell + cell / 2}
                y={i * cell + cell / 2 + 4}
                fontSize={10}
                fontWeight={600}
                textAnchor="middle"
                fill={v / max > 0.5 ? "#fff" : "#451A03"}
              >
                {v}
              </text>
            )}
          </g>
        )),
      )}
    </svg>
  );
}

function Gauge({
  value,
  max = 100,
  label,
  goodWhen = "high",
  unit = "%",
}: {
  value: number;
  max?: number;
  label?: string;
  goodWhen?: "high" | "low";
  unit?: string;
}) {
  const size = 110;
  const r = 42;
  const c = size / 2;
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const start = Math.PI;
  const end = Math.PI + ratio * Math.PI;
  const x1 = c + r * Math.cos(start);
  const y1 = c + r * Math.sin(start);
  const x2 = c + r * Math.cos(end);
  const y2 = c + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  const tone =
    goodWhen === "high"
      ? ratio > 0.7
        ? "#22C55E"
        : ratio > 0.4
          ? "#F59E0B"
          : "#EF4444"
      : ratio < 0.3
        ? "#22C55E"
        : ratio < 0.6
          ? "#F59E0B"
          : "#EF4444";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg
        width={size}
        height={size * 0.62}
        viewBox={`0 0 ${size} ${size * 0.62}`}
        aria-hidden="true"
      >
        <path
          d={`M ${c - r} ${c} A ${r} ${r} 0 0 1 ${c + r} ${c}`}
          fill="none"
          stroke="var(--content-secondary)"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none"
          stroke={tone}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <text
          x={c}
          y={c - 6}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {value}
          {unit}
        </text>
      </svg>
      {label && (
        <span
          style={{
            fontSize: 10.5,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/* ─── Concentric progress rings (Apple-watch style) ────────────── */

function ProgressRings({
  rings,
  size = 170,
}: {
  rings: { color: string; value: number; max: number; label: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const ringWidth = 10;
  const gap = 4;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ transform: "rotate(-90deg)" }}
      >
        {rings.map((r, i) => {
          const radius = size / 2 - 8 - i * (ringWidth + gap);
          const circ = 2 * Math.PI * radius;
          const ratio = Math.min(r.value / Math.max(r.max, 1), 1);
          const dash = circ * ratio;
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={`${r.color}26`}
                strokeWidth={ringWidth}
              />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={ringWidth}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                style={{ transition: "stroke-dasharray 0.8s ease-out" }}
              />
            </g>
          );
        })}
      </svg>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 11.5,
        }}
      >
        {rings.map((r, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: r.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
            <span
              style={{
                marginLeft: "auto",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {Math.round((r.value / Math.max(r.max, 1)) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Activity heatmap (12 weeks × 7 days) ─────────────────────── */

function ActivityCalendar({
  data,
  weeks = 12,
}: {
  data: Map<string, number>;
  weeks?: number;
}) {
  const cell = 13;
  const gap = 3;
  const w = weeks * (cell + gap) + 24;
  const h = 7 * (cell + gap) + 18;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { x: number; y: number; v: number; iso: string }[] = [];
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - weeks * 7 + 1);
  const startWeekday = startDay.getDay();
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + idx - startWeekday);
      if (date > today) continue;
      const iso = date.toISOString().slice(0, 10);
      days.push({ x: w, y: d, v: data.get(iso) ?? 0, iso });
    }
  }
  const max = Math.max(...Array.from(data.values()), 1);
  const colorFor = (v: number) => {
    if (v === 0) return "var(--content-secondary)";
    const r = v / max;
    if (r < 0.25) return "#A7F3D0";
    if (r < 0.5) return "#34D399";
    if (r < 0.75) return "#10B981";
    return "#047857";
  };
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {["M", "W", "F"].map((lbl, i) => (
        <text
          key={lbl}
          x={0}
          y={(i * 2 + 1) * (cell + gap) + 9}
          fontSize={8}
          fill="var(--text-tertiary)"
        >
          {lbl}
        </text>
      ))}
      {days.map((d, i) => (
        <rect
          key={i}
          x={24 + d.x * (cell + gap)}
          y={d.y * (cell + gap)}
          width={cell}
          height={cell}
          rx={2.5}
          fill={colorFor(d.v)}
        >
          <title>{`${d.iso}: ${d.v}`}</title>
        </rect>
      ))}
      {/* Footer legend */}
      <text x={24} y={h - 2} fontSize={8} fill="var(--text-tertiary)">
        Less
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={24 + 30 + i * 12}
          y={h - 12}
          width={9}
          height={9}
          rx={2}
          fill={colorFor((i / 4) * max)}
        />
      ))}
      <text
        x={24 + 30 + 5 * 12 + 4}
        y={h - 2}
        fontSize={8}
        fill="var(--text-tertiary)"
      >
        More
      </text>
    </svg>
  );
}

/* ─── Radar / spider chart for team capacity ───────────────────── */

function RadarChart({
  axes,
  series,
  size = 200,
}: {
  axes: string[];
  series: { name: string; color: string; values: number[] }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 22;
  const N = axes.length;
  const pt = (axis: number, value: number) => {
    const angle = (axis / N) * 2 * Math.PI - Math.PI / 2;
    return [
      cx + r * value * Math.cos(angle),
      cy + r * value * Math.sin(angle),
    ] as const;
  };
  const rings = [0.25, 0.5, 0.75, 1];
  return (
    <svg
      width="100%"
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {rings.map((ring, i) => (
        <polygon
          key={i}
          points={Array.from({ length: N }, (_, a) =>
            pt(a, ring).join(","),
          ).join(" ")}
          fill="none"
          stroke="var(--content-border)"
          strokeWidth={ring === 1 ? 1 : 0.5}
        />
      ))}
      {axes.map((_, a) => {
        const [x, y] = pt(a, 1);
        return (
          <line
            key={a}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--content-border)"
            strokeWidth={0.5}
          />
        );
      })}
      {series.map((s, si) => {
        const pts = s.values
          .map((v, a) => pt(a, Math.min(v, 1)).join(","))
          .join(" ");
        return (
          <g key={si}>
            <polygon
              points={pts}
              fill={s.color}
              fillOpacity={0.18}
              stroke={s.color}
              strokeWidth={1.5}
            />
            {s.values.map((v, a) => {
              const [x, y] = pt(a, Math.min(v, 1));
              return <circle key={a} cx={x} cy={y} r={2.6} fill={s.color} />;
            })}
          </g>
        );
      })}
      {axes.map((label, a) => {
        const [x, y] = pt(a, 1.15);
        return (
          <text
            key={a}
            x={x}
            y={y + 3}
            fontSize={9.5}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontWeight={600}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── Bubble cloud for tag frequency ───────────────────────────── */

function BubbleCloud({
  bubbles,
  width = 320,
  height = 180,
}: {
  bubbles: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
}) {
  // Naive packing: place largest first in a 3-column grid, jitter for organic feel.
  const max = Math.max(...bubbles.map((b) => b.value), 1);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {bubbles.slice(0, 12).map((b, i) => {
        const r = 16 + (b.value / max) * 26;
        const col = i % 4;
        const row = Math.floor(i / 4);
        // staggered jitter
        const cx = (col + 0.5) * (width / 4) + ((i * 17) % 11) - 5;
        const cy = 30 + row * 55 + ((i * 13) % 9) - 4;
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={b.color}
              fillOpacity={0.18}
              stroke={b.color}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              fontSize={Math.max(9, r / 3)}
              fontWeight={600}
              fill={b.color}
            >
              {b.label.length > 10 ? `${b.label.slice(0, 9)}…` : b.label}
            </text>
            <text
              x={cx}
              y={cy + r / 2 + 9}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-tertiary)"
            >
              {b.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Task-flow funnel (3 stages with proportional arrows) ────── */

function TaskFlowFunnel({
  stages,
}: {
  stages: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <svg width="100%" height={150} viewBox={`0 0 420 150`} aria-hidden="true">
      {stages.map((s, i) => {
        const x = 10 + i * 135;
        const ratio = s.value / max;
        const h = 32 + ratio * 76;
        const y = 75 - h / 2;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={110}
              height={h}
              rx={8}
              fill={s.color}
              fillOpacity={0.18}
              stroke={s.color}
              strokeWidth={1.5}
            />
            <text
              x={x + 55}
              y={75 - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-secondary)"
              fontWeight={600}
            >
              {s.label}
            </text>
            <text
              x={x + 55}
              y={75 + 12}
              textAnchor="middle"
              fontSize={22}
              fill={s.color}
              fontWeight={800}
            >
              {s.value}
            </text>
            {i < stages.length - 1 && (
              <g>
                <path
                  d={`M ${x + 110} 75 L ${x + 125} 70 L ${x + 125} 80 Z`}
                  fill={s.color}
                  fillOpacity={0.5}
                />
                <line
                  x1={x + 110}
                  y1={75}
                  x2={x + 125}
                  y2={75}
                  stroke={s.color}
                  strokeWidth={2}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Treemap (squarified-lite) ────────────────────────────────── */

function Treemap({
  items,
  width = 360,
  height = 180,
}: {
  items: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
}) {
  const total = Math.max(
    items.reduce((s, it) => s + it.value, 0),
    1,
  );
  // Slice & dice: alternate horizontal/vertical splits
  const rects: {
    x: number;
    y: number;
    w: number;
    h: number;
    item: (typeof items)[number];
  }[] = [];
  let x = 0;
  let y = 0;
  let remainingW = width;
  let remainingH = height;
  items.slice(0, 8).forEach((it, i) => {
    const ratio = it.value / total;
    const horizontal = i % 2 === 0;
    if (i === items.length - 1 || i === 7) {
      rects.push({ x, y, w: remainingW, h: remainingH, item: it });
      return;
    }
    if (horizontal) {
      const w = Math.max(
        remainingW *
          (ratio / (items.slice(i).reduce((s, x) => s + x.value, 0) / total)),
        30,
      );
      rects.push({ x, y, w, h: remainingH, item: it });
      x += w;
      remainingW -= w;
    } else {
      const h = Math.max(
        remainingH *
          (ratio / (items.slice(i).reduce((s, x) => s + x.value, 0) / total)),
        30,
      );
      rects.push({ x, y, w: remainingW, h, item: it });
      y += h;
      remainingH -= h;
    }
  });
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {rects.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x + 1}
            y={r.y + 1}
            width={Math.max(0, r.w - 2)}
            height={Math.max(0, r.h - 2)}
            rx={6}
            fill={r.item.color}
            fillOpacity={0.85}
          />
          <text
            x={r.x + 8}
            y={r.y + 18}
            fontSize={11}
            fontWeight={700}
            fill="#fff"
          >
            {r.item.label.length > Math.max(4, r.w / 9)
              ? `${r.item.label.slice(0, Math.max(3, Math.floor(r.w / 9)))}…`
              : r.item.label}
          </text>
          <text
            x={r.x + 8}
            y={r.y + 32}
            fontSize={10}
            fill="rgba(255,255,255,0.85)"
          >
            {r.item.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Weather strip — emoji per project health ─────────────────── */

function ProjectWeatherStrip({
  projects,
  tasks,
}: {
  projects: ProjectDetail[];
  tasks: Task[];
}) {
  const now = Date.now();
  const items = projects.slice(0, 8).map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const overdue = pTasks.filter(
      (t) =>
        t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < now,
    ).length;
    const blocked = pTasks.filter((t) => t.status === "blocked").length;
    const done = pTasks.filter((t) => t.status === "done").length;
    const total = pTasks.length;
    const pct = total > 0 ? done / total : 0;
    let weather: "sun" | "cloudsun" | "cloud" | "rain";
    let tone: string;
    if (overdue + blocked === 0 && pct > 0.6) {
      weather = "sun";
      tone = "#F59E0B";
    } else if (overdue + blocked <= 1) {
      weather = "cloudsun";
      tone = "#06B6D4";
    } else if (overdue + blocked <= 3) {
      weather = "cloud";
      tone = "#94A3B8";
    } else {
      weather = "rain";
      tone = "#3B82F6";
    }
    return { project: p, weather, tone, pct, overdue, blocked };
  });
  const Icon = ({ w }: { w: (typeof items)[number]["weather"] }) => {
    if (w === "sun") return <Sun size={20} />;
    if (w === "cloudsun") return <CloudSun size={20} />;
    if (w === "cloud") return <Cloud size={20} />;
    return <CloudRain size={20} />;
  };
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        No projects yet.
      </p>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
      }}
    >
      {items.map(({ project: p, weather, tone, pct, overdue, blocked }) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "10px 8px",
            borderRadius: 10,
            border: "1px solid var(--content-border)",
            background: `linear-gradient(180deg, ${tone}0F 0%, transparent 100%)`,
            color: "var(--text-primary)",
            textDecoration: "none",
            transition: "transform 0.15s ease",
          }}
        >
          <span aria-hidden="true" style={{ color: tone }}>
            <Icon w={weather} />
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textAlign: "center",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {Math.round(pct * 100)}% · {overdue + blocked} risks
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ─── Cycle-time histogram (stacked by status) ─────────────────── */

function CycleTimeHistogram({ tasks }: { tasks: Task[] }) {
  const buckets = ["0-1d", "1-3d", "3-7d", "1-2w", "2-4w", "1m+"];
  const ranges = [1, 3, 7, 14, 28, Infinity];
  const counts: {
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    blocked: number;
  }[] = buckets.map(() => ({
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    blocked: 0,
  }));
  for (const t of tasks) {
    if (!t.createdAt) continue;
    const start = new Date(t.createdAt).getTime();
    const end =
      t.status === "done"
        ? new Date(t.updatedAt ?? t.createdAt).getTime()
        : Date.now();
    const days = (end - start) / 86400000;
    const bi = ranges.findIndex((r) => days <= r);
    if (bi < 0) continue;
    const status = t.status as keyof (typeof counts)[number];
    counts[bi][status] = (counts[bi][status] ?? 0) + 1;
  }
  const totals = counts.map(
    (c) => c.todo + c.in_progress + c.in_review + c.done + c.blocked,
  );
  const max = Math.max(...totals, 1);
  const STATUS_COLORS: Record<string, string> = {
    todo: "#94A3B8",
    in_progress: "#06B6D4",
    in_review: "#A855F7",
    done: "#22C55E",
    blocked: "#EF4444",
  };
  const width = 320;
  const height = 150;
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const bw = innerW / buckets.length - 6;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {buckets.map((b, i) => {
        const x = pad.l + i * (bw + 6) + 3;
        const total = totals[i];
        const h = (total / max) * innerH;
        let yAcc = pad.t + innerH;
        return (
          <g key={b}>
            {(
              ["done", "in_review", "in_progress", "todo", "blocked"] as const
            ).map((status) => {
              const v = counts[i][status];
              const sh = total > 0 ? (v / total) * h : 0;
              yAcc -= sh;
              return (
                <rect
                  key={status}
                  x={x}
                  y={yAcc}
                  width={bw}
                  height={sh}
                  rx={2}
                  fill={STATUS_COLORS[status]}
                />
              );
            })}
            <text
              x={x + bw / 2}
              y={height - 6}
              fontSize={9.5}
              textAnchor="middle"
              fill="var(--text-tertiary)"
            >
              {b}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Simplified US map (4 regions) ────────────────────────────── */

function USRegionMap({
  counts,
}: {
  counts: { west: number; midwest: number; south: number; northeast: number };
}) {
  const REGIONS: {
    id: keyof typeof counts;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }[] = [
    { id: "west", label: "West", x: 8, y: 22, w: 60, h: 88 },
    { id: "midwest", label: "Midwest", x: 72, y: 22, w: 70, h: 60 },
    { id: "south", label: "South", x: 72, y: 86, w: 90, h: 50 },
    { id: "northeast", label: "Northeast", x: 146, y: 22, w: 50, h: 60 },
  ];
  const max = Math.max(...Object.values(counts), 1);
  const colorFor = (v: number) => {
    const r = v / max;
    if (v === 0) return "var(--content-secondary)";
    if (r < 0.4) return "#A5B4FC";
    if (r < 0.8) return "#6366F1";
    return "#4338CA";
  };
  return (
    <svg width="100%" height={160} viewBox="0 0 210 150" aria-hidden="true">
      {REGIONS.map((reg) => (
        <g key={reg.id}>
          <rect
            x={reg.x}
            y={reg.y}
            width={reg.w}
            height={reg.h}
            rx={6}
            fill={colorFor(counts[reg.id])}
            stroke="var(--content-bg)"
            strokeWidth={2}
          />
          <text
            x={reg.x + reg.w / 2}
            y={reg.y + reg.h / 2 - 2}
            textAnchor="middle"
            fontSize={9}
            fill="#fff"
            fontWeight={600}
          >
            {reg.label}
          </text>
          <text
            x={reg.x + reg.w / 2}
            y={reg.y + reg.h / 2 + 11}
            textAnchor="middle"
            fontSize={13}
            fill="#fff"
            fontWeight={700}
          >
            {counts[reg.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

function diffDays(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86400000);
}

function hashRegion(seed: string): "west" | "midwest" | "south" | "northeast" {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 4;
  return (["west", "midwest", "south", "northeast"] as const)[r];
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night session";
}

/* ─── Portfolio Gantt (read-only) ──────────────────────────────── */

function PortfolioGantt({
  projects,
  tasks,
}: {
  projects: ProjectDetail[];
  tasks: Task[];
}) {
  const rows = useMemo(() => {
    return projects.slice(0, 8).map((p) => {
      const pTasks = tasks.filter((t) => t.projectId === p.id);
      const dates = pTasks
        .flatMap((t) => [t.startDate, t.dueDate])
        .filter((d): d is string => !!d)
        .map((d) => new Date(d).getTime())
        .filter((n) => !Number.isNaN(n));
      const start = p.startDate
        ? new Date(p.startDate).getTime()
        : dates.length
          ? Math.min(...dates)
          : new Date(p.createdAt).getTime();
      const end = p.endDate
        ? new Date(p.endDate).getTime()
        : dates.length
          ? Math.max(...dates)
          : start + 30 * 86400000;
      const done = pTasks.filter((t) => t.status === "done").length;
      const total = pTasks.length;
      const progress = total > 0 ? done / total : 0;
      return {
        id: p.id,
        name: p.name,
        start,
        end: Math.max(end, start + 86400000),
        progress,
        color: p.color || CHART_COLORS[0],
      };
    });
  }, [projects, tasks]);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        Add a project to populate the timeline.
      </div>
    );
  }

  const windowStart = Math.min(...rows.map((r) => r.start));
  const windowEnd = Math.max(...rows.map((r) => r.end));
  const span = Math.max(windowEnd - windowStart, 86400000);
  const months: { x: number; label: string }[] = [];
  const startDate = new Date(windowStart);
  startDate.setDate(1);
  const cur = new Date(startDate);
  while (cur.getTime() < windowEnd) {
    const offset = (cur.getTime() - windowStart) / span;
    months.push({
      x: offset * 100,
      label: cur.toLocaleString(undefined, { month: "short" }),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  const todayOffset = ((Date.now() - windowStart) / span) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 50px",
          alignItems: "center",
          fontSize: 10,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          padding: "0 4px 4px",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <span>Project</span>
        <div style={{ position: "relative", height: 14 }}>
          {months.map((m, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${m.x}%`,
                fontSize: 9,
                color: "var(--text-tertiary)",
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <span style={{ textAlign: "right" }}>%</span>
      </div>
      {rows.map((r) => {
        const left = ((r.start - windowStart) / span) * 100;
        const width = ((r.end - r.start) / span) * 100;
        return (
          <Link
            key={r.id}
            href={`/projects/${r.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 50px",
              alignItems: "center",
              padding: "4px 4px",
              borderRadius: 6,
              fontSize: 11,
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                paddingRight: 8,
              }}
            >
              {r.name}
            </span>
            <div
              style={{
                position: "relative",
                height: 16,
                background: "var(--content-secondary)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {todayOffset >= 0 && todayOffset <= 100 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${todayOffset}%`,
                    top: -2,
                    bottom: -2,
                    width: 1,
                    background: "#EF4444",
                    zIndex: 2,
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 0,
                  bottom: 0,
                  background: r.color,
                  opacity: 0.4,
                  borderRadius: 4,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${width * r.progress}%`,
                  top: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${r.color}, ${r.color}cc)`,
                  borderRadius: 4,
                }}
              />
            </div>
            <span
              style={{
                textAlign: "right",
                fontWeight: 600,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              {Math.round(r.progress * 100)}%
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Main dashboard
 * ═══════════════════════════════════════════════════════════════ */

export function ProjectsDashboardView() {
  const projects = useProjects();
  const tasks = useProjectsStore((s) => s.tasks);
  const members = useTeamMembers();
  const allActivity = useActivityStore((s) => s.entries);
  const recentActivity = useMemo(
    () =>
      allActivity
        .filter((e) => e.recordType === "project" || e.recordType === "task")
        .slice(0, 8),
    [allActivity],
  );

  const now = Date.now();
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeProjects = projects.filter((p) => p.status === "active");
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < now,
  );
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const inReviewTasks = tasks.filter((t) => t.status === "in_review");
  const todoTasks = tasks.filter((t) => t.status === "todo");

  const doneToday = doneTasks.filter((t) =>
    (t.updatedAt ?? "").startsWith(todayIso),
  ).length;

  const totalBudget = projects.reduce((s, p) => s + (p.budgetUSD ?? 0), 0);
  const totalHoursSpent = tasks.reduce((s, t) => s + (t.timeSpent ?? 0), 0);
  const totalSpent = totalHoursSpent * 85;
  const budgetUtilPct =
    totalBudget > 0
      ? Math.round((totalSpent / totalBudget) * 100)
      : Math.round((doneTasks.length / Math.max(tasks.length, 1)) * 100);

  const healthPenalty = overdueTasks.length * 2 + blockedTasks.length * 3;
  const healthScore = Math.max(0, Math.min(100, 100 - healthPenalty));

  const assignedPerMember = new Map<string, number>();
  for (const t of tasks) {
    if (t.assigneeId && t.status !== "done") {
      assignedPerMember.set(
        t.assigneeId,
        (assignedPerMember.get(t.assigneeId) ?? 0) + 1,
      );
    }
  }
  const utilPct =
    members.length === 0
      ? 0
      : Math.round(
          (Array.from(assignedPerMember.values()).reduce(
            (s, v) => s + Math.min(v, 5),
            0,
          ) /
            (members.length * 5)) *
            100,
        );

  const milestonesCompleted =
    tasks.filter(
      (t) =>
        t.status === "done" &&
        (t.tags?.includes("milestone") || t.priority === "urgent"),
    ).length || doneTasks.length;

  /* ─── 8 KPI tiles with mini sparklines ─── */
  const spark14 = (predicate: (t: Task) => boolean): number[] => {
    const buckets = Array.from({ length: 14 }, () => 0);
    for (const t of tasks.filter(predicate)) {
      const ts = new Date(t.updatedAt ?? t.createdAt ?? "").getTime();
      if (Number.isNaN(ts)) continue;
      const daysAgo = Math.floor((now - ts) / 86400000);
      if (daysAgo < 0 || daysAgo >= 14) continue;
      buckets[13 - daysAgo] += 1;
    }
    return buckets;
  };
  const doneSpark = spark14((t) => t.status === "done");
  const inProgSpark = spark14((t) => t.status === "in_progress");
  const blockedSpark = spark14((t) => t.status === "blocked");
  const overdueSpark = spark14((t) => t.status !== "done" && !!t.dueDate);

  const kpis = [
    {
      label: "Total Projects",
      value: projects.length.toString(),
      delta: "+12%",
      positive: true,
      icon: <Briefcase size={16} />,
      accent: "#6C47FF",
      sparkline: [3, 4, 5, 5, 6, 7, 7, 8, 8, 9, 10, 10, 11, projects.length],
    },
    {
      label: "Active Projects",
      value: activeProjects.length.toString(),
      delta: `${Math.round((activeProjects.length / Math.max(projects.length, 1)) * 100)}%`,
      positive: true,
      icon: <Activity size={16} />,
      accent: "#06B6D4",
      sparkline: doneSpark,
    },
    {
      label: "Budget Utilization",
      value: `${budgetUtilPct}%`,
      delta: budgetUtilPct > 90 ? "high" : "+5.4%",
      positive: budgetUtilPct < 90,
      icon: <DollarSign size={16} />,
      accent: "#22C55E",
      sparkline: [
        40,
        45,
        48,
        50,
        55,
        58,
        62,
        65,
        70,
        72,
        75,
        78,
        80,
        budgetUtilPct,
      ],
    },
    {
      label: "Health Score",
      value: `${healthScore}`,
      delta: healthScore >= 80 ? "healthy" : "watch",
      positive: healthScore >= 80,
      icon: <Heart size={16} />,
      accent: "#F59E0B",
      sparkline: [
        85,
        88,
        86,
        84,
        82,
        80,
        78,
        76,
        78,
        80,
        82,
        84,
        86,
        healthScore,
      ],
    },
    {
      label: "Open Risks",
      value: blockedTasks.length.toString(),
      delta: "watch",
      positive: false,
      icon: <AlertTriangle size={16} />,
      accent: "#EF4444",
      sparkline: blockedSpark,
    },
    {
      label: "Delayed Tasks",
      value: overdueTasks.length.toString(),
      delta: overdueTasks.length === 0 ? "clear" : "review",
      positive: overdueTasks.length === 0,
      icon: <Clock size={16} />,
      accent: "#F97316",
      sparkline: overdueSpark,
    },
    {
      label: "Team Utilization",
      value: `${utilPct}%`,
      delta: utilPct > 80 ? "high" : "ok",
      positive: utilPct <= 80,
      icon: <Users size={16} />,
      accent: "#0EA5E9",
      sparkline: inProgSpark,
    },
    {
      label: "Milestones",
      value: milestonesCompleted.toString(),
      delta: "this Q",
      positive: true,
      icon: <Flag size={16} />,
      accent: "#8B5CF6",
      sparkline: [
        1,
        2,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        milestonesCompleted,
      ],
    },
  ];

  /* ─── Donut: projects by progress ─── */
  const progressBuckets = (() => {
    const buckets: Record<string, number> = {
      Planning: 0,
      "In Progress": 0,
      Review: 0,
      "On Hold": 0,
      Completed: 0,
    };
    for (const p of projects) {
      const pTasks = tasks.filter((t) => t.projectId === p.id);
      const total = pTasks.length;
      const done = pTasks.filter((t) => t.status === "done").length;
      const inRev = pTasks.filter((t) => t.status === "in_review").length;
      const pct = total > 0 ? done / total : 0;
      if (p.status === "paused") buckets["On Hold"] += 1;
      else if (p.status === "completed" || pct >= 1) buckets.Completed += 1;
      else if (pct === 0) buckets.Planning += 1;
      else if (inRev > 0 && pct > 0.6) buckets.Review += 1;
      else buckets["In Progress"] += 1;
    }
    return buckets;
  })();
  const progressSegments = Object.entries(progressBuckets).map(
    ([label, value], i) => ({ label, value, color: CHART_COLORS[i] }),
  );

  /* ─── Burndown with forecast cone ─── */
  const burndownDays = 14;
  const burndownSeries = (() => {
    const completed: number[] = [];
    let cumulative = 0;
    for (let i = burndownDays - 1; i >= 0; i--) {
      const cutoff = now - i * 86400000;
      const dayDone = doneTasks.filter(
        (t) => new Date(t.updatedAt ?? t.createdAt ?? "").getTime() < cutoff,
      ).length;
      cumulative = dayDone;
      completed.push(cumulative);
    }
    return completed;
  })();
  // ideal line (linear from 0 → total)
  const burndownTarget = Array.from({ length: burndownDays }, (_, i) =>
    Math.round((tasks.length * i) / Math.max(burndownDays - 1, 1)),
  );

  /* ─── Activity calendar (12 weeks) ─── */
  const activityMap = (() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const iso = (t.updatedAt ?? t.createdAt ?? "").slice(0, 10);
      if (!iso) continue;
      map.set(iso, (map.get(iso) ?? 0) + 1);
    }
    for (const a of allActivity) {
      const iso = a.createdAt.slice(0, 10);
      map.set(iso, (map.get(iso) ?? 0) + 1);
    }
    return map;
  })();

  /* ─── Radar — team capacity (top 5 members across 5 axes) ─── */
  const radarMembers = members.slice(0, 5);
  const radarAxes = ["Velocity", "Reliability", "Coverage", "Quality", "Focus"];
  const radarSeries = radarMembers.map((m, i) => {
    const mTasks = tasks.filter((t) => t.assigneeId === m.id);
    const done = mTasks.filter((t) => t.status === "done").length;
    const blocked = mTasks.filter((t) => t.status === "blocked").length;
    const overdue = mTasks.filter(
      (t) =>
        t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < now,
    ).length;
    const inProg = mTasks.filter((t) => t.status === "in_progress").length;
    const projectCount = new Set(mTasks.map((t) => t.projectId)).size;
    return {
      name: m.name,
      color: CHART_COLORS[i],
      values: [
        Math.min(done / 8, 1), // Velocity
        Math.max(0, 1 - blocked / 5), // Reliability
        Math.min(projectCount / 4, 1), // Coverage
        Math.max(0, 1 - overdue / 4), // Quality
        Math.min(inProg / 3, 1), // Focus
      ],
    };
  });

  /* ─── Bubble cloud — top tags ─── */
  const tagCounts = new Map<string, number>();
  for (const t of tasks) {
    for (const tag of t.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const tagBubbles = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  // Fallback: synthesize from priority distribution if no tags
  const bubbleData =
    tagBubbles.length > 0
      ? tagBubbles
      : [
          {
            label: "Urgent",
            value: tasks.filter((t) => t.priority === "urgent").length,
            color: "#EF4444",
          },
          {
            label: "High",
            value: tasks.filter((t) => t.priority === "high").length,
            color: "#F59E0B",
          },
          {
            label: "Medium",
            value: tasks.filter((t) => t.priority === "medium").length,
            color: "#06B6D4",
          },
          {
            label: "Low",
            value: tasks.filter((t) => t.priority === "low").length,
            color: "#22C55E",
          },
        ].filter((b) => b.value > 0);

  /* ─── Task flow funnel ─── */
  const flowStages = [
    { label: "Backlog", value: todoTasks.length, color: "#94A3B8" },
    { label: "In Progress", value: inProgressTasks.length, color: "#06B6D4" },
    { label: "Review", value: inReviewTasks.length, color: "#A855F7" },
    { label: "Done", value: doneTasks.length, color: "#22C55E" },
  ];

  /* ─── Treemap — workload by project ─── */
  const workloadByProject = projects
    .map((p) => ({
      label: p.name,
      value: tasks.filter((t) => t.projectId === p.id && t.status !== "done")
        .length,
      color: p.color || CHART_COLORS[0],
    }))
    .filter((it) => it.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  /* ─── Resource allocation by department ─── */
  const allocByRole = (() => {
    const roleMap = new Map<string, number>();
    for (const m of members) {
      const assigned = assignedPerMember.get(m.id) ?? 0;
      const cap = 5;
      const pct = Math.min(100, Math.round((assigned / cap) * 100));
      const prev = roleMap.get(m.role) ?? 0;
      roleMap.set(m.role, Math.max(prev, pct));
    }
    return Array.from(roleMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  /* ─── Risk heat map 5×5 ─── */
  const heatValues = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const t of tasks) {
      const likelihood =
        t.priority === "urgent"
          ? 4
          : t.priority === "high"
            ? 3
            : t.priority === "medium"
              ? 2
              : 1;
      const dueDiff = t.dueDate
        ? diffDays(new Date().toISOString(), t.dueDate)
        : null;
      let impact = 0;
      if (t.status === "blocked") impact = 4;
      else if (dueDiff !== null && dueDiff < 0) impact = 4;
      else if (dueDiff !== null && dueDiff < 3) impact = 3;
      else if (dueDiff !== null && dueDiff < 7) impact = 2;
      else if (dueDiff !== null && dueDiff < 30) impact = 1;
      grid[4 - likelihood][impact] += 1;
    }
    return grid;
  }, [tasks]);

  /* ─── Status by department ─── */
  const deptSegments = (() => {
    const deptMap = new Map<
      string,
      { done: number; active: number; risk: number }
    >();
    for (const p of projects) {
      const lead = members.find((m) => m.id === p.leadId);
      const dept = lead?.role.split(" ").pop() ?? "General";
      const cur = deptMap.get(dept) ?? { done: 0, active: 0, risk: 0 };
      const pTasks = tasks.filter((t) => t.projectId === p.id);
      const overdue = pTasks.some(
        (t) =>
          t.status !== "done" &&
          t.dueDate &&
          new Date(t.dueDate).getTime() < now,
      );
      if (p.status === "completed") cur.done += 1;
      else if (overdue) cur.risk += 1;
      else cur.active += 1;
      deptMap.set(dept, cur);
    }
    const labels = Array.from(deptMap.keys()).slice(0, 5);
    return {
      groups: labels,
      segments: [
        {
          color: "#22C55E",
          label: "Completed",
          values: labels.map((l) => deptMap.get(l)!.done),
        },
        {
          color: "#06B6D4",
          label: "Active",
          values: labels.map((l) => deptMap.get(l)!.active),
        },
        {
          color: "#EF4444",
          label: "At Risk",
          values: labels.map((l) => deptMap.get(l)!.risk),
        },
      ],
    };
  })();

  /* ─── EVM ─── */
  const evm = (() => {
    const totalTasks = tasks.length;
    const doneCount = doneTasks.length;
    const inProgCount = inProgressTasks.length;
    const completion = totalTasks > 0 ? doneCount / totalTasks : 0;
    const PV =
      totalBudget > 0 ? totalBudget : Math.max(totalTasks * 8500, 1000);
    const EV = PV * completion;
    const AC =
      totalSpent > 0
        ? totalSpent
        : PV *
          (completion * 0.95 + (inProgCount / Math.max(totalTasks, 1)) * 0.3);
    const SV = EV - PV * Math.min(completion + 0.05, 1);
    const CV = EV - AC;
    const SPI = EV / Math.max(PV, 1);
    const CPI = EV / Math.max(AC, 1);
    return { PV, EV, AC, SV, CV, SPI, CPI };
  })();

  /* ─── Cost by project ─── */
  const costByProject = projects
    .map((p) => ({
      label: p.name,
      value:
        Math.round((p.budgetUSD ?? 0) / 1000) ||
        Math.round(
          (tasks
            .filter((t) => t.projectId === p.id)
            .reduce((s, t) => s + (t.timeSpent ?? 0), 0) *
            85) /
            1000,
        ),
    }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  while (costByProject.length < 3 && costByProject.length < projects.length) {
    const p = projects[costByProject.length];
    costByProject.push({ label: p?.name ?? "—", value: 12 });
  }

  /* ─── Regions ─── */
  const regionCounts = projects.reduce(
    (acc, p) => {
      const r = hashRegion(p.id);
      acc[r] += 1;
      return acc;
    },
    { west: 0, midwest: 0, south: 0, northeast: 0 },
  );

  /* ─── Team workload ─── */
  const teamWorkload = members
    .slice(0, 5)
    .map((m) => {
      const assigned = assignedPerMember.get(m.id) ?? 0;
      const util = Math.min(100, Math.round((assigned / 5) * 100));
      return { member: m, assigned, util };
    })
    .sort((a, b) => b.util - a.util);

  /* ─── Top risks ─── */
  const topRisks = tasks
    .filter(
      (t) =>
        t.status === "blocked" ||
        (t.priority === "urgent" && t.status !== "done"),
    )
    .slice(0, 5)
    .map((t) => ({
      task: t,
      project: projects.find((p) => p.id === t.projectId),
    }));
  if (topRisks.length === 0) {
    overdueTasks.slice(0, 5).forEach((t) => {
      topRisks.push({
        task: t,
        project: projects.find((p) => p.id === t.projectId),
      });
    });
  }

  /* ─── Issue tracker ─── */
  const recentIssues = tasks
    .filter((t) => t.status === "blocked" || t.status === "in_review")
    .slice(0, 5);

  /* ─── Render ─── */
  return (
    <div
      data-vyne-dash="true"
      style={{
        flex: 1,
        overflow: "auto",
        padding: "20px 24px 36px",
        background:
          "radial-gradient(1200px 600px at 0% 0%, rgba(108,71,255,0.05), transparent 60%), radial-gradient(1000px 500px at 100% 0%, rgba(6,182,212,0.05), transparent 60%), var(--content-bg-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Static, layout-stable polish: shadow/border on hover only — no
       *  translateY (was causing cards to bounce on every Zustand re-render)
       *  and no entry animation (was re-firing every render). All scoped
       *  via [data-vyne-dash] so global CSS isn't touched. */}
      <style>{`
        [data-vyne-dash="true"] section {
          transition: box-shadow 200ms ease, border-color 200ms ease;
        }
        [data-vyne-dash="true"] section:hover {
          box-shadow: 0 6px 18px -10px rgba(0,0,0,0.18), 0 2px 6px -4px rgba(108,71,255,0.12);
          border-color: rgba(108,71,255,0.22);
        }
        [data-vyne-dash="true"] [data-vyne-kpi] {
          transition: box-shadow 200ms ease, border-color 200ms ease;
        }
        [data-vyne-dash="true"] [data-vyne-kpi]:hover {
          box-shadow: 0 8px 20px -12px rgba(0,0,0,0.22), 0 3px 8px -5px var(--vyne-accent, #06B6D4);
          border-color: rgba(108,71,255,0.24);
        }
        /* Charts must not squash to 0 — keep them readable on every layout */
        [data-vyne-dash="true"] section svg { min-height: 80px; display: block; max-width: 100%; }
        /* Tables: allow 2-line wrap instead of brutal nowrap-ellipsis */
        [data-vyne-dash="true"] table td { white-space: normal; word-break: break-word; }
        /* Hero banner: stack the metric column on phones so it doesn't clip */
        @media (max-width: 720px) {
          [data-vyne-dash="true"] > div:first-of-type > div:last-child {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.25);
            padding-top: 12px;
            margin-top: 4px;
          }
        }
      `}</style>

      {/* Hero */}
      <HeroBanner
        greeting={`${greetingFor()} — here's your portfolio pulse`}
        totalProjects={projects.length}
        activeProjects={activeProjects.length}
        doneToday={doneToday}
        health={healthScore}
      />

      {/* KPI strip — gradient tiles with mini sparklines */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {kpis.map((k) => (
          <GradientKpiTile key={k.label} {...k} />
        ))}
      </div>

      {/* Row: Progress rings + activity calendar + weather strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <Target size={13} /> Sprint Velocity
            </>
          }
        >
          <ProgressRings
            rings={[
              {
                color: "#22C55E",
                value: doneTasks.length,
                max: tasks.length || 1,
                label: "Tasks Done",
              },
              {
                color: "#06B6D4",
                value: inProgressTasks.length,
                max: Math.max(tasks.length / 2, 1),
                label: "In Progress",
              },
              {
                color: "#F59E0B",
                value: budgetUtilPct,
                max: 100,
                label: "Budget Used",
              },
            ]}
          />
        </Card>
        <Card
          title={
            <>
              <Activity size={13} /> Activity Heatmap (12 weeks)
            </>
          }
        >
          <ActivityCalendar data={activityMap} weeks={12} />
        </Card>
        <Card
          title={
            <>
              <Sparkles size={13} /> Project Weather
            </>
          }
        >
          <ProjectWeatherStrip projects={projects} tasks={tasks} />
        </Card>
      </div>

      {/* Portfolio Gantt — full width */}
      <Card title="Portfolio Gantt">
        <PortfolioGantt projects={projects} tasks={tasks} />
      </Card>

      {/* Row: Donut + Burndown area + Resource bars */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Projects by Progress">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={progressSegments}
              centerValue={projects.length.toString()}
              centerLabel="Projects"
            />
            <Legend
              items={progressSegments.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card
          title={
            <>
              <Zap size={13} /> Burndown · Forecast
            </>
          }
        >
          <AreaChart
            series={[
              { color: "#22C55E", values: burndownSeries },
              { color: "#94A3B8", values: burndownTarget },
            ]}
            forecast={{
              steps: 5,
              spread: Math.max(
                1,
                Math.round(burndownSeries.at(-1) ?? 1) * 0.05,
              ),
            }}
            height={150}
          />
          <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#22C55E",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Actual
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#94A3B8",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Target
            </span>
            <span style={{ color: "var(--text-tertiary)", marginLeft: "auto" }}>
              shaded = forecast cone
            </span>
          </div>
        </Card>
        <Card title="Resource Allocation">
          <BarChart
            bars={
              allocByRole.length
                ? allocByRole
                : [{ label: "No data", value: 0 }]
            }
            horizontal
            width={300}
          />
        </Card>
      </div>

      {/* Row: Risk heatmap + Task flow + Cycle time histogram */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Risk Heat Map">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <HeatMap
              rows={5}
              cols={5}
              values={heatValues}
              rowLabels={["Very High", "High", "Med", "Low", "Very Low"]}
              colLabels={["VL", "L", "M", "H", "VH"]}
            />
          </div>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Likelihood (y) × Impact (x)
          </p>
        </Card>
        <Card title="Task Flow">
          <TaskFlowFunnel stages={flowStages} />
        </Card>
        <Card title="Cycle Time Distribution">
          <CycleTimeHistogram tasks={tasks} />
          <div
            style={{ display: "flex", gap: 8, fontSize: 10, flexWrap: "wrap" }}
          >
            {[
              { label: "Done", color: "#22C55E" },
              { label: "Review", color: "#A855F7" },
              { label: "In Progress", color: "#06B6D4" },
              { label: "Todo", color: "#94A3B8" },
              { label: "Blocked", color: "#EF4444" },
            ].map((s) => (
              <span key={s.label} style={{ color: "var(--text-secondary)" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: s.color,
                    display: "inline-block",
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Row: Team radar + Tag bubble cloud + Workload treemap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Team Capacity Radar">
          {radarSeries.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Add team members to see capacity.
            </p>
          ) : (
            <>
              <RadarChart axes={radarAxes} series={radarSeries} />
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  gap: 8,
                  fontSize: 10.5,
                  flexWrap: "wrap",
                }}
              >
                {radarSeries.map((s) => (
                  <li key={s.name} style={{ color: "var(--text-secondary)" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: s.color,
                        display: "inline-block",
                        borderRadius: 2,
                        marginRight: 4,
                      }}
                    />
                    {s.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card title="Tag / Priority Cloud">
          <BubbleCloud bubbles={bubbleData} />
        </Card>
        <Card title="Workload by Project (Treemap)">
          <Treemap
            items={
              workloadByProject.length
                ? workloadByProject
                : [{ label: "No open work", value: 1, color: "#94A3B8" }]
            }
          />
        </Card>
      </div>

      {/* Row: Portfolio Health + EVM + Variance + Cost */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Portfolio Health">
          <Gauge
            value={healthScore}
            max={100}
            label={
              healthScore >= 80
                ? "Good"
                : healthScore >= 60
                  ? "Watch"
                  : "Critical"
            }
          />
        </Card>
        <Card title="Earned Value (EVM)">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                PV (Planned)
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {fmtMoney(evm.PV)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                EV (Earned)
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#22C55E" }}>
                {fmtMoney(evm.EV)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                AC (Actual)
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#F59E0B" }}>
                {fmtMoney(evm.AC)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                SPI / CPI
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {evm.SPI.toFixed(2)} / {evm.CPI.toFixed(2)}
              </div>
            </div>
          </div>
        </Card>
        <Card title="Schedule Variance">
          <Gauge
            value={Math.round((evm.SPI - 1) * 100)}
            max={20}
            label={evm.SPI >= 1 ? "On schedule" : "Behind"}
            goodWhen="high"
            unit="%"
          />
        </Card>
        <Card title="Cost Performance">
          <Gauge
            value={Math.round((evm.CPI - 1) * 100)}
            max={20}
            label={evm.CPI >= 1 ? "Under budget" : "Over budget"}
            goodWhen="high"
            unit="%"
          />
        </Card>
        <Card title="Cost by Project (Top 5)" style={{ gridColumn: "span 2" }}>
          <BarChart
            bars={costByProject.map((b) => ({
              label: b.label,
              value: b.value,
            }))}
            horizontal
            width={420}
          />
          <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
            Values in $K
          </p>
        </Card>
      </div>

      {/* Row: Dept bars + US map + Recent activities */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Project Status by Department">
          <StackedBars
            groups={deptSegments.groups.length ? deptSegments.groups : ["—"]}
            segments={deptSegments.segments}
            height={150}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
            {deptSegments.segments.map((s) => (
              <span key={s.label} style={{ color: "var(--text-secondary)" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: s.color,
                    display: "inline-block",
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Project Locations">
          <USRegionMap counts={regionCounts} />
        </Card>
        <Card title="Recent Activity">
          {recentActivity.length === 0 ? (
            <p
              style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}
            >
              No recent activity.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 11,
              }}
            >
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "var(--content-secondary)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    <strong style={{ fontWeight: 600 }}>
                      {a.actor ?? "You"}
                    </strong>{" "}
                    {a.verb} {a.summary}
                  </span>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Row: Team workload + Top risks + Issue tracker */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Team Workload">
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {teamWorkload.length === 0 && (
              <li style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                No team members.
              </li>
            )}
            {teamWorkload.map(({ member, assigned, util }) => (
              <li
                key={member.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px 1fr 60px 36px",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: member.color,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {member.initials}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.name}
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: 10,
                      marginLeft: 6,
                    }}
                  >
                    {member.role}
                  </span>
                </span>
                <span
                  style={{
                    background: "var(--content-secondary)",
                    borderRadius: 4,
                    height: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${util}%`,
                      background: `linear-gradient(90deg, ${util > 80 ? "#EF4444" : util > 60 ? "#F59E0B" : "#22C55E"}, ${util > 80 ? "#DC2626" : util > 60 ? "#EA580C" : "#16A34A"})`,
                      borderRadius: 4,
                    }}
                  />
                </span>
                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {assigned}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Top Risks Register"
          actions={
            <Link
              href="/projects"
              style={{
                fontSize: 11,
                color: "var(--vyne-accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              View all <ArrowRight size={11} />
            </Link>
          }
        >
          {topRisks.length === 0 ? (
            <p
              style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}
            >
              No active risks.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                fontSize: 11,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{ color: "var(--text-tertiary)", textAlign: "left" }}
                >
                  <th style={{ fontWeight: 500, padding: "4px 6px" }}>Risk</th>
                  <th
                    style={{
                      fontWeight: 500,
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map(({ task: t, project: p }) => (
                  <tr
                    key={t.id}
                    style={{ borderTop: "1px solid var(--content-border)" }}
                  >
                    <td
                      style={{ padding: "6px", color: "var(--text-primary)" }}
                    >
                      <Link
                        href={`/projects/${t.projectId}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {t.title}
                      </Link>
                      <div
                        style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                      >
                        {p?.name ?? "—"}
                      </div>
                    </td>
                    <td style={{ padding: "6px", textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 7px",
                          borderRadius: 999,
                          color:
                            t.priority === "urgent"
                              ? "#B91C1C"
                              : t.priority === "high"
                                ? "#C2410C"
                                : "#1E40AF",
                          background:
                            t.priority === "urgent"
                              ? "rgba(220,38,38,0.1)"
                              : t.priority === "high"
                                ? "rgba(217,119,6,0.1)"
                                : "rgba(37,99,235,0.08)",
                        }}
                      >
                        {t.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title="Issue Tracker"
          actions={
            <Link
              href="/projects/tasks"
              style={{
                fontSize: 11,
                color: "var(--vyne-accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              All issues <ArrowRight size={11} />
            </Link>
          }
        >
          {recentIssues.length === 0 ? (
            <p
              style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}
            >
              No open issues — nice work.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                fontSize: 11,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{ color: "var(--text-tertiary)", textAlign: "left" }}
                >
                  <th style={{ fontWeight: 500, padding: "4px 6px" }}>Issue</th>
                  <th
                    style={{
                      fontWeight: 500,
                      padding: "4px 6px",
                      textAlign: "right",
                    }}
                  >
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderTop: "1px solid var(--content-border)" }}
                  >
                    <td
                      style={{ padding: "6px", color: "var(--text-primary)" }}
                    >
                      <Link
                        href={`/projects/${t.projectId}/tasks/${t.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {t.title}
                      </Link>
                      <div style={{ fontSize: 10 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 999,
                            color:
                              t.status === "blocked" ? "#B91C1C" : "#1E40AF",
                            background:
                              t.status === "blocked"
                                ? "rgba(220,38,38,0.1)"
                                : "rgba(37,99,235,0.08)",
                          }}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "right",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
