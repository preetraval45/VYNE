"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EventType = "meeting" | "call" | "focus" | "deadline" | "other";

export interface CalendarAttendee {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string;
  rsvp?: "accepted" | "declined" | "tentative" | "pending";
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  /** ISO timestamp */
  startsAt: string;
  /** ISO timestamp */
  endsAt: string;
  attendees: CalendarAttendee[];
  /** Optional channel where the meeting card was posted */
  channelId?: string;
  channelName?: string;
  /** Optional location string OR videoCall flag */
  location?: string;
  videoCall?: boolean;
  /** ISO when created */
  createdAt: string;
  /** Hex/CSS color override */
  color?: string;
  /** Soft-recurring rule for the demo: daily | weekly | none */
  recurrence?: "none" | "daily" | "weekly";
}

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (
    e: Omit<CalendarEvent, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  rsvp: (eventId: string, attendeeId: string, status: CalendarAttendee["rsvp"]) => void;
  /** Returns events that overlap the given date (local day) */
  eventsOnDate: (date: Date) => CalendarEvent[];
  /** Returns events with start time within [from, to) */
  eventsInRange: (from: Date, to: Date) => CalendarEvent[];
  /** Find the next upcoming event (or null) */
  nextEvent: () => CalendarEvent | null;
  /** Returns events starting in the next N minutes (for "join now" alerts) */
  startingSoon: (minutesAhead: number) => CalendarEvent[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const TODAY = new Date();
function plusDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function atTime(d: Date, h: number, m = 0): string {
  const r = new Date(d);
  r.setHours(h, m, 0, 0);
  return r.toISOString();
}

const SEED_EVENTS: CalendarEvent[] = [
  {
    id: "evt-seed-1",
    title: "Eng standup",
    type: "meeting",
    startsAt: atTime(TODAY, 9, 30),
    endsAt: atTime(TODAY, 10, 0),
    attendees: [
      { id: "p1", name: "Sarah Chen", rsvp: "accepted" },
      { id: "p2", name: "Marcus Johnson", rsvp: "accepted" },
      { id: "p3", name: "Tony M.", rsvp: "tentative" },
    ],
    channelName: "eng-team",
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "daily",
  },
  {
    id: "evt-seed-2",
    title: "Acme renewal · Demo",
    description: "Walk through latest features, address pricing question.",
    type: "call",
    startsAt: atTime(TODAY, 14, 0),
    endsAt: atTime(TODAY, 14, 45),
    attendees: [
      { id: "ext-1", name: "Robert Diefenderfer", email: "robert@rithomiq.com", rsvp: "accepted" },
      { id: "p2", name: "Sarah Chen", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-3",
    title: "Deep work · Q3 roadmap",
    type: "focus",
    startsAt: atTime(TODAY, 11, 0),
    endsAt: atTime(TODAY, 12, 30),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-4",
    title: "Submit onboarding wizard PR",
    type: "deadline",
    startsAt: atTime(plusDays(TODAY, 1), 17, 0),
    endsAt: atTime(plusDays(TODAY, 1), 17, 30),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-5",
    title: "Weekly 1:1 · Tony",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 2), 10, 0),
    endsAt: atTime(plusDays(TODAY, 2), 10, 30),
    attendees: [{ id: "p3", name: "Tony M.", rsvp: "accepted" }],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "weekly",
  },
];

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,

      addEvent: (e) => {
        const event: CalendarEvent = {
          ...e,
          id: e.id ?? newId(),
          createdAt: e.createdAt ?? new Date().toISOString(),
        };
        set((s) => ({ events: [...s.events, event] }));
        return event;
      },

      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEvent: (id) =>
        set((s) => ({
          events: s.events.filter((e) => e.id !== id),
        })),

      rsvp: (eventId, attendeeId, status) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  attendees: e.attendees.map((a) =>
                    a.id === attendeeId ? { ...a, rsvp: status } : a,
                  ),
                }
              : e,
          ),
        })),

      eventsOnDate: (date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return get().events
          .filter((e) => {
            const evStart = new Date(e.startsAt);
            return evStart >= start && evStart < end;
          })
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );
      },

      eventsInRange: (from, to) =>
        get()
          .events.filter((e) => {
            const t = new Date(e.startsAt).getTime();
            return t >= from.getTime() && t < to.getTime();
          })
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          ),

      nextEvent: () => {
        const now = Date.now();
        return (
          get()
            .events.filter((e) => new Date(e.startsAt).getTime() > now)
            .sort(
              (a, b) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            )[0] ?? null
        );
      },

      startingSoon: (minutesAhead) => {
        const now = Date.now();
        const cutoff = now + minutesAhead * 60_000;
        return get().events.filter((e) => {
          const t = new Date(e.startsAt).getTime();
          return t >= now && t <= cutoff;
        });
      },
    }),
    {
      name: "vyne-calendar",
      version: 1,
    },
  ),
);

/** Mock free/busy generator — used by the team availability picker. */
export interface BusySlot {
  startsAt: string;
  endsAt: string;
  label: string;
}

export function mockBusyForUser(userId: string, day: Date): BusySlot[] {
  // Deterministic-ish: hash userId to pick busy windows
  const hash = userId
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const variant = Math.abs(hash) % 4;
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const at = (h: number, m = 0) => {
    const r = new Date(dayStart);
    r.setHours(h, m, 0, 0);
    return r.toISOString();
  };
  switch (variant) {
    case 0:
      return [
        { startsAt: at(9), endsAt: at(10, 30), label: "Eng review" },
        { startsAt: at(13), endsAt: at(14), label: "Lunch" },
        { startsAt: at(16, 30), endsAt: at(17), label: "1:1" },
      ];
    case 1:
      return [
        { startsAt: at(10), endsAt: at(11), label: "Standup" },
        { startsAt: at(14, 30), endsAt: at(16), label: "Customer call" },
      ];
    case 2:
      return [
        { startsAt: at(8, 30), endsAt: at(9, 30), label: "Inbox triage" },
        { startsAt: at(11), endsAt: at(12), label: "Design crit" },
        { startsAt: at(15), endsAt: at(15, 30), label: "PR review" },
      ];
    default:
      return [{ startsAt: at(13), endsAt: at(15), label: "Deep work" }];
  }
}
