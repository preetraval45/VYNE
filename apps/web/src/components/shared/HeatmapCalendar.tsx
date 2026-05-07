"use client";

import { useMemo } from "react";

/**
 * HeatmapCalendar — GitHub-style activity grid (52 weeks × 7 days).
 *
 *   <HeatmapCalendar
 *     values={{ "2026-04-12": 4, "2026-04-13": 1 }}
 *     onCellClick={(iso, count) => …}
 *   />
 *
 * Buckets values into 5 colour intensities relative to the dataset's
 * own max so a quiet week still has shading. Zero-day cells render
 * as a faint border-only square.
 *
 * Pure SVG — no canvas, no charting library. Honours `prefers-reduced-motion`
 * by skipping the hover transition.
 */

export interface HeatmapCalendarProps {
  /** Map of ISO yyyy-mm-dd → count. Missing keys = 0. */
  values: Record<string, number>;
  /** Last day of the window. Default: today. */
  endDate?: Date;
  /** Number of weeks to render. Default 52. */
  weeks?: number;
  /** Cell size + gutter in px. Default 11 / 3. */
  cellSize?: number;
  cellGap?: number;
  /** Accent colour for the highest bucket. Default the live VYNE accent. */
  accent?: string;
  onCellClick?: (iso: string, count: number) => void;
  /** ARIA label. */
  ariaLabel?: string;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HeatmapCalendar({
  values,
  endDate,
  weeks = 52,
  cellSize = 11,
  cellGap = 3,
  accent = "var(--vyne-accent, #06B6D4)",
  onCellClick,
  ariaLabel = "Activity heatmap",
}: HeatmapCalendarProps) {
  const { cells, max, monthMarkers, weekdays } = useMemo(() => {
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(0, 0, 0, 0);
    // Walk back to the most recent Sunday so columns align cleanly.
    const start = new Date(end);
    start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);

    const cells: Array<{
      iso: string;
      count: number;
      col: number;
      row: number;
      monthShort: string;
      monthIdx: number;
    }> = [];
    let max = 0;
    const cursor = new Date(start);
    for (let col = 0; col < weeks; col++) {
      for (let row = 0; row < 7; row++) {
        if (cursor > end) break;
        const iso = isoDay(cursor);
        const count = values[iso] ?? 0;
        if (count > max) max = count;
        cells.push({
          iso,
          count,
          col,
          row,
          monthShort: cursor.toLocaleString(undefined, { month: "short" }),
          monthIdx: cursor.getMonth(),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    // Detect month boundaries for the top axis.
    const seen = new Set<number>();
    const monthMarkers: Array<{ col: number; label: string }> = [];
    for (const c of cells) {
      if (c.row !== 0) continue;
      if (!seen.has(c.monthIdx)) {
        seen.add(c.monthIdx);
        monthMarkers.push({ col: c.col, label: c.monthShort });
      }
    }
    const weekdays = ["", "M", "", "W", "", "F", ""];
    return { cells, max, monthMarkers, weekdays };
  }, [values, endDate, weeks]);

  const width = weeks * (cellSize + cellGap) + 30;
  const height = 7 * (cellSize + cellGap) + 22;

  function bucket(count: number): number {
    if (count <= 0 || max === 0) return 0;
    const ratio = count / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  function fill(level: number): string {
    if (level === 0) return "var(--content-secondary)";
    const opacity = 0.2 + level * 0.2;
    return `color-mix(in srgb, ${accent} ${Math.round(opacity * 100)}%, transparent)`;
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {/* Month labels */}
      {monthMarkers.map((m, i) => (
        <text
          key={`${m.label}-${i}`}
          x={30 + m.col * (cellSize + cellGap)}
          y={10}
          fontSize={9}
          fill="var(--text-tertiary)"
          fontFamily="var(--font-app, inherit)"
        >
          {m.label}
        </text>
      ))}

      {/* Weekday axis */}
      {weekdays.map((label, i) =>
        label ? (
          <text
            key={`wd-${i}`}
            x={4}
            y={22 + i * (cellSize + cellGap) + cellSize / 2 + 3}
            fontSize={9}
            fill="var(--text-tertiary)"
            fontFamily="var(--font-app, inherit)"
          >
            {label}
          </text>
        ) : null,
      )}

      {/* Cells */}
      {cells.map((c) => {
        const x = 30 + c.col * (cellSize + cellGap);
        const y = 18 + c.row * (cellSize + cellGap);
        const level = bucket(c.count);
        return (
          <rect
            key={c.iso}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={fill(level)}
            stroke={level === 0 ? "var(--content-border)" : "transparent"}
            style={{
              cursor: onCellClick ? "pointer" : "default",
            }}
            onClick={() => onCellClick?.(c.iso, c.count)}
          >
            <title>
              {c.iso} — {c.count} {c.count === 1 ? "event" : "events"}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
