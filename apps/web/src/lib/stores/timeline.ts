"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimelineSource =
  | "github"
  | "sentry"
  | "datadog"
  | "stripe"
  | "hubspot"
  | "linear"
  | "pagerduty"
  | "slack"
  | "vyne";

export type TimelineKind =
  | "deploy"
  | "pr_merged"
  | "pr_opened"
  | "push"
  | "incident"
  | "alert"
  | "error_spike"
  | "deal_won"
  | "deal_lost"
  | "deal_advanced"
  | "churn"
  | "new_customer"
  | "issue_created"
  | "issue_resolved"
  | "release"
  | "comment"
  | "other";

export interface TimelineEvent {
  id: string;
  source: TimelineSource;
  kind: TimelineKind;
  title: string;
  detail?: string;
  /** Author / actor name */
  actor?: string;
  /** ISO timestamp */
  timestamp: string;
  /** Source-system url to deep-link the event */
  url?: string;
  /** Customer / deal / project this event affects (for cross-system correlation) */
  customer?: string;
  /** Severity 0-4 (0=info, 4=critical) */
  severity?: number;
  /** Raw payload for debugging */
  rawType?: string;
  /** Money impact in USD if applicable */
  amountUSD?: number;
}

interface TimelineState {
  events: TimelineEvent[];
  ingest: (e: Omit<TimelineEvent, "id"> & { id?: string }) => TimelineEvent;
  ingestMany: (events: Array<Omit<TimelineEvent, "id"> & { id?: string }>) => void;
  /** Events within the last N hours (default 24) */
  recent: (hours?: number) => TimelineEvent[];
  /** Events for a specific customer */
  forCustomer: (customer: string) => TimelineEvent[];
  /** Events near a target timestamp (default ±2h window) */
  near: (timestamp: string, windowMs?: number) => TimelineEvent[];
  clear: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;

// Seeded events demonstrating cross-system correlation. The point of the
// timeline is to show that VYNE pulls from multiple sources — so each
// source contributes a distinct visual identity in the seed.
const SEED_EVENTS: TimelineEvent[] = [
  {
    id: "seed-gh-1",
    source: "github",
    kind: "deploy",
    title: "api-service@v2.4.1 deployed to prod",
    detail: "Tagged release · main → prod via GitHub Actions",
    actor: "CI/CD",
    timestamp: new Date(NOW - 9 * HOUR).toISOString(),
    url: "https://github.com/preetraval45/VYNE/deployments",
    severity: 0,
    rawType: "deployment",
  },
  {
    id: "seed-sentry-1",
    source: "sentry",
    kind: "error_spike",
    title: "🚨 Error spike in api-service",
    detail: "47 'Missing IAM permission' errors in 2 min — preceded by deploy of v2.4.1",
    actor: "Sentry",
    timestamp: new Date(NOW - 8 * HOUR - 45 * 60_000).toISOString(),
    severity: 4,
    customer: "Acme Corp · MediHealth · BuildWorks",
    rawType: "alert",
  },
  {
    id: "seed-stripe-1",
    source: "stripe",
    kind: "deal_lost",
    title: "47 charge_failed events — $12,400 at risk",
    detail: "Customers can't complete checkout while api-service is down",
    actor: "Stripe",
    timestamp: new Date(NOW - 8 * HOUR - 30 * 60_000).toISOString(),
    severity: 3,
    amountUSD: 12_400,
    rawType: "charge.failed",
  },
  {
    id: "seed-vyne-1",
    source: "vyne",
    kind: "incident",
    title: "VYNE AI: rolling back to v2.4.0",
    detail:
      "Correlated deploy → error spike → revenue impact. Suggested rollback. Confidence 92%.",
    actor: "VYNE AI",
    timestamp: new Date(NOW - 8 * HOUR - 25 * 60_000).toISOString(),
    severity: 2,
    rawType: "ai.recommendation",
  },
  {
    id: "seed-gh-2",
    source: "github",
    kind: "deploy",
    title: "api-service@v2.4.0 redeployed (rollback)",
    detail: "Hotfix complete · errors back to baseline",
    actor: "ops-bot",
    timestamp: new Date(NOW - 8 * HOUR).toISOString(),
    severity: 0,
    rawType: "deployment",
  },
  {
    id: "seed-hub-1",
    source: "hubspot",
    kind: "deal_won",
    title: "Acme Corp · Renewal closed",
    detail: "$48K ARR · 2-year term · CSM: Sarah Chen",
    actor: "Sarah Chen",
    timestamp: new Date(NOW - 6 * HOUR).toISOString(),
    customer: "Acme Corp",
    amountUSD: 48_000,
    severity: 0,
    rawType: "deal.won",
  },
  {
    id: "seed-linear-1",
    source: "linear",
    kind: "issue_resolved",
    title: "ENG-203 · IAM permission fix",
    detail: "Root cause for the v2.4.1 failure documented + closed",
    actor: "Tony Mendez",
    timestamp: new Date(NOW - 5 * HOUR).toISOString(),
    severity: 0,
    rawType: "issue.completed",
  },
  {
    id: "seed-gh-3",
    source: "github",
    kind: "pr_merged",
    title: "PR #312 — Improve error logging in auth-service",
    detail: "+187 -42 · merged by Marcus Johnson",
    actor: "Marcus Johnson",
    timestamp: new Date(NOW - 4 * HOUR).toISOString(),
    severity: 0,
    rawType: "pull_request.closed",
  },
  {
    id: "seed-pagerduty-1",
    source: "pagerduty",
    kind: "alert",
    title: "p99 latency > 800ms on api-service",
    detail: "Auto-resolved after 4 min — likely Stripe webhook backlog",
    actor: "PagerDuty",
    timestamp: new Date(NOW - 3 * HOUR).toISOString(),
    severity: 2,
    rawType: "incident",
  },
  {
    id: "seed-stripe-2",
    source: "stripe",
    kind: "new_customer",
    title: "FinEdge Capital · subscription started",
    detail: "Business plan · $24/seat × 12 seats · trial → paid",
    actor: "Stripe",
    timestamp: new Date(NOW - 2 * HOUR).toISOString(),
    customer: "FinEdge Capital",
    amountUSD: 288,
    severity: 0,
    rawType: "subscription.created",
  },
  {
    id: "seed-hub-2",
    source: "hubspot",
    kind: "deal_advanced",
    title: "BuildWorks · moved to Negotiation",
    detail: "$72K ARR · expected close: end of month",
    actor: "Marcus Reid (BuildWorks)",
    timestamp: new Date(NOW - 90 * 60_000).toISOString(),
    customer: "BuildWorks Inc",
    amountUSD: 72_000,
    severity: 0,
    rawType: "deal.stage_changed",
  },
  {
    id: "seed-gh-4",
    source: "github",
    kind: "push",
    title: "5 commits pushed to feature/onboarding-v2",
    detail: "Sarah Chen · ready for review",
    actor: "Sarah Chen",
    timestamp: new Date(NOW - 60 * 60_000).toISOString(),
    severity: 0,
    rawType: "push",
  },
  {
    id: "seed-vyne-2",
    source: "vyne",
    kind: "comment",
    title: "VYNE AI: BuildWorks contract expires Friday",
    detail: "Heads up — renewal not yet scheduled. Suggesting Tony reach out today.",
    actor: "VYNE AI",
    timestamp: new Date(NOW - 30 * 60_000).toISOString(),
    customer: "BuildWorks Inc",
    severity: 1,
    rawType: "ai.nudge",
  },
];

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      events: SEED_EVENTS,

      ingest: (e) => {
        const evt: TimelineEvent = { ...e, id: e.id ?? newId() };
        set((s) => {
          if (s.events.some((x) => x.id === evt.id)) return s;
          return {
            events: [...s.events, evt]
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .slice(0, 500), // cap so localStorage doesn't balloon
          };
        });
        return evt;
      },

      ingestMany: (events) =>
        set((s) => {
          const existingIds = new Set(s.events.map((x) => x.id));
          const next = [
            ...s.events,
            ...events
              .map((e) => ({ ...e, id: e.id ?? newId() }))
              .filter((e) => !existingIds.has(e.id!)),
          ];
          return {
            events: next
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .slice(0, 500),
          };
        }),

      recent: (hours = 24) => {
        const cutoff = Date.now() - hours * HOUR;
        return get().events.filter(
          (e) => new Date(e.timestamp).getTime() >= cutoff,
        );
      },

      forCustomer: (customer) =>
        get().events.filter((e) =>
          e.customer
            ?.toLowerCase()
            .split(/[·,;|]/)
            .map((s) => s.trim())
            .some((s) => s === customer.toLowerCase()),
        ),

      near: (timestamp, windowMs = 2 * HOUR) => {
        const target = new Date(timestamp).getTime();
        return get().events.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return Math.abs(t - target) <= windowMs;
        });
      },

      clear: () => set({ events: SEED_EVENTS }),
    }),
    {
      name: "vyne-timeline",
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // If user has cleared everything, reseed so demo isn't empty
        if (state.events.length === 0) {
          state.events = SEED_EVENTS;
        }
      },
    },
  ),
);
