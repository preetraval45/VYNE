"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEvent {
  id: string;
  date: string; // ISO date — YYYY-MM-DD or full ISO
  title: string;
  color?: string;
  meta?: string;
  onClick?: () => void;
}

interface Props {
  events: CalendarEvent[];
  initialMonth?: Date;
  title?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseEventDate(iso: string): Date {
  return new Date(iso);
}

export function CalendarView({ events, initialMonth, title }: Props) {
  const [cursor, setCursor] = useState<Date>(() =>
    initialMonth ? new Date(initialMonth) : new Date(),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const leading = first.getDay();
    // Always render 42 cells (6 weeks) for stable layout
    const arr: Array<Date | null> = [];
    for (let i = 0; i < leading; i++) arr.push(null);
    for (let d = 1; d <= lastDay; d++) arr.push(new Date(year, month, d));
    while (arr.length < 42) arr.push(null);
    return arr;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = parseEventDate(e.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events, year, month]);

  return (
    <section
      style={{
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
      aria-label={title ?? "Calendar"}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        {title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            minWidth: 140,
            textAlign: "center",
          }}
        >
          {MONTHS[month]} {year}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date())}
          style={{
            marginLeft: 6,
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Today
        </button>
      </div>

      {/* Day header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridAutoRows: "minmax(88px, 1fr)",
        }}
      >
        {cells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`empty-${i}`}
                style={{
                  borderRight:
                    (i + 1) % 7 === 0
                      ? "none"
                      : "1px solid var(--content-border)",
                  borderTop: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                  opacity: 0.4,
                }}
              />
            );
          }

          const key = `${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = sameDay(cell, today);

          return (
            <div
              key={key}
              style={{
                padding: 6,
                borderRight:
                  (i + 1) % 7 === 0
                    ? "none"
                    : "1px solid var(--content-border)",
                borderTop: "1px solid var(--content-border)",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                background: isToday ? "rgba(6, 182, 212,0.05)" : "transparent",
                minHeight: 88,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: isToday ? 22 : "auto",
                  height: isToday ? 22 : "auto",
                  borderRadius: "50%",
                  background: isToday ? "var(--vyne-purple)" : "transparent",
                  color: isToday ? "#fff" : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  alignSelf: "flex-start",
                  padding: isToday ? 0 : "0 4px",
                }}
              >
                {cell.getDate()}
              </div>
              {dayEvents.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={e.onClick}
                  title={e.meta ?? e.title}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "none",
                    background: e.color
                      ? `${e.color}22`
                      : "rgba(6, 182, 212,0.12)",
                    color: e.color ?? "var(--vyne-purple)",
                    fontSize: 10,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: e.onClick ? "pointer" : "default",
                    borderLeft: `3px solid ${e.color ?? "var(--vyne-purple)"}`,
                  }}
                >
                  {e.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    padding: "0 6px",
                  }}
                >
                  +{dayEvents.length - 3} more
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
