"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  MapPin,
  Repeat,
  Sparkles,
  Plus,
  Check,
} from "lucide-react";
import {
  useCalendarStore,
  mockBusyForUser,
  type CalendarEvent,
  type CalendarAttendee,
  type EventType,
} from "@/lib/stores/calendar";
import { useContactsStore } from "@/lib/stores/contacts";
import { useTeamMembers } from "@/lib/stores/projects";

interface ScheduleMeetingModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Pre-fill the channel context if invoked from chat */
  readonly defaultChannelId?: string;
  readonly defaultChannelName?: string;
  /** Pre-fill date/time */
  readonly defaultStart?: Date;
  /** Called after the event is created so the caller can post a card to chat */
  readonly onScheduled?: (event: CalendarEvent) => void;
}

const TYPE_CHOICES: Array<{ value: EventType; label: string; emoji: string }> = [
  { value: "meeting", label: "Meeting", emoji: "👥" },
  { value: "call", label: "Call", emoji: "📞" },
  { value: "focus", label: "Focus", emoji: "🎯" },
  { value: "deadline", label: "Deadline", emoji: "📌" },
  { value: "other", label: "Other", emoji: "📅" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromInputs(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function ScheduleMeetingModal({
  open,
  onClose,
  defaultChannelId,
  defaultChannelName,
  defaultStart,
  onScheduled,
}: ScheduleMeetingModalProps) {
  const addEvent = useCalendarStore((s) => s.addEvent);
  const teamMembers = useTeamMembers();
  const contacts = useContactsStore((s) => s.contacts);

  const startSeed = useMemo(() => {
    if (defaultStart) return defaultStart;
    const d = new Date();
    // Round to next 15-min slot
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  }, [defaultStart]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("meeting");
  const [date, setDate] = useState(isoDate(startSeed));
  const [time, setTime] = useState(isoTime(startSeed));
  const [duration, setDuration] = useState(30);
  const [videoCall, setVideoCall] = useState(true);
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly">(
    "none",
  );
  const [attendees, setAttendees] = useState<CalendarAttendee[]>([]);
  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [description, setDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setType("meeting");
      setDate(isoDate(startSeed));
      setTime(isoTime(startSeed));
      setDuration(30);
      setVideoCall(true);
      setLocation("");
      setRecurrence("none");
      setAttendees([]);
      setAttendeeQuery("");
      setDescription("");
      setTimeout(() => titleInputRef.current?.focus(), 60);
    }
  }, [open, startSeed]);

  if (!open) return null;

  const allCandidates = [
    ...teamMembers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      kind: "team" as const,
    })),
    ...contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      kind: "contact" as const,
    })),
  ].filter((c) => !attendees.some((a) => a.id === c.id));

  const filtered = attendeeQuery.trim()
    ? allCandidates
        .filter(
          (c) =>
            c.name.toLowerCase().includes(attendeeQuery.toLowerCase()) ||
            (c.email ?? "").toLowerCase().includes(attendeeQuery.toLowerCase()),
        )
        .slice(0, 6)
    : allCandidates.slice(0, 6);

  function addAttendee(c: { id: string; name: string; email?: string }) {
    setAttendees((prev) => [
      ...prev,
      { id: c.id, name: c.name, email: c.email, rsvp: "pending" },
    ]);
    setAttendeeQuery("");
    setShowSuggest(false);
  }
  function removeAttendee(id: string) {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const startDate = fromInputs(date, time);
    const endDate = new Date(startDate.getTime() + duration * 60_000);
    const event = addEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      attendees,
      channelId: defaultChannelId,
      channelName: defaultChannelName,
      videoCall,
      location: location.trim() || undefined,
      recurrence,
    });
    onScheduled?.(event);
    onClose();
  }

  // ── Find a time: simple slot suggester based on mock free/busy ──
  const startDateForSuggest = fromInputs(date, "00:00");
  const suggestedSlots = useMemo(() => {
    if (attendees.length === 0) return [];
    const slots: Array<{ start: Date; reason: string }> = [];
    // Try every 30 min from 8am to 6pm
    for (let h = 8; h < 18; h++) {
      for (const m of [0, 30]) {
        const s = new Date(startDateForSuggest);
        s.setHours(h, m, 0, 0);
        const e = new Date(s.getTime() + duration * 60_000);
        const allFree = attendees.every((a) => {
          const busy = mockBusyForUser(a.id, startDateForSuggest);
          return busy.every((b) => {
            const bs = new Date(b.startsAt).getTime();
            const be = new Date(b.endsAt).getTime();
            return e.getTime() <= bs || s.getTime() >= be;
          });
        });
        if (allFree) {
          slots.push({ start: s, reason: "All attendees free" });
        }
        if (slots.length >= 3) break;
      }
      if (slots.length >= 3) break;
    }
    return slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendees, date, duration]);

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
      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "92vh",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        }}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(108, 71, 255, 0.15)",
              color: "var(--vyne-purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarIcon size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Schedule meeting
            </h2>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Drops a calendar event + a meeting card in chat
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </header>

        <div
          className="content-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Title */}
          <Field label="Title">
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme renewal review"
              required
              style={inputStyle}
            />
          </Field>

          {/* Type chips */}
          <Field label="Type">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TYPE_CHOICES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setType(c.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 99,
                    border:
                      type === c.value
                        ? "1px solid var(--vyne-purple)"
                        : "1px solid var(--content-border)",
                    background:
                      type === c.value
                        ? "rgba(108, 71, 255, 0.15)"
                        : "transparent",
                    color:
                      type === c.value
                        ? "var(--vyne-purple)"
                        : "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Date + time + duration */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <Field label="Date" icon={<CalendarIcon size={11} />}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Time" icon={<Clock size={11} />}>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={300}
                style={inputStyle}
              />
            </Field>
            <Field label="Duration">
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={inputStyle}
              >
                {DURATION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${m / 60} hr${m === 60 ? "" : "s"}`}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Attendees */}
          <Field label={`Attendees${attendees.length ? ` (${attendees.length})` : ""}`} icon={<Users size={11} />}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                padding: 6,
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--input-bg)",
                minHeight: 38,
                position: "relative",
              }}
            >
              {attendees.map((a) => (
                <span
                  key={a.id}
                  style={{
                    padding: "3px 8px 3px 10px",
                    borderRadius: 99,
                    background: "rgba(108, 71, 255, 0.12)",
                    color: "var(--vyne-purple)",
                    fontSize: 11,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {a.name}
                  <button
                    type="button"
                    onClick={() => removeAttendee(a.id)}
                    aria-label={`Remove ${a.name}`}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(108, 71, 255, 0.25)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <input
                value={attendeeQuery}
                onChange={(e) => {
                  setAttendeeQuery(e.target.value);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                placeholder={attendees.length === 0 ? "Type a name…" : ""}
                style={{
                  flex: 1,
                  minWidth: 100,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  outline: "none",
                  padding: "4px 6px",
                }}
              />
              {showSuggest && filtered.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 8,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                    maxHeight: 200,
                    overflowY: "auto",
                    zIndex: 1,
                  }}
                >
                  {filtered.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addAttendee(c);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "transparent")
                      }
                    >
                      <span style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        {c.email && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {c.email}
                          </div>
                        )}
                      </span>
                      <Plus size={11} style={{ color: "var(--vyne-purple)" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Find a time suggestions */}
          {suggestedSlots.length > 0 && (
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: "rgba(108, 71, 255, 0.08)",
                border: "1px solid rgba(108, 71, 255, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--vyne-purple)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                <Sparkles size={11} /> AI · Find a time
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {suggestedSlots.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTime(isoTime(s.start))}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 99,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--text-primary)",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title={s.reason}
                  >
                    {isoTime(s.start)}
                  </button>
                ))}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  marginTop: 6,
                }}
              >
                Times when all {attendees.length} attendees are free.
              </div>
            </div>
          )}

          {/* Video / location */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setVideoCall((v) => !v)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: videoCall
                  ? "1px solid var(--vyne-purple)"
                  : "1px solid var(--content-border)",
                background: videoCall
                  ? "rgba(108, 71, 255, 0.1)"
                  : "transparent",
                color: videoCall
                  ? "var(--vyne-purple)"
                  : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
              }}
            >
              <Video size={14} />
              <span style={{ flex: 1 }}>VYNE video call</span>
              {videoCall && <Check size={13} />}
            </button>
            <Field label="Location (optional)" icon={<MapPin size={11} />}>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Conference room A · 4F"
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Recurrence */}
          <Field label="Repeats" icon={<Repeat size={11} />}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["none", "daily", "weekly"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrence(r)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border:
                      recurrence === r
                        ? "1px solid var(--vyne-purple)"
                        : "1px solid var(--content-border)",
                    background:
                      recurrence === r
                        ? "rgba(108, 71, 255, 0.1)"
                        : "transparent",
                    color:
                      recurrence === r
                        ? "var(--vyne-purple)"
                        : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>

          {/* Description */}
          <Field label="Notes (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Agenda, links, prep work…"
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>
        </div>

        <footer
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--content-border)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: title.trim()
                ? "var(--vyne-purple)"
                : "var(--content-border)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: title.trim() ? "pointer" : "default",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalendarIcon size={13} /> Schedule
          </button>
        </footer>
      </motion.form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

function Field({
  label,
  icon,
  children,
}: {
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
