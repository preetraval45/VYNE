"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Report templates marketplace (22.11). Curated dashboard recipes
 * that install with one click — each template carries the entity
 * mapping, the chart layout, and the recommended filters so a user
 * goes from "empty workspace" to "running revenue dashboard" in 5
 * seconds.
 *
 * Distinct from `recordTemplates.ts` (Phase 20.9) — that one
 * pre-fills a single record; this one assembles a full report.
 */

export type ChartType =
  | "kpi"
  | "line"
  | "bar"
  | "pie"
  | "funnel"
  | "sankey"
  | "heatmap"
  | "geo"
  | "network"
  | "pivot";

export interface ReportTemplate {
  id: string;
  name: string;
  /** Short pitch shown on the marketplace tile. */
  blurb: string;
  category:
    | "Sales"
    | "Operations"
    | "Finance"
    | "Engineering"
    | "Marketing"
    | "Leadership";
  /** Pre-baked chart layout (rendered by the host page). */
  charts: Array<{
    type: ChartType;
    title: string;
    /** Source entity — `deals`, `tasks`, `invoices`, … */
    entity: string;
    /** Optional filter shape. */
    filters?: Record<string, string | number | boolean>;
    /** Measure / dimension config — schema varies per chart type. */
    config?: Record<string, unknown>;
  }>;
  /** Times this template has been applied workspace-wide. */
  uses: number;
  /** Optional emoji badge. */
  icon?: string;
  /** Marketplace-shared (true) vs personal (false). */
  shared: boolean;
  createdAt: string;
}

interface ReportTemplatesStore {
  templates: ReportTemplate[];
  saveTemplate: (
    payload: Omit<ReportTemplate, "id" | "uses" | "createdAt">,
  ) => ReportTemplate;
  removeTemplate: (id: string) => void;
  applyTemplate: (id: string) => ReportTemplate | null;
  templatesForCategory: (category: ReportTemplate["category"]) => ReportTemplate[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rtpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const SEEDS: ReportTemplate[] = [
  {
    id: "seed-revenue-pulse",
    name: "Revenue pulse",
    blurb: "MRR + ARR + new bookings + churn — the leadership weekly view.",
    category: "Leadership",
    icon: "📈",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "kpi", title: "MRR", entity: "deals", config: { measure: "value", agg: "sum" } },
      { type: "kpi", title: "Bookings MTD", entity: "deals", filters: { stage: "Won" } },
      { type: "line", title: "Bookings trend", entity: "deals", config: { x: "closeDate", y: "value" } },
      { type: "funnel", title: "Pipeline funnel", entity: "deals" },
    ],
  },
  {
    id: "seed-sales-velocity",
    name: "Sales velocity",
    blurb: "Days-in-stage, win rate, top reps, stalled deals.",
    category: "Sales",
    icon: "💼",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "kpi", title: "Win rate", entity: "deals", config: { measure: "stage", agg: "count" } },
      { type: "bar", title: "Bookings by rep", entity: "deals", config: { x: "owner", y: "value" } },
      { type: "sankey", title: "Stage progression", entity: "deals" },
    ],
  },
  {
    id: "seed-customer-success",
    name: "Customer success",
    blurb: "Health scores, onboarding progress, churn risk by ARR.",
    category: "Operations",
    icon: "🛟",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "kpi", title: "Active customers", entity: "contacts" },
      { type: "heatmap", title: "Activity heatmap", entity: "tasks" },
      { type: "geo", title: "Customer footprint", entity: "contacts" },
    ],
  },
  {
    id: "seed-engineering-throughput",
    name: "Engineering throughput",
    blurb: "Velocity, deploys / week, change failure rate, MTTR.",
    category: "Engineering",
    icon: "🛠",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "kpi", title: "Deploys this week", entity: "tasks", filters: { status: "Done" } },
      { type: "heatmap", title: "Commits by day", entity: "tasks" },
      { type: "pivot", title: "Tasks by team × status", entity: "tasks" },
    ],
  },
  {
    id: "seed-finance-monthly-close",
    name: "Finance monthly close",
    blurb: "AR aging, invoice status, late-paying customers, cashflow.",
    category: "Finance",
    icon: "💰",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "kpi", title: "AR outstanding", entity: "invoices", filters: { status: "Sent" } },
      { type: "bar", title: "Aging buckets", entity: "invoices" },
      { type: "line", title: "Cashflow", entity: "invoices", config: { x: "issuedAt", y: "amount" } },
    ],
  },
  {
    id: "seed-marketing-funnel",
    name: "Marketing funnel",
    blurb: "Visitors → leads → MQLs → SQLs → opportunities.",
    category: "Marketing",
    icon: "📣",
    shared: true,
    uses: 0,
    createdAt: new Date(0).toISOString(),
    charts: [
      { type: "funnel", title: "Acquisition funnel", entity: "contacts" },
      { type: "geo", title: "Lead origin", entity: "contacts" },
      { type: "kpi", title: "MQLs this week", entity: "contacts" },
    ],
  },
];

export const useReportTemplates = create<ReportTemplatesStore>()(
  persist(
    (set, get) => ({
      templates: SEEDS,
      saveTemplate: (payload) => {
        const row: ReportTemplate = {
          id: newId(),
          uses: 0,
          createdAt: new Date().toISOString(),
          ...payload,
        };
        set((s) => ({ templates: [row, ...s.templates] }));
        return row;
      },
      removeTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      applyTemplate: (id) => {
        const tpl = get().templates.find((t) => t.id === id);
        if (!tpl) return null;
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, uses: t.uses + 1 } : t,
          ),
        }));
        // Deep clone so callers can mutate.
        return JSON.parse(JSON.stringify(tpl)) as ReportTemplate;
      },
      templatesForCategory: (category) =>
        get()
          .templates.filter((t) => t.category === category)
          .sort((a, b) => b.uses - a.uses),
    }),
    { name: "vyne-report-templates", version: 1 },
  ),
);
