"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import {
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
 * VYNE shared dashboard primitives.
 *
 * One file, every chart/card/tile, no runtime deps beyond React +
 * lucide. Used by every module dashboard so the look is uniform
 * and the bundle ships these components exactly once. This is the
 * "design system" layer for analytics surfaces.
 * ═══════════════════════════════════════════════════════════════ */

export const CHART_COLORS = [
  "#6C47FF",
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export const STATUS_COLORS: Record<string, string> = {
  todo: "#94A3B8",
  in_progress: "#06B6D4",
  in_review: "#A855F7",
  done: "#22C55E",
  blocked: "#EF4444",
  cancelled: "#64748B",
  draft: "#94A3B8",
  pending: "#F59E0B",
  approved: "#22C55E",
  rejected: "#EF4444",
};

const CARD: CSSProperties = {
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
  borderRadius: 14,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 0,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
};

/* ─── Card ─────────────────────────────────────────────────────── */

export function Card({
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

/* ─── Hero banner ──────────────────────────────────────────────── */

export function HeroBanner({
  greeting,
  metrics,
  accent = "#22C55E",
}: {
  greeting: string;
  metrics: { label: string; value: string | number }[];
  accent?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        padding: "18px 22px",
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.95) 0%, rgba(6,182,212,0.9) 55%, rgba(34,197,94,0.85) 100%)",
        color: "#fff",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 18,
        alignItems: "center",
      }}
    >
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
          <radialGradient id="vyne-pulseDot" cx="50%" cy="50%" r="50%">
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
            fill="url(#vyne-pulseDot)"
          />
        ))}
      </svg>

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
              background: accent,
              animation: "vyne-pulse 2s infinite",
            }}
          />
          Live overview
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
          gap: 18,
          paddingLeft: 20,
          borderLeft: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        {metrics.slice(0, 3).map((m) => (
          <div key={m.label}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── KPI tile ─────────────────────────────────────────────────── */

export interface GradientKpiTileProps {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon: ReactNode;
  accent: string;
  sparkline?: number[];
}

export function GradientKpiTile({
  label,
  value,
  delta,
  positive,
  icon,
  accent,
  sparkline,
}: GradientKpiTileProps) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
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

/* ─── Sparkline ────────────────────────────────────────────────── */

export function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
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

/* ─── Donut + Legend ───────────────────────────────────────────── */

export function Donut({
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
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` };
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

export function Legend({
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

/* ─── Area chart with gradient + optional forecast cone ────────── */

export function AreaChart({
  series,
  forecast,
  width = 320,
  height = 140,
}: {
  series: { color: string; values: number[]; label?: string }[];
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
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        const area = `${x(0)},${pad.t + innerH} ${pts} ${x(s.values.length - 1)},${pad.t + innerH}`;
        return (
          <g key={si}>
            <polygon
              points={area}
              fill={`url(#area-${reactId}-${si}-${s.color.replace("#", "")})`}
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

/* ─── Bar chart (vertical + horizontal) ─────────────────────────── */

export function BarChart({
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

/* ─── Stacked bars ─────────────────────────────────────────────── */

export function StackedBars({
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
  const bw = innerW / Math.max(groups.length, 1) - 8;
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

/* ─── Heat map ─────────────────────────────────────────────────── */

export function HeatMap({
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
      {rowLabels?.map((lbl, i) => (
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
      {colLabels?.map((lbl, j) => (
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

/* ─── Gauge ────────────────────────────────────────────────────── */

export function Gauge({
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

/* ─── Concentric progress rings ────────────────────────────────── */

export function ProgressRings({
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

/* ─── Activity calendar heatmap ────────────────────────────────── */

export function ActivityCalendar({
  data,
  weeks = 12,
  tone = "#10B981",
}: {
  data: Map<string, number>;
  weeks?: number;
  tone?: string;
}) {
  const cell = 13;
  const gap = 3;
  const w = weeks * (cell + gap) + 60;
  const h = 7 * (cell + gap) + 18;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { x: number; y: number; v: number; iso: string }[] = [];
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - weeks * 7 + 1);
  const startWeekday = startDay.getDay();
  for (let wi = 0; wi < weeks; wi++) {
    for (let d = 0; d < 7; d++) {
      const idx = wi * 7 + d;
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + idx - startWeekday);
      if (date > today) continue;
      const iso = date.toISOString().slice(0, 10);
      days.push({ x: wi, y: d, v: data.get(iso) ?? 0, iso });
    }
  }
  const max = Math.max(...Array.from(data.values()), 1);
  const colorFor = (v: number) => {
    if (v === 0) return "var(--content-secondary)";
    const r = v / max;
    const a = r < 0.25 ? 0.25 : r < 0.5 ? 0.5 : r < 0.75 ? 0.75 : 1;
    return `${tone}${Math.round(a * 255)
      .toString(16)
      .padStart(2, "0")}`;
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

/* ─── Radar chart ──────────────────────────────────────────────── */

export function RadarChart({
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
  const N = Math.max(axes.length, 3);
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

/* ─── Bubble cloud ─────────────────────────────────────────────── */

export function BubbleCloud({
  bubbles,
  width = 320,
  height = 180,
}: {
  bubbles: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
}) {
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

/* ─── Funnel ───────────────────────────────────────────────────── */

export function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const w = Math.max(140 * stages.length, 280);
  return (
    <svg
      width="100%"
      height={150}
      viewBox={`0 0 ${w} 150`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
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
                <line
                  x1={x + 110}
                  y1={75}
                  x2={x + 125}
                  y2={75}
                  stroke={s.color}
                  strokeWidth={2}
                />
                <path
                  d={`M ${x + 110} 75 L ${x + 125} 70 L ${x + 125} 80 Z`}
                  fill={s.color}
                  fillOpacity={0.5}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Treemap ──────────────────────────────────────────────────── */

export function Treemap({
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
    const remainingShare =
      items.slice(i).reduce((s, x) => s + x.value, 0) / total;
    if (horizontal) {
      const w = Math.max(
        remainingW * (ratio / Math.max(remainingShare, 0.001)),
        30,
      );
      rects.push({ x, y, w, h: remainingH, item: it });
      x += w;
      remainingW -= w;
    } else {
      const h = Math.max(
        remainingH * (ratio / Math.max(remainingShare, 0.001)),
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

/* ─── Weather strip (sun/cloud/rain per item) ──────────────────── */

export function WeatherStrip({
  items,
}: {
  items: {
    id: string;
    label: string;
    mood: "sun" | "cloudsun" | "cloud" | "rain";
    hint?: string;
    href?: string;
  }[];
}) {
  const TONE: Record<(typeof items)[number]["mood"], string> = {
    sun: "#F59E0B",
    cloudsun: "#06B6D4",
    cloud: "#94A3B8",
    rain: "#3B82F6",
  };
  const Icon = ({ m }: { m: (typeof items)[number]["mood"] }) => {
    if (m === "sun") return <Sun size={20} />;
    if (m === "cloudsun") return <CloudSun size={20} />;
    if (m === "cloud") return <Cloud size={20} />;
    return <CloudRain size={20} />;
  };
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        Nothing to forecast yet.
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
      {items.map((it) => {
        const tone = TONE[it.mood];
        const Wrapper: React.ElementType = it.href ? "a" : "div";
        const wrapperProps = it.href ? { href: it.href } : {};
        return (
          <Wrapper
            key={it.id}
            {...wrapperProps}
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
            }}
          >
            <span aria-hidden="true" style={{ color: tone }}>
              <Icon m={it.mood} />
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
              {it.label}
            </span>
            {it.hint && (
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {it.hint}
              </span>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}

/* ─── Histogram (stacked by status/category) ──────────────────── */

export function Histogram({
  buckets,
  series,
  width = 320,
  height = 150,
}: {
  buckets: string[];
  series: { color: string; values: number[]; label: string }[];
  width?: number;
  height?: number;
}) {
  const totals = buckets.map((_, i) =>
    series.reduce((s, seg) => s + (seg.values[i] ?? 0), 0),
  );
  const max = Math.max(...totals, 1);
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const bw = innerW / Math.max(buckets.length, 1) - 6;
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
            {series.map((seg) => {
              const v = seg.values[i] ?? 0;
              const sh = total > 0 ? (v / total) * h : 0;
              yAcc -= sh;
              return (
                <rect
                  key={seg.label}
                  x={x}
                  y={yAcc}
                  width={bw}
                  height={sh}
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
              {b}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── US 4-region map ──────────────────────────────────────────── */

export function USRegionMap({
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

/* ─── Greeting helper ──────────────────────────────────────────── */

export function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night session";
}

/* ─── Money formatter ──────────────────────────────────────────── */

export function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

/* ─── Relative time ────────────────────────────────────────────── */

export function relativeTime(iso: string): string {
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
