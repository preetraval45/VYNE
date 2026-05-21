export { GanttBoard } from "./GanttBoard";
export type {
  GanttBoardProps,
  GanttRow,
  GanttDependency,
  GanttGroupBy,
  DependencyType,
} from "./GanttBoard";
export type { GanttZoom } from "./timeline";
export {
  ZOOM_DAY_WIDTH,
  ZOOM_GRID_STEP,
  computeTimelineWindow,
  dateToOffset,
  offsetToDate,
  spanWidth,
  shiftRange,
  resizeRange,
  daysBetween,
  addDays,
  startOfDay,
  toIsoDate,
} from "./timeline";

// Back-compat: the older read-only `<GanttChart rows={…} />` callers still work.
export { GanttChart } from "./GanttChartShim";
