"use client";

// Audit-log client mirror (UI_UPGRADE_PLAN.md 8.7).
//
// `recordAudit({ action, entityRef, ... })` posts to /api/audit so the
// canonical trail lives in Postgres. Any existing client-side activity
// store can keep its localStorage cache for instant feed rendering
// while this fires the server write in the background.
//
// Failures are silenced — the route 401's for unauthenticated calls
// in production, which is fine: those logs aren't meaningful anyway.
// Demo cookie sessions count as authenticated owner per requireRole.

export interface AuditEventInput {
  action: string;
  entityRef?: string;
  category?: "data" | "auth" | "billing" | "security" | "system";
  summary?: string;
  diff?: unknown;
  severity?: "info" | "warning" | "critical";
}

/** Fire-and-forget audit write. Never throws. */
export function recordAudit(input: AuditEventInput): void {
  if (typeof window === "undefined") return;
  if (!input.action) return;
  void fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true, // survive page navigation
  }).catch(() => {
    /* swallow */
  });
}

export interface AuditEventRow {
  id: string;
  actorId: string;
  actorName: string;
  entityRef: string;
  action: string;
  category: string;
  summary: string;
  severity: string;
  createdAt: string;
}

/** Admin helper to load the canonical log for a Settings panel. */
export async function fetchAuditLog(
  filters: {
    entityRef?: string;
    actorId?: string;
    category?: string;
    since?: string;
    limit?: number;
  } = {},
): Promise<AuditEventRow[]> {
  const qs = new URLSearchParams();
  if (filters.entityRef) qs.set("entityRef", filters.entityRef);
  if (filters.actorId) qs.set("actorId", filters.actorId);
  if (filters.category) qs.set("category", filters.category);
  if (filters.since) qs.set("since", filters.since);
  if (filters.limit) qs.set("limit", String(filters.limit));
  try {
    const res = await fetch(`/api/audit?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { events?: AuditEventRow[] };
    return Array.isArray(body.events) ? body.events : [];
  } catch {
    return [];
  }
}
