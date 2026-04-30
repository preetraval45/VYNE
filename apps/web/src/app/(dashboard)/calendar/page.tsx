"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  Users,
  Clock,
  Sparkles,
  X,
  Trash2,
} from "lucide-react";
import {
  useCalendarStore,
  type CalendarEvent,
} from "@/lib/stores/calendar";
import { useCallStore } from "@/lib/stores/call";
import { ScheduleMeetingModal } from "@/components/calendar/ScheduleMeetingModal";

type View = "month" | "week" | "day";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TYPE_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  meeting: { bg: "rgba(108, 71, 255, 0.15)", fg: "var(--vyne-accent, var(--vyne-purple))", border: "rgba(108, 71, 255, 0.4)" },
  call: { bg: "rgba(34, 197, 94, 0.15)", fg: "#22C55E", border: "rgba(34, 197, 94, 0.4)" },
  focus: { bg: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)", fg: "var(--vyne-accent, #06B6D4)", border: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.4)" },
  deadline: { bg: "rgba(239, 68, 68, 0.15)", fg: "#EF4444", border: "rgba(239, 68, 68, 0.4)" },
  other: { bg: "rgba(245, 158, 11, 0.15)", fg: "#F59E0B", border: "rgba(245, 158, 11, 0.4)" },
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const events = useCalendarStore((s) => s.events);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const startCall = useCallStore((s) => s.startCall);

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSeedDate, setScheduleSeedDate] = useState<Date | undefined>();
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.startsAt).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )
      .slice(0, 5);
  }, [events]);

  function eventsForDay(d: Date): CalendarEvent[] {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return eventsByDay.get(key) ?? [];
  }

  function joinMeeting(ev: CalendarEvent) {
    startCall(
      ev.channelId ?? `meeting-${ev.id}`,
      ev.title,
      ev.videoCall ? "video" : "voice",
    );
    setDetailEvent(null);
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      {/* Main calendar area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderBottom: "1px solid var(--content-border)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(108, 71, 255, 0.15)",
                color: "var(--vyne-accent, var(--vyne-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarIcon size={18} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Calendar
              </h1>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Meetings, deadlines, focus blocks
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: 18,
            }}
          >
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              style={navBtn()}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(cursor);
                if (view === "month") d.setMonth(d.getMonth() - 1);
                else if (view === "week") d.setDate(d.getDate() - 7);
                else d.setDate(d.getDate() - 1);
                setCursor(d);
              }}
              aria-label="Previous"
              style={iconNavBtn()}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(cursor);
                if (view === "month") d.setMonth(d.getMonth() + 1);
                else if (view === "week") d.setDate(d.getDate() + 7);
                else d.setDate(d.getDate() + 1);
                setCursor(d);
              }}
              aria-label="Next"
              style={iconNavBtn()}
            >
              <ChevronRight size={14} />
            </button>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginLeft: 8,
              }}
            >
              {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
          </div>

          {/* View toggle */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 4,
              padding: 3,
              borderRadius: 8,
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
            }}
          >
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    view === v ? "var(--content-bg)" : "transparent",
                  color:
                    view === v
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  boxShadow:
                    view === v
                      ? "0 2px 6px rgba(0,0,0,0.06)"
                      : "none",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setScheduleSeedDate(selectedDate);
              setScheduleOpen(true);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={13} /> Schedule
          </button>
        </header>

        {/* Calendar body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {view === "month" && (
            <MonthView
              cursor={cursor}
              eventsForDay={eventsForDay}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setView("day");
                setCursor(d);
              }}
              onCreate={(d) => {
                setScheduleSeedDate(d);
                setScheduleOpen(true);
              }}
            />
          )}
          {view === "week" && (
            <WeekView
              cursor={cursor}
              eventsForDay={eventsForDay}
              onSelectEvent={setDetailEvent}
            />
          )}
          {view === "day" && (
            <DayView
              date={cursor}
              events={eventsForDay(cursor)}
              onSelectEvent={setDetailEvent}
              onCreate={(hour) => {
                const d = new Date(cursor);
                d.setHours(hour, 0, 0, 0);
                setScheduleSeedDate(d);
                setScheduleOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Right rail: upcoming */}
      <aside
        style={{
          width: 300,
          flexShrink: 0,
          borderLeft: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          padding: "20px 16px",
          overflowY: "auto",
        }}
        className="hide-mobile"
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          Up next
        </div>
        {upcomingEvents.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            Nothing scheduled. Click + Schedule to plan a meeting.
          </div>
        )}
        {upcomingEvents.map((ev) => (
          <UpcomingCard
            key={ev.id}
            event={ev}
            onClick={() => setDetailEvent(ev)}
            onJoin={() => joinMeeting(ev)}
          />
        ))}

        <div
          style={{
            marginTop: 22,
            padding: 12,
            borderRadius: 10,
            background: "rgba(108, 71, 255, 0.08)",
            border: "1px solid rgba(108, 71, 255, 0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--vyne-accent, var(--vyne-purple))",
              marginBottom: 6,
            }}
          >
            <Sparkles size={11} /> AI tip
          </div>
          <p
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Type <code style={kbdStyle}>/schedule</code> in any chat channel
            to drop a meeting card with one command.
          </p>
        </div>
      </aside>

      <ScheduleMeetingModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        defaultStart={scheduleSeedDate}
      />

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onJoin={() => joinMeeting(detailEvent)}
          onDelete={() => {
            deleteEvent(detailEvent.id);
            setDetailEvent(null);
          }}
        />
      )}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────

function MonthView({
  cursor,
  eventsForDay,
  selectedDate,
  onSelectDate,
  onCreate,
}: {
  readonly cursor: Date;
  readonly eventsForDay: (d: Date) => CalendarEvent[];
  readonly selectedDate: Date;
  readonly onSelectDate: (d: Date) => void;
  readonly onCreate: (d: Date) => void;
}) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDay = monthStart.getDay();
  const today = new Date();

  // Build 6-row grid (42 cells)
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() - startDay + i);
    cells.push(d);
  }

  return (
    <div
      data-calendar-grid="month"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 1,
        background: "var(--content-border)",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--content-border)",
      }}
    >
      {DAY_NAMES.map((d) => (
        <div
          key={d}
          style={{
            padding: "10px 12px",
            background: "var(--content-secondary)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {d}
        </div>
      ))}
      {cells.map((d, i) => {
        const inMonth = d.getMonth() === cursor.getMonth();
        const isToday = isSameDay(d, today);
        const isSelected = isSameDay(d, selectedDate);
        const dayEvents = eventsForDay(d);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectDate(d)}
            onDoubleClick={() => onCreate(d)}
            style={{
              minHeight: 96,
              background: "var(--content-bg)",
              border: "none",
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              textAlign: "left",
              opacity: inMonth ? 1 : 0.45,
              outline: isSelected
                ? "2px solid var(--vyne-accent, var(--vyne-purple))"
                : "none",
              outlineOffset: -2,
              transition: "background 0.12s",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#fff" : "var(--text-primary)",
                  background: isToday ? "var(--vyne-accent, var(--vyne-purple))" : "transparent",
                  borderRadius: 99,
                  padding: isToday ? "2px 8px" : "0",
                  minWidth: 22,
                  textAlign: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d.getDate()}
              </span>
              {dayEvents.length > 0 && !isToday && (
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {dayEvents.length}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: "hidden",
              }}
            >
              {dayEvents.slice(0, 3).map((ev) => {
                const c = TYPE_COLOR[ev.type] ?? TYPE_COLOR.meeting;
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: c.bg,
                      color: c.fg,
                      fontSize: 10,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      borderLeft: `2px solid ${c.border}`,
                    }}
                  >
                    {fmtTime(ev.startsAt)} · {ev.title}
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <span
                  style={{
                    fontSize: 9.5,
                    color: "var(--text-tertiary)",
                    paddingLeft: 4,
                  }}
                >
                  +{dayEvents.length - 3} more
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────

function WeekView({
  cursor,
  eventsForDay,
  onSelectEvent,
}: {
  readonly cursor: Date;
  readonly eventsForDay: (d: Date) => CalendarEvent[];
  readonly onSelectEvent: (e: CalendarEvent) => void;
}) {
  const weekStart = new Date(cursor);
  weekStart.setDate(cursor.getDate() - cursor.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const today = new Date();

  return (
    <div
      data-calendar-grid="week"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const isToday = isSameDay(d, today);
        const dayEvents = eventsForDay(d);
        return (
          <div
            key={i}
            style={{
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              padding: 10,
              background: isToday
                ? "rgba(108, 71, 255, 0.05)"
                : "var(--content-bg)",
              minHeight: 360,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {DAY_NAMES[d.getDay()]}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isToday ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {d.getDate()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {dayEvents.map((ev) => {
                const c = TYPE_COLOR[ev.type] ?? TYPE_COLOR.meeting;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      color: c.fg,
                      fontSize: 11,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{fmtTime(ev.startsAt)}</div>
                    <div
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.title}
                    </div>
                  </button>
                );
              })}
              {dayEvents.length === 0 && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontStyle: "italic",
                    padding: "8px 0",
                  }}
                >
                  Nothing
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────

function DayView({
  date,
  events,
  onSelectEvent,
  onCreate,
}: {
  readonly date: Date;
  readonly events: CalendarEvent[];
  readonly onSelectEvent: (e: CalendarEvent) => void;
  readonly onCreate: (hour: number) => void;
}) {
  const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 7am-8pm
  return (
    <div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 16,
        }}
      >
        {DAY_NAMES[date.getDay()]}, {MONTH_NAMES[date.getMonth()]}{" "}
        {date.getDate()}
      </div>
      <div
        style={{
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        {hours.map((h) => {
          const hourEvents = events.filter(
            (e) => new Date(e.startsAt).getHours() === h,
          );
          return (
            <div
              key={h}
              onClick={() => hourEvents.length === 0 && onCreate(h)}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr",
                borderBottom: "1px solid var(--content-border)",
                minHeight: 56,
                cursor: hourEvents.length === 0 ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  borderRight: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {pad(h)}:00
              </div>
              <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {hourEvents.map((ev) => {
                  const c = TYPE_COLOR[ev.type] ?? TYPE_COLOR.meeting;
                  const startD = new Date(ev.startsAt);
                  const endD = new Date(ev.endsAt);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        color: c.fg,
                        fontSize: 12,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{ev.title}</div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.85,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Clock size={10} />
                        {pad(startD.getHours())}:{pad(startD.getMinutes())} –{" "}
                        {pad(endD.getHours())}:{pad(endD.getMinutes())}
                        {ev.attendees.length > 0 && (
                          <>
                            <Users size={10} style={{ marginLeft: 4 }} />
                            {ev.attendees.length}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Upcoming card ────────────────────────────────────────────

function UpcomingCard({
  event,
  onClick,
  onJoin,
}: {
  readonly event: CalendarEvent;
  readonly onClick: () => void;
  readonly onJoin: () => void;
}) {
  const c = TYPE_COLOR[event.type] ?? TYPE_COLOR.meeting;
  const start = new Date(event.startsAt);
  const minsUntil = Math.round(
    (start.getTime() - Date.now()) / 60_000,
  );
  const isToday = isSameDay(start, new Date());
  const startsSoon = minsUntil >= 0 && minsUntil <= 15;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "var(--content-bg)",
        border: `1px solid ${startsSoon ? c.border : "var(--content-border)"}`,
        marginBottom: 8,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 99,
            background: c.bg,
            color: c.fg,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {event.type}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          {isToday
            ? minsUntil <= 0
              ? "Now"
              : minsUntil < 60
                ? `In ${minsUntil}m`
                : `Today · ${fmtTime(event.startsAt)}`
            : `${start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${fmtTime(event.startsAt)}`}
        </span>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        {event.title}
      </div>
      {event.attendees.length > 0 && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginBottom: event.videoCall ? 8 : 0,
          }}
        >
          {event.attendees.map((a) => a.name).join(", ")}
        </div>
      )}
      {event.videoCall && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            background: startsSoon ? c.fg : "var(--content-secondary)",
            color: startsSoon ? "#fff" : "var(--text-secondary)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            marginTop: 4,
          }}
        >
          <Video size={11} /> {startsSoon ? "Join now" : "Join meeting"}
        </button>
      )}
    </div>
  );
}

// ── Event detail modal ───────────────────────────────────────

function EventDetailModal({
  event,
  onClose,
  onJoin,
  onDelete,
}: {
  readonly event: CalendarEvent;
  readonly onClose: () => void;
  readonly onJoin: () => void;
  readonly onDelete: () => void;
}) {
  const c = TYPE_COLOR[event.type] ?? TYPE_COLOR.meeting;
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,16,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 9990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 99,
              background: c.bg,
              color: c.fg,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {event.type}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {event.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </header>

        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Detail
            icon={<Clock size={13} />}
            label="When"
            value={`${start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${fmtTime(event.startsAt)} – ${fmtTime(event.endsAt)}`}
          />
          {event.location && (
            <Detail
              icon={<MapPin size={13} />}
              label="Where"
              value={event.location}
            />
          )}
          {event.attendees.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "var(--content-secondary)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={13} />
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Attendees
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    marginTop: 5,
                  }}
                >
                  {event.attendees.map((a) => (
                    <span
                      key={a.id}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 99,
                        background: rsvpColor(a.rsvp).bg,
                        color: rsvpColor(a.rsvp).fg,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {a.name} {rsvpEmoji(a.rsvp)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {event.description && (
            <Detail
              icon={<Sparkles size={13} />}
              label="Notes"
              value={event.description}
            />
          )}
        </div>

        <footer
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--content-border)",
            display: "flex",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: "8px 12px",
              borderRadius: 7,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "#EF4444",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
          {event.videoCall && (
            <button
              type="button"
              onClick={onJoin}
              style={{
                padding: "8px 16px",
                borderRadius: 7,
                border: "none",
                background: c.fg,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Video size={12} /> Join call
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: "var(--content-secondary)",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            marginTop: 3,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function rsvpColor(rsvp?: string): { bg: string; fg: string } {
  switch (rsvp) {
    case "accepted":
      return { bg: "rgba(34,197,94,0.12)", fg: "#22C55E" };
    case "declined":
      return { bg: "rgba(239,68,68,0.12)", fg: "#EF4444" };
    case "tentative":
      return { bg: "rgba(245,158,11,0.12)", fg: "#F59E0B" };
    default:
      return { bg: "var(--content-secondary)", fg: "var(--text-secondary)" };
  }
}
function rsvpEmoji(rsvp?: string): string {
  switch (rsvp) {
    case "accepted":
      return "✅";
    case "declined":
      return "❌";
    case "tentative":
      return "🤔";
    default:
      return "•";
  }
}

function navBtn(): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 7,
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: "var(--text-primary)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  };
}
function iconNavBtn(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
const kbdStyle: React.CSSProperties = {
  padding: "1px 5px",
  borderRadius: 4,
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
  fontSize: 10,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};
