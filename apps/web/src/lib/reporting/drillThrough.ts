"use client";

/**
 * Drill-through helpers for charts (22.8).
 *
 * Every chart that renders aggregated data emits a `vyne:drill`
 * CustomEvent when a slice is clicked. The payload carries the
 * filter set the user implicitly applied — callers (typically the
 * parent reporting page) listen for the event and route to a list
 * view with the same filters pre-applied.
 *
 *   chartProps.onSliceClick = (slice) => emitDrill({
 *     entity: "deal",
 *     filters: { stage: slice.label, region: "EMEA" },
 *     measure: { field: "value", agg: "sum", value: slice.total },
 *   });
 *
 *   onMount: subscribeDrill((payload) => router.push(buildDrillUrl(payload)));
 *
 * Decoupling the emitter from the router keeps charts framework-
 * agnostic — the same component works in a dashboard, a marketplace
 * embed, or a doc.
 */

export interface DrillEvent {
  /** The entity type the chart aggregated over. */
  entity: "deal" | "task" | "invoice" | "contact" | "product" | "project" | "ticket" | string;
  /** Filter map applied by the click. Becomes `?key=value&…` on the URL. */
  filters: Record<string, string | number | boolean>;
  /** Measure that produced the visible bar / point. Optional. */
  measure?: {
    field: string;
    agg: "sum" | "count" | "avg" | "min" | "max";
    value: number;
  };
  /** Optional human-readable label, useful for breadcrumbs. */
  label?: string;
}

export type DrillHandler = (e: DrillEvent) => void;

const EVENT = "vyne:drill";

export function emitDrill(payload: DrillEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DrillEvent>(EVENT, { detail: payload }));
}

export function subscribeDrill(handler: DrillHandler): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapped = (e: Event) => {
    const ce = e as CustomEvent<DrillEvent>;
    handler(ce.detail);
  };
  window.addEventListener(EVENT, wrapped);
  return () => window.removeEventListener(EVENT, wrapped);
}

/**
 * Build the canonical drill-through URL. Entity maps to the module
 * route; filters become query params. Pages are responsible for
 * reading the same params back at mount.
 */
export function buildDrillUrl(payload: DrillEvent): string {
  const ROUTE_BY_ENTITY: Record<string, string> = {
    deal: "/crm",
    task: "/projects",
    invoice: "/invoicing",
    contact: "/contacts",
    product: "/ops",
    project: "/projects",
    ticket: "/help",
  };
  const base = ROUTE_BY_ENTITY[payload.entity] ?? "/";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(payload.filters)) {
    params.set(k, String(v));
  }
  if (payload.measure) {
    params.set("measure", `${payload.measure.field}:${payload.measure.agg}`);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
