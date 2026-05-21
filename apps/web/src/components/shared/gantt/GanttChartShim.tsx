"use client";

import { GanttBoard, type GanttRow } from "./GanttBoard";
import type { GanttZoom } from "./timeline";

/**
 * Read-only shim that preserves the original `<GanttChart rows title dayWidth />`
 * signature. New code should use `<GanttBoard />` directly.
 */
export interface GanttChartProps {
  rows: GanttRow[];
  title?: string;
  /** Legacy prop. Mapped to the nearest zoom level. */
  dayWidth?: number;
}

function zoomForDayWidth(px?: number): GanttZoom {
  if (!px) return "week";
  if (px >= 30) return "day";
  if (px >= 16) return "week";
  if (px >= 6) return "month";
  return "quarter";
}

export function GanttChart({ rows, title, dayWidth }: GanttChartProps) {
  return <GanttBoard rows={rows} title={title} zoom={zoomForDayWidth(dayWidth)} readOnly />;
}
