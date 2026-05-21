"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  addDays,
  computeTimelineWindow,
  dateToOffset,
  formatTick,
  isWeekend,
  offsetToDate,
  resizeRange,
  shiftRange,
  spanWidth,
  startOfDay,
  toIsoDate,
  type GanttZoom,
} from "./timeline";
import { criticalPath } from "@/lib/reporting/criticalPath";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export interface GanttRow {
  id: string;
  parentId?: string;
  groupId?: string;
  label: string;
  /** ISO date */
  start: string;
  /** ISO date */
  end: string;
  progress?: number;
  color?: string;
  assigneeIds?: string[];
  status?: string;
  priority?: "urgent" | "high" | "medium" | "low";
  milestone?: boolean;
  meta?: string;
  href?: string;
}

export interface GanttDependency {
  fromId: string;
  toId: string;
  type?: DependencyType;
}

export type GanttGroupBy =
  | "none"
  | "assignee"
  | "status"
  | "priority"
  | "project"
  | "custom";

export interface GanttBoardProps {
  rows: GanttRow[];
  dependencies?: GanttDependency[];
  groupBy?: GanttGroupBy;
  /** Custom group label lookup when `groupBy === "custom"`. */
  groupLabel?: (groupId: string) => string;
  zoom?: GanttZoom;
  showCriticalPath?: boolean;
  showWeekends?: boolean;
  readOnly?: boolean;
  title?: string;
  /** Width of the left-hand label column in px. */
  labelColumnWidth?: number;
  onRescheduleRow?: (
    id: string,
    start: string,
    end: string,
  ) => void | Promise<void>;
  onResizeRow?: (
    id: string,
    start: string,
    end: string,
  ) => void | Promise<void>;
  onLinkDependency?: (fromId: string, toId: string) => void;
  onRowClick?: (id: string) => void;
}

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 36;
const GROUP_HEADER_HEIGHT = 28;

interface DragState {
  rowId: string;
  mode: "move" | "resize-start" | "resize-end" | "link";
  startX: number;
  startStart: Date;
  startEnd: Date;
  deltaDays: number;
  /** For dependency link mode — current pointer offset in px. */
  pointerX?: number;
  pointerY?: number;
}

function defaultColorForRow(row: GanttRow): string {
  if (row.color) return row.color;
  if (row.priority === "urgent") return "#EF4444";
  if (row.priority === "high") return "#F59E0B";
  if (row.status === "done") return "#22C55E";
  return "var(--vyne-accent, var(--vyne-purple, #6C47FF))";
}

function groupKeyForRow(row: GanttRow, groupBy: GanttGroupBy): string {
  switch (groupBy) {
    case "assignee":
      return row.assigneeIds?.[0] ?? "unassigned";
    case "status":
      return row.status ?? "no-status";
    case "priority":
      return row.priority ?? "no-priority";
    case "project":
    case "custom":
      return row.groupId ?? "default";
    default:
      return "all";
  }
}

function defaultGroupLabel(groupBy: GanttGroupBy, key: string): string {
  if (groupBy === "none") return "All";
  if (key === "unassigned") return "Unassigned";
  if (key === "no-status") return "No status";
  if (key === "no-priority") return "No priority";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function GanttBoard({
  rows,
  dependencies = [],
  groupBy = "none",
  groupLabel,
  zoom = "week",
  showCriticalPath = false,
  showWeekends = true,
  readOnly = false,
  title,
  labelColumnWidth = 220,
  onRescheduleRow,
  onResizeRow,
  onLinkDependency,
  onRowClick,
}: GanttBoardProps) {
  // ─── Window math ────────────────────────────────────────────────
  const { origin, totalDays, ticks, dayWidth, timelineWidth, gridStep } = useMemo(
    () =>
      computeTimelineWindow({
        starts: rows.map((r) => new Date(r.start).getTime()),
        ends: rows.map((r) => new Date(r.end).getTime()),
        zoom,
      }),
    [rows, zoom],
  );

  // ─── Group + ordering ───────────────────────────────────────────
  const orderedGroups = useMemo(() => {
    const map = new Map<string, GanttRow[]>();
    for (const r of rows) {
      const k = groupKeyForRow(r, groupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows, groupBy]);

  /** Y-offset (in px) of each row in the visible stack, including group headers. */
  const rowYOffsets = useMemo(() => {
    const out = new Map<string, number>();
    let y = 0;
    for (const [, groupRows] of orderedGroups) {
      if (groupBy !== "none") y += GROUP_HEADER_HEIGHT;
      for (const r of groupRows) {
        out.set(r.id, y);
        y += ROW_HEIGHT;
      }
    }
    return out;
  }, [orderedGroups, groupBy]);

  const totalBodyHeight = useMemo(() => {
    let h = 0;
    for (const [, groupRows] of orderedGroups) {
      if (groupBy !== "none") h += GROUP_HEADER_HEIGHT;
      h += groupRows.length * ROW_HEIGHT;
    }
    return h;
  }, [orderedGroups, groupBy]);

  // ─── Critical path ──────────────────────────────────────────────
  const criticalSet = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    const tasks = rows.map((r) => ({
      id: r.id,
      duration: Math.max(
        1,
        Math.round(
          (new Date(r.end).getTime() - new Date(r.start).getTime()) / 86_400_000,
        ) + 1,
      ),
      dependencies: dependencies
        .filter((d) => d.toId === r.id)
        .map((d) => d.fromId),
    }));
    return criticalPath(tasks).ids;
  }, [rows, dependencies, showCriticalPath]);

  // ─── Drag state ────────────────────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const beginDrag = useCallback(
    (
      e: ReactPointerEvent<HTMLElement>,
      row: GanttRow,
      mode: DragState["mode"],
    ) => {
      if (readOnly && mode !== "link") return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDrag({
        rowId: row.id,
        mode,
        startX: e.clientX,
        startStart: startOfDay(new Date(row.start)),
        startEnd: startOfDay(new Date(row.end)),
        deltaDays: 0,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    },
    [readOnly],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const deltaDays = Math.round(delta / dayWidth);
      setDrag({
        ...drag,
        deltaDays,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    },
    [drag, dayWidth],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!drag) return;
      const row = rows.find((r) => r.id === drag.rowId);
      if (!row) {
        setDrag(null);
        return;
      }

      if (drag.mode === "move" && drag.deltaDays !== 0) {
        const next = shiftRange(drag.startStart, drag.startEnd, drag.deltaDays);
        void onRescheduleRow?.(row.id, toIsoDate(next.start), toIsoDate(next.end));
      } else if (drag.mode === "resize-start" && drag.deltaDays !== 0) {
        const next = resizeRange(
          drag.startStart,
          drag.startEnd,
          "start",
          drag.deltaDays,
        );
        void onResizeRow?.(row.id, toIsoDate(next.start), toIsoDate(next.end));
      } else if (drag.mode === "resize-end" && drag.deltaDays !== 0) {
        const next = resizeRange(
          drag.startStart,
          drag.startEnd,
          "end",
          drag.deltaDays,
        );
        void onResizeRow?.(row.id, toIsoDate(next.start), toIsoDate(next.end));
      } else if (drag.mode === "link" && bodyRef.current) {
        // Resolve which row the pointer landed on.
        const bodyRect = bodyRef.current.getBoundingClientRect();
        const y = e.clientY - bodyRect.top + bodyRef.current.scrollTop;
        const target = findRowAtY(orderedGroups, groupBy, y);
        if (target && target.id !== drag.rowId) {
          onLinkDependency?.(drag.rowId, target.id);
        }
      }
      setDrag(null);
    },
    [
      drag,
      rows,
      onRescheduleRow,
      onResizeRow,
      onLinkDependency,
      orderedGroups,
      groupBy,
    ],
  );

  // ─── Keyboard nudge ─────────────────────────────────────────────
  const handleRowKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, row: GanttRow) => {
      if (readOnly) return;
      const shift = e.shiftKey;
      const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      if (step === 0) return;
      e.preventDefault();
      const start = startOfDay(new Date(row.start));
      const end = startOfDay(new Date(row.end));
      if (shift) {
        // Resize the end edge.
        const next = resizeRange(start, end, "end", step);
        void onResizeRow?.(row.id, toIsoDate(next.start), toIsoDate(next.end));
      } else {
        // Shift the entire bar.
        const next = shiftRange(start, end, step);
        void onRescheduleRow?.(row.id, toIsoDate(next.start), toIsoDate(next.end));
      }
    },
    [readOnly, onRescheduleRow, onResizeRow],
  );

  // ─── Today line ─────────────────────────────────────────────────
  const today = startOfDay(new Date());
  const todayOffset = dateToOffset(today, origin, dayWidth);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <section
      aria-label={title ?? "Gantt chart"}
      style={{
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--content-border)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${labelColumnWidth}px 1fr`,
        }}
      >
        {/* Left label column */}
        <LabelColumn
          orderedGroups={orderedGroups}
          groupBy={groupBy}
          groupLabel={groupLabel}
          onRowClick={onRowClick}
          width={labelColumnWidth}
        />

        {/* Timeline body */}
        <div
          ref={bodyRef}
          style={{ overflowX: "auto", position: "relative" }}
          onPointerMove={drag ? handlePointerMove : undefined}
          onPointerUp={drag ? handlePointerUp : undefined}
          onPointerCancel={drag ? handlePointerUp : undefined}
        >
          <div style={{ width: timelineWidth, position: "relative" }}>
            <TimelineHeader ticks={ticks} origin={origin} dayWidth={dayWidth} zoom={zoom} />

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= timelineWidth && (
              <div
                aria-label="Today"
                style={{
                  position: "absolute",
                  top: HEADER_HEIGHT,
                  bottom: 0,
                  left: todayOffset,
                  width: 2,
                  background: "var(--status-danger, #EF4444)",
                  zIndex: 4,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Group + row stack */}
            <div style={{ position: "relative", height: totalBodyHeight }}>
              {orderedGroups.map(([groupKey, groupRows], gi) => (
                <GanttGroup
                  key={`g-${gi}-${groupKey}`}
                  groupKey={groupKey}
                  groupRows={groupRows}
                  groupBy={groupBy}
                  groupLabel={groupLabel}
                  origin={origin}
                  dayWidth={dayWidth}
                  totalDays={totalDays}
                  gridStep={gridStep}
                  ticks={ticks}
                  showWeekends={showWeekends}
                  criticalSet={criticalSet}
                  drag={drag}
                  beginDrag={beginDrag}
                  readOnly={readOnly}
                  onRowClick={onRowClick}
                  onRowKeyDown={handleRowKeyDown}
                />
              ))}
            </div>

            {/* Dependency arrows */}
            {dependencies.length > 0 && (
              <DependencyOverlay
                dependencies={dependencies}
                rows={rows}
                origin={origin}
                dayWidth={dayWidth}
                rowYOffsets={rowYOffsets}
                criticalSet={criticalSet}
              />
            )}

            {/* Live link-mode pointer ghost */}
            {drag?.mode === "link" && drag.pointerX !== undefined && bodyRef.current && (
              <LinkPointerGhost drag={drag} bodyEl={bodyRef.current} rows={rows} origin={origin} dayWidth={dayWidth} rowYOffsets={rowYOffsets} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function LabelColumn({
  orderedGroups,
  groupBy,
  groupLabel,
  onRowClick,
  width,
}: {
  orderedGroups: Array<[string, GanttRow[]]>;
  groupBy: GanttGroupBy;
  groupLabel?: (groupId: string) => string;
  onRowClick?: (id: string) => void;
  width: number;
}) {
  return (
    <div
      style={{
        borderRight: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        width,
      }}
    >
      <div
        style={{
          height: HEADER_HEIGHT,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        Task
      </div>
      {orderedGroups.map(([groupKey, groupRows], gi) => (
        <div key={`lbl-g-${gi}-${groupKey}`}>
          {groupBy !== "none" && (
            <div
              style={{
                height: GROUP_HEADER_HEIGHT,
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: "var(--content-bg)",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              {(groupLabel?.(groupKey)) ?? defaultGroupLabel(groupBy, groupKey)}
              <span
                style={{
                  marginLeft: 8,
                  fontWeight: 500,
                  color: "var(--text-tertiary)",
                  fontSize: 10,
                }}
              >
                {groupRows.length}
              </span>
            </div>
          )}
          {groupRows.map((r) => (
            <button
              key={`lbl-${r.id}`}
              type="button"
              onClick={onRowClick ? () => onRowClick(r.id) : undefined}
              style={{
                height: ROW_HEIGHT,
                padding: `0 14px 0 ${14 + (r.parentId ? 16 : 0)}px`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--content-border)",
                background: "transparent",
                border: "none",
                borderBottomColor: "var(--content-border)",
                borderBottomStyle: "solid",
                borderBottomWidth: 1,
                width: "100%",
                textAlign: "left",
                cursor: onRowClick ? "pointer" : "default",
              }}
              title={r.meta}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: r.milestone ? 0 : 2,
                  transform: r.milestone ? "rotate(45deg)" : undefined,
                  background: defaultColorForRow(r),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.label}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelineHeader({
  ticks,
  origin,
  dayWidth,
  zoom,
}: {
  ticks: Date[];
  origin: Date;
  dayWidth: number;
  zoom: GanttZoom;
}) {
  return (
    <div
      style={{
        height: HEADER_HEIGHT,
        borderBottom: "1px solid var(--content-border)",
        position: "relative",
      }}
    >
      {ticks.map((m, i) => {
        const left = dateToOffset(m, origin, dayWidth);
        return (
          <div
            key={`tick-${i}`}
            style={{
              position: "absolute",
              left,
              top: 0,
              bottom: 0,
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderLeft: i === 0 ? "none" : "1px dashed var(--content-border)",
            }}
          >
            {formatTick(m, zoom)}
          </div>
        );
      })}
    </div>
  );
}

function GanttGroup({
  groupKey,
  groupRows,
  groupBy,
  groupLabel,
  origin,
  dayWidth,
  totalDays,
  gridStep,
  ticks,
  showWeekends,
  criticalSet,
  drag,
  beginDrag,
  readOnly,
  onRowClick,
  onRowKeyDown,
}: {
  groupKey: string;
  groupRows: GanttRow[];
  groupBy: GanttGroupBy;
  groupLabel?: (groupId: string) => string;
  origin: Date;
  dayWidth: number;
  totalDays: number;
  gridStep: number;
  ticks: Date[];
  showWeekends: boolean;
  criticalSet: Set<string>;
  drag: DragState | null;
  beginDrag: (
    e: ReactPointerEvent<HTMLElement>,
    row: GanttRow,
    mode: DragState["mode"],
  ) => void;
  readOnly: boolean;
  onRowClick?: (id: string) => void;
  onRowKeyDown: (e: KeyboardEvent<HTMLDivElement>, row: GanttRow) => void;
}) {
  return (
    <div>
      {groupBy !== "none" && (
        <div
          style={{
            height: GROUP_HEADER_HEIGHT,
            borderBottom: "1px solid var(--content-border)",
            background: "var(--content-bg)",
          }}
          aria-label={`Group: ${groupLabel?.(groupKey) ?? defaultGroupLabel(groupBy, groupKey)}`}
        />
      )}
      {groupRows.map((r) => (
        <GanttRowView
          key={`row-${r.id}`}
          row={r}
          origin={origin}
          dayWidth={dayWidth}
          totalDays={totalDays}
          gridStep={gridStep}
          ticks={ticks}
          showWeekends={showWeekends}
          isCritical={criticalSet.has(r.id)}
          drag={drag}
          beginDrag={beginDrag}
          readOnly={readOnly}
          onRowClick={onRowClick}
          onRowKeyDown={onRowKeyDown}
        />
      ))}
    </div>
  );
}

function GanttRowView({
  row,
  origin,
  dayWidth,
  totalDays,
  gridStep,
  ticks,
  showWeekends,
  isCritical,
  drag,
  beginDrag,
  readOnly,
  onRowClick,
  onRowKeyDown,
}: {
  row: GanttRow;
  origin: Date;
  dayWidth: number;
  totalDays: number;
  gridStep: number;
  ticks: Date[];
  showWeekends: boolean;
  isCritical: boolean;
  drag: DragState | null;
  beginDrag: (
    e: ReactPointerEvent<HTMLElement>,
    row: GanttRow,
    mode: DragState["mode"],
  ) => void;
  readOnly: boolean;
  onRowClick?: (id: string) => void;
  onRowKeyDown: (e: KeyboardEvent<HTMLDivElement>, row: GanttRow) => void;
}) {
  const baseStart = startOfDay(new Date(row.start));
  const baseEnd = startOfDay(new Date(row.end));
  const isThisDrag = drag?.rowId === row.id;
  const liveDelta =
    isThisDrag && (drag.mode === "move" || drag.mode === "resize-start" || drag.mode === "resize-end")
      ? drag.deltaDays
      : 0;

  let start = baseStart;
  let end = baseEnd;
  if (isThisDrag && drag.mode === "move") {
    const next = shiftRange(baseStart, baseEnd, liveDelta);
    start = next.start;
    end = next.end;
  } else if (isThisDrag && drag.mode === "resize-start") {
    const next = resizeRange(baseStart, baseEnd, "start", liveDelta);
    start = next.start;
    end = next.end;
  } else if (isThisDrag && drag.mode === "resize-end") {
    const next = resizeRange(baseStart, baseEnd, "end", liveDelta);
    start = next.start;
    end = next.end;
  }

  const offset = dateToOffset(start, origin, dayWidth);
  const width = spanWidth(start, end, dayWidth);
  const color = isCritical ? "var(--status-danger, #EF4444)" : defaultColorForRow(row);
  const progress = Math.min(1, Math.max(0, row.progress ?? 0));

  return (
    <div
      style={{
        position: "relative",
        height: ROW_HEIGHT,
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {/* Vertical gridlines */}
      {ticks.map((m, i) => {
        const left = dateToOffset(m, origin, dayWidth);
        return (
          <div
            key={`grid-${row.id}-${i}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left,
              width: 1,
              background: "var(--content-border)",
              opacity: 0.4,
            }}
          />
        );
      })}

      {/* Weekend shading */}
      {showWeekends && gridStep <= 7 &&
        Array.from({ length: totalDays }).map((_, i) => {
          const d = addDays(origin, i);
          if (!isWeekend(d)) return null;
          return (
            <div
              key={`wk-${row.id}-${i}`}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: i * dayWidth,
                width: dayWidth,
                background: "var(--content-border)",
                opacity: 0.18,
                pointerEvents: "none",
              }}
            />
          );
        })}

      {row.milestone ? (
        <MilestoneDiamond
          row={row}
          left={offset}
          color={color}
          onPointerDown={(e) => beginDrag(e, row, "move")}
          readOnly={readOnly}
          onClick={onRowClick ? () => onRowClick(row.id) : undefined}
        />
      ) : (
        <BarView
          row={row}
          left={offset}
          width={width}
          color={color}
          progress={progress}
          isCritical={isCritical}
          readOnly={readOnly}
          beginDrag={beginDrag}
          onRowClick={onRowClick}
          onRowKeyDown={onRowKeyDown}
        />
      )}
    </div>
  );
}

function BarView({
  row,
  left,
  width,
  color,
  progress,
  isCritical,
  readOnly,
  beginDrag,
  onRowClick,
  onRowKeyDown,
}: {
  row: GanttRow;
  left: number;
  width: number;
  color: string;
  progress: number;
  isCritical: boolean;
  readOnly: boolean;
  beginDrag: (
    e: ReactPointerEvent<HTMLElement>,
    row: GanttRow,
    mode: DragState["mode"],
  ) => void;
  onRowClick?: (id: string) => void;
  onRowKeyDown: (e: KeyboardEvent<HTMLDivElement>, row: GanttRow) => void;
}) {
  const barStyle: CSSProperties = {
    position: "absolute",
    top: 6,
    bottom: 6,
    left,
    width,
    borderRadius: 6,
    background: `color-mix(in srgb, ${color} 18%, transparent)`,
    border: `1px solid ${color}`,
    overflow: "hidden",
    cursor: readOnly ? (onRowClick ? "pointer" : "default") : "grab",
    touchAction: "none",
    outline: isCritical ? `2px solid ${color}` : undefined,
    outlineOffset: isCritical ? 1 : undefined,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${row.label} bar`}
      data-row-id={row.id}
      title={`${row.label} · ${row.meta ?? ""}`}
      style={barStyle}
      onPointerDown={(e) => beginDrag(e, row, "move")}
      onClick={
        onRowClick
          ? (e) => {
              // Don't treat the end of a drag-move as a click.
              if (e.detail === 0) return;
              onRowClick(row.id);
            }
          : undefined
      }
      onKeyDown={(e) => onRowKeyDown(e, row)}
    >
      {/* Progress fill */}
      <div
        aria-hidden="true"
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: color,
          opacity: 0.35,
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          fontSize: 11,
          fontWeight: 600,
          color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {row.label}
      </span>

      {/* Edge resize handles */}
      {!readOnly && (
        <>
          <span
            role="separator"
            aria-label="Resize start"
            onPointerDown={(e) => beginDrag(e, row, "resize-start")}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 6,
              cursor: "ew-resize",
              touchAction: "none",
            }}
          />
          <span
            role="separator"
            aria-label="Resize end"
            onPointerDown={(e) => beginDrag(e, row, "resize-end")}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: 6,
              cursor: "ew-resize",
              touchAction: "none",
            }}
          />
          {/* Dependency link handle */}
          <button
            type="button"
            aria-label="Link dependency"
            onPointerDown={(e) => beginDrag(e, row, "link")}
            style={{
              position: "absolute",
              top: "50%",
              right: -6,
              transform: "translateY(-50%)",
              width: 10,
              height: 10,
              borderRadius: 5,
              background: color,
              border: "1px solid var(--content-bg)",
              padding: 0,
              cursor: "crosshair",
              opacity: 0,
              transition: "opacity 120ms",
            }}
            className="vyne-gantt-link-handle"
          />
        </>
      )}
    </div>
  );
}

function MilestoneDiamond({
  row,
  left,
  color,
  onPointerDown,
  readOnly,
  onClick,
}: {
  row: GanttRow;
  left: number;
  color: string;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  readOnly: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${row.label} milestone`}
      title={row.label}
      onPointerDown={readOnly ? undefined : onPointerDown}
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        left: left - 8,
        width: 16,
        height: 16,
        transform: "translateY(-50%) rotate(45deg)",
        background: color,
        border: "1px solid var(--content-bg)",
        cursor: readOnly ? (onClick ? "pointer" : "default") : "grab",
        touchAction: "none",
      }}
    />
  );
}

function DependencyOverlay({
  dependencies,
  rows,
  origin,
  dayWidth,
  rowYOffsets,
  criticalSet,
}: {
  dependencies: GanttDependency[];
  rows: GanttRow[];
  origin: Date;
  dayWidth: number;
  rowYOffsets: Map<string, number>;
  criticalSet: Set<string>;
}) {
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: HEADER_HEIGHT,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 3,
      }}
    >
      <defs>
        <marker
          id="vyne-gantt-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-tertiary, #888)" />
        </marker>
        <marker
          id="vyne-gantt-arrow-critical"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--status-danger, #EF4444)" />
        </marker>
      </defs>
      {dependencies.map((dep, i) => {
        const from = rowsById.get(dep.fromId);
        const to = rowsById.get(dep.toId);
        if (!from || !to) return null;
        const fromY = (rowYOffsets.get(from.id) ?? 0) + ROW_HEIGHT / 2;
        const toY = (rowYOffsets.get(to.id) ?? 0) + ROW_HEIGHT / 2;
        const fromX = dateToOffset(new Date(from.end), origin, dayWidth) + dayWidth;
        const toX = dateToOffset(new Date(to.start), origin, dayWidth);
        const midX = (fromX + toX) / 2;
        const crit = criticalSet.has(dep.fromId) && criticalSet.has(dep.toId);
        const stroke = crit ? "var(--status-danger, #EF4444)" : "var(--text-tertiary, #888)";
        return (
          <path
            key={`dep-${i}`}
            d={`M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`}
            fill="none"
            stroke={stroke}
            strokeWidth={crit ? 2 : 1.4}
            strokeDasharray={crit ? undefined : "4 3"}
            markerEnd={`url(#${crit ? "vyne-gantt-arrow-critical" : "vyne-gantt-arrow"})`}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

function LinkPointerGhost({
  drag,
  bodyEl,
  rows,
  origin,
  dayWidth,
  rowYOffsets,
}: {
  drag: DragState;
  bodyEl: HTMLDivElement;
  rows: GanttRow[];
  origin: Date;
  dayWidth: number;
  rowYOffsets: Map<string, number>;
}) {
  const from = rows.find((r) => r.id === drag.rowId);
  if (!from || drag.pointerX === undefined || drag.pointerY === undefined) return null;
  const rect = bodyEl.getBoundingClientRect();
  const px = drag.pointerX - rect.left + bodyEl.scrollLeft;
  const py = drag.pointerY - rect.top + bodyEl.scrollTop - HEADER_HEIGHT;
  const fromY = (rowYOffsets.get(from.id) ?? 0) + ROW_HEIGHT / 2;
  const fromX = dateToOffset(new Date(from.end), origin, dayWidth) + dayWidth;
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: HEADER_HEIGHT,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 5,
      }}
    >
      <line
        x1={fromX}
        y1={fromY}
        x2={px}
        y2={py}
        stroke="var(--vyne-accent, #6C47FF)"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function findRowAtY(
  orderedGroups: Array<[string, GanttRow[]]>,
  groupBy: GanttGroupBy,
  y: number,
): GanttRow | null {
  let cursor = 0;
  for (const [, groupRows] of orderedGroups) {
    if (groupBy !== "none") {
      if (y >= cursor && y < cursor + GROUP_HEADER_HEIGHT) return null;
      cursor += GROUP_HEADER_HEIGHT;
    }
    for (const r of groupRows) {
      if (y >= cursor && y < cursor + ROW_HEIGHT) return r;
      cursor += ROW_HEIGHT;
    }
  }
  return null;
}

// Show the link-handle on bar hover via CSS (scoped class).
// Mounted once at runtime so individual rows don't ship a <style>.
if (typeof document !== "undefined") {
  const id = "vyne-gantt-hover-styles";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      [aria-label$="bar"]:hover .vyne-gantt-link-handle,
      [aria-label$="bar"]:focus-within .vyne-gantt-link-handle {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

