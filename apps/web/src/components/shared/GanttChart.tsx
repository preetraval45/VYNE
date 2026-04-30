"use client";

import { useMemo } from "react";

export interface GanttRow {
  id: string;
  label: string;
  /** ISO dates */
  start: string;
  end: string;
  color?: string;
  progress?: number; // 0..1
  meta?: string;
}

interface Props {
  rows: GanttRow[];
  title?: string;
  /** Total width used for the timeline in px. Body will scroll horizontally. */
  dayWidth?: number;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function fmt(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GanttChart({ rows, title, dayWidth = 24 }: Props) {
  const { origin, totalDays, weekMarkers } = useMemo(() => {
    if (rows.length === 0) {
      const now = new Date();
      return { origin: now, totalDays: 30, weekMarkers: [] as Date[] };
    }
    const starts = rows.map((r) => new Date(r.start).getTime());
    const ends = rows.map((r) => new Date(r.end).getTime());
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    const originDate = new Date(minStart);
    originDate.setHours(0, 0, 0, 0);
    const total = Math.max(
      14,
      daysBetween(originDate, new Date(maxEnd)) + 4,
    );

    const markers: Date[] = [];
    for (let i = 0; i <= total; i += 7) {
      const m = new Date(originDate);
      m.setDate(m.getDate() + i);
      markers.push(m);
    }
    return { origin: originDate, totalDays: total, weekMarkers: markers };
  }, [rows]);

  const timelineWidth = totalDays * dayWidth;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = daysBetween(origin, today) * dayWidth;

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
          gridTemplateColumns: "220px 1fr",
        }}
      >
        {/* Left — task labels */}
        <div
          style={{
            borderRight: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <div
            style={{
              height: 36,
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
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                height: 34,
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--content-border)",
              }}
              title={r.meta}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: r.color ?? "var(--vyne-accent, var(--vyne-purple))",
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
            </div>
          ))}
        </div>

        {/* Right — timeline */}
        <div
          style={{
            overflowX: "auto",
            position: "relative",
          }}
        >
          <div
            style={{ width: timelineWidth, position: "relative" }}
          >
            {/* Week header */}
            <div
              style={{
                height: 36,
                borderBottom: "1px solid var(--content-border)",
                position: "relative",
                display: "flex",
              }}
            >
              {weekMarkers.map((m, i) => {
                const left = daysBetween(origin, m) * dayWidth;
                return (
                  <div
                    key={`wk-${i}`}
                    style={{
                      position: "absolute",
                      left,
                      top: 0,
                      bottom: 0,
                      width: 7 * dayWidth,
                      borderRight: "1px dashed var(--content-border)",
                      padding: "0 8px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {fmt(m)}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= timelineWidth && (
              <div
                aria-label="Today"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: todayOffset,
                  width: 2,
                  background: "var(--status-danger)",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Rows */}
            {rows.map((r) => {
              const start = new Date(r.start);
              const end = new Date(r.end);
              const offset = daysBetween(origin, start) * dayWidth;
              const widthDays = Math.max(
                1,
                daysBetween(start, end) + 1,
              );
              const width = widthDays * dayWidth;
              const color = r.color ?? "var(--vyne-accent, var(--vyne-purple))";
              const progress = Math.min(1, Math.max(0, r.progress ?? 0));
              return (
                <div
                  key={`row-${r.id}`}
                  style={{
                    position: "relative",
                    height: 34,
                    borderBottom: "1px solid var(--content-border)",
                  }}
                >
                  {/* Weekend/week grid lines */}
                  {weekMarkers.map((m, i) => {
                    const left = daysBetween(origin, m) * dayWidth;
                    return (
                      <div
                        key={`grid-${r.id}-${i}`}
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

                  <div
                    title={`${r.label} · ${fmt(start)} → ${fmt(end)}`}
                    style={{
                      position: "absolute",
                      top: 6,
                      bottom: 6,
                      left: offset,
                      width,
                      borderRadius: 6,
                      background: `${color}22`,
                      border: `1px solid ${color}`,
                      overflow: "hidden",
                    }}
                  >
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
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
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
                      {r.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
