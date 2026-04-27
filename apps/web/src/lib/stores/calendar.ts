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
  // ── TODAY ───────────────────────────────────────────────────
  {
    id: "evt-seed-standup",
    title: "Eng daily standup",
    description: "Yesterday / today / blockers. Keep it under 10 min.",
    type: "meeting",
    startsAt: atTime(TODAY, 9, 15),
    endsAt: atTime(TODAY, 9, 30),
    attendees: [
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
      { id: "p-priya", name: "Priya Shah", email: "priya@vyne.app", rsvp: "accepted" },
      { id: "p-tony", name: "Tony Mendez", email: "tony@vyne.app", rsvp: "tentative" },
    ],
    channelName: "eng-team",
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "daily",
  },
  {
    id: "evt-seed-deepwork",
    title: "Deep work · Q3 architecture doc",
    description: "Block — no meetings, no Slack. Finish migration write-up.",
    type: "focus",
    startsAt: atTime(TODAY, 10, 0),
    endsAt: atTime(TODAY, 12, 0),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-acme",
    title: "Acme Corp · Renewal call",
    description:
      "Walk through Q3 roadmap, address pricing pushback from procurement, agree on renewal terms.",
    type: "call",
    startsAt: atTime(TODAY, 14, 0),
    endsAt: atTime(TODAY, 14, 45),
    attendees: [
      { id: "ext-robert", name: "Robert Diefenderfer", email: "robert@rithomiq.com", rsvp: "accepted" },
      { id: "ext-jenny", name: "Jenny Park (Acme)", email: "jenny@acmecorp.com", rsvp: "accepted" },
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-design",
    title: "Design review · Onboarding v2",
    description:
      "Review the 4-step onboarding flow. Decide: do we keep the persona-picker step?",
    type: "meeting",
    startsAt: atTime(TODAY, 15, 30),
    endsAt: atTime(TODAY, 16, 15),
    attendees: [
      { id: "p-priya", name: "Priya Shah", email: "priya@vyne.app", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
      { id: "p-amit", name: "Amit Patel", email: "amit@vyne.app", rsvp: "tentative" },
    ],
    channelName: "design",
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-deadline-pr",
    title: "Code freeze · v1.4 release",
    description: "All non-critical PRs must merge before EOD for tomorrow's release cut.",
    type: "deadline",
    startsAt: atTime(TODAY, 17, 0),
    endsAt: atTime(TODAY, 17, 30),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },

  // ── TOMORROW ──────────────────────────────────────────────
  {
    id: "evt-seed-finedge",
    title: "FinEdge Capital · Discovery call",
    description: "Net-new lead from inbound. 1200-employee fintech, looking at Slack alternatives.",
    type: "call",
    startsAt: atTime(plusDays(TODAY, 1), 10, 30),
    endsAt: atTime(plusDays(TODAY, 1), 11, 15),
    attendees: [
      { id: "ext-sam", name: "Sam Chen (FinEdge)", email: "schen@finedge.com", rsvp: "pending" },
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-1on1-tony",
    title: "Weekly 1:1 · Tony",
    description:
      "Career growth check-in. Review Q3 OKRs progress and roadmap stretch goals.",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 1), 13, 0),
    endsAt: atTime(plusDays(TODAY, 1), 13, 30),
    attendees: [{ id: "p-tony", name: "Tony Mendez", email: "tony@vyne.app", rsvp: "accepted" }],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "weekly",
  },
  {
    id: "evt-seed-board-prep",
    title: "Board deck prep",
    type: "focus",
    startsAt: atTime(plusDays(TODAY, 1), 14, 0),
    endsAt: atTime(plusDays(TODAY, 1), 16, 0),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },

  // ── DAY +2 ────────────────────────────────────────────────
  {
    id: "evt-seed-sprint",
    title: "Sprint planning · 2-week cycle",
    description:
      "Pick up: onboarding wizard, mobile responsive pass, AI notes accuracy. Aim for 26 points.",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 2), 10, 0),
    endsAt: atTime(plusDays(TODAY, 2), 11, 30),
    attendees: [
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
      { id: "p-priya", name: "Priya Shah", email: "priya@vyne.app", rsvp: "accepted" },
      { id: "p-amit", name: "Amit Patel", email: "amit@vyne.app", rsvp: "accepted" },
      { id: "p-tony", name: "Tony Mendez", email: "tony@vyne.app", rsvp: "accepted" },
    ],
    channelName: "eng-team",
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-medihealth",
    title: "MediHealth · Implementation kickoff",
    description: "Day-1 kickoff after closed/won. Walk them through SOC 2 + integration plan.",
    type: "call",
    startsAt: atTime(plusDays(TODAY, 2), 13, 30),
    endsAt: atTime(plusDays(TODAY, 2), 14, 30),
    attendees: [
      { id: "ext-nadia", name: "Nadia Williams (MediHealth)", email: "nadia@medihealth.io", rsvp: "accepted" },
      { id: "ext-derek", name: "Derek Liu (MediHealth)", email: "derek@medihealth.io", rsvp: "accepted" },
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-team-lunch",
    title: "Team lunch 🍕",
    description: "Quarterly all-hands lunch. Cafeteria, 1F. No agenda — just hang.",
    type: "other",
    startsAt: atTime(plusDays(TODAY, 2), 12, 0),
    endsAt: atTime(plusDays(TODAY, 2), 13, 0),
    attendees: [],
    location: "Cafeteria · 1F",
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },

  // ── DAY +3 ────────────────────────────────────────────────
  {
    id: "evt-seed-buildworks",
    title: "BuildWorks Inc · Technical deep dive",
    description: "Their VPE wants to grill us on the multi-tenant architecture. Have the diagrams ready.",
    type: "call",
    startsAt: atTime(plusDays(TODAY, 3), 11, 0),
    endsAt: atTime(plusDays(TODAY, 3), 12, 0),
    attendees: [
      { id: "ext-marcus-bw", name: "Marcus Reid (BuildWorks)", email: "marcus.reid@buildworks.com", rsvp: "accepted" },
      { id: "ext-eli-bw", name: "Eli Foster (BuildWorks)", email: "eli@buildworks.com", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-skip-1on1",
    title: "Skip-level 1:1 · Priya",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 3), 14, 30),
    endsAt: atTime(plusDays(TODAY, 3), 15, 0),
    attendees: [{ id: "p-priya", name: "Priya Shah", email: "priya@vyne.app", rsvp: "accepted" }],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-stripe-deadline",
    title: "Stripe billing integration · ship",
    description: "Priority 4 from implementation plan. Free / $12 / $24 tiers must be live.",
    type: "deadline",
    startsAt: atTime(plusDays(TODAY, 3), 17, 0),
    endsAt: atTime(plusDays(TODAY, 3), 17, 30),
    attendees: [],
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },

  // ── DAY +5 (next Monday-ish) ─────────────────────────────
  {
    id: "evt-seed-board",
    title: "Board meeting · Q3 update",
    description: "30 min growth deck, 20 min product roadmap, 15 min financials, 25 min open Q&A.",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 5), 9, 0),
    endsAt: atTime(plusDays(TODAY, 5), 10, 30),
    attendees: [
      { id: "ext-claire", name: "Claire Beaumont (Lead investor)", email: "claire@a16z.com", rsvp: "accepted" },
      { id: "ext-rajiv", name: "Rajiv Mehta (Board)", email: "rajiv@sequoia.com", rsvp: "accepted" },
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
    ],
    location: "Boardroom A · Sand Hill",
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-1on1-tony-2",
    title: "Weekly 1:1 · Tony",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, 8), 13, 0),
    endsAt: atTime(plusDays(TODAY, 8), 13, 30),
    attendees: [{ id: "p-tony", name: "Tony Mendez", email: "tony@vyne.app", rsvp: "accepted" }],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "weekly",
  },

  // ── PAST EVENTS (so views look populated) ────────────────
  {
    id: "evt-seed-past-retro",
    title: "Sprint retro",
    description:
      "What worked: AI Notes shipped, mobile pass landed. What didn't: too much meeting load. Try: meeting-free Wednesdays.",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, -2), 16, 0),
    endsAt: atTime(plusDays(TODAY, -2), 17, 0),
    attendees: [
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
      { id: "p-marcus", name: "Marcus Johnson", email: "marcus@vyne.app", rsvp: "accepted" },
      { id: "p-priya", name: "Priya Shah", email: "priya@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
  },
  {
    id: "evt-seed-past-acme-pre",
    title: "Acme · Pre-call sync",
    type: "meeting",
    startsAt: atTime(plusDays(TODAY, -1), 13, 0),
    endsAt: atTime(plusDays(TODAY, -1), 13, 30),
    attendees: [
      { id: "p-sarah", name: "Sarah Chen", email: "sarah@vyne.app", rsvp: "accepted" },
    ],
    videoCall: true,
    createdAt: new Date().toISOString(),
    recurrence: "none",
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
