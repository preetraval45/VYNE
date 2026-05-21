// Re-export of the read-only Gantt shim for back-compat with pre-Phase-1 callers.
// New code should import from "@/components/shared/gantt" instead.
export { GanttChart } from "./gantt/GanttChartShim";
export type { GanttRow } from "./gantt/GanttBoard";
