// Pure date math for the Gantt engine. No React, no DOM — safe to unit test.
//
// All math is performed in UTC so the result of `daysBetween`,
// `isWeekend`, etc. is the same regardless of the host timezone.
// Project / task dates are treated as **calendar dates**, not UTC moments —
// the same convention an Odoo-style project Gantt uses.

export const MS_PER_DAY = 86_400_000;

export type GanttZoom = "day" | "week" | "month" | "quarter";

/** Pixels per day at each zoom level. */
export const ZOOM_DAY_WIDTH: Record<GanttZoom, number> = {
  day: 36,
  week: 24,
  month: 8,
  quarter: 3,
};

/** Spacing of vertical gridlines (in days) at each zoom level. */
export const ZOOM_GRID_STEP: Record<GanttZoom, number> = {
  day: 1,
  week: 7,
  month: 7,
  quarter: 30,
};

export function startOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

export function addDays(d: Date, n: number): Date {
  const out = startOfDay(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function isWeekend(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

export function formatTick(d: Date, zoom: GanttZoom): string {
  const opts: Intl.DateTimeFormatOptions =
    zoom === "quarter"
      ? { month: "short", year: "2-digit", timeZone: "UTC" }
      : { month: "short", day: "numeric", timeZone: "UTC" };
  return d.toLocaleDateString(undefined, opts);
}

export interface TimelineWindow {
  origin: Date;
  totalDays: number;
  gridStep: number;
  dayWidth: number;
  /** Total px width of the timeline body. */
  timelineWidth: number;
  /** Tick marks for the column header. */
  ticks: Date[];
}

export interface ComputeWindowInput {
  starts: number[];
  ends: number[];
  zoom: GanttZoom;
  /** Pad days before earliest start and after latest end so bars aren't flush. */
  padDays?: number;
}

export function computeTimelineWindow({
  starts,
  ends,
  zoom,
  padDays = 2,
}: ComputeWindowInput): TimelineWindow {
  const dayWidth = ZOOM_DAY_WIDTH[zoom];
  const gridStep = ZOOM_GRID_STEP[zoom];

  if (starts.length === 0 || ends.length === 0) {
    const now = startOfDay(new Date());
    return {
      origin: now,
      totalDays: 30,
      gridStep,
      dayWidth,
      timelineWidth: 30 * dayWidth,
      ticks: [],
    };
  }
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const origin = addDays(startOfDay(new Date(minStart)), -padDays);
  const total = Math.max(14, daysBetween(origin, new Date(maxEnd)) + padDays + 2);

  const ticks: Date[] = [];
  for (let i = 0; i <= total; i += gridStep) {
    ticks.push(addDays(origin, i));
  }

  return {
    origin,
    totalDays: total,
    gridStep,
    dayWidth,
    timelineWidth: total * dayWidth,
    ticks,
  };
}

/** Convert a date to its px offset from `origin`. */
export function dateToOffset(date: Date, origin: Date, dayWidth: number): number {
  return daysBetween(origin, date) * dayWidth;
}

/** Convert a px offset back to a date (snapped to whole days). */
export function offsetToDate(offset: number, origin: Date, dayWidth: number): Date {
  const days = Math.round(offset / dayWidth);
  return addDays(origin, days);
}

/** Width (in px) of a bar spanning `[start, end]` inclusive. Always ≥ 1 day. */
export function spanWidth(start: Date, end: Date, dayWidth: number): number {
  const days = Math.max(1, daysBetween(start, end) + 1);
  return days * dayWidth;
}

/** Shift both ends of a date range by the same number of days. */
export function shiftRange(
  start: Date,
  end: Date,
  deltaDays: number,
): { start: Date; end: Date } {
  return { start: addDays(start, deltaDays), end: addDays(end, deltaDays) };
}

/** Resize one edge of a range. Guarantees end >= start. */
export function resizeRange(
  start: Date,
  end: Date,
  edge: "start" | "end",
  deltaDays: number,
): { start: Date; end: Date } {
  if (edge === "start") {
    const next = addDays(start, deltaDays);
    return { start: next > end ? end : next, end };
  }
  const next = addDays(end, deltaDays);
  return { start, end: next < start ? start : next };
}

export function toIsoDate(d: Date): string {
  return startOfDay(d).toISOString();
}
