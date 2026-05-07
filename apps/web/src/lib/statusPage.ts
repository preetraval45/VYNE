"use client";

/**
 * Status page link + live indicator (27.7).
 *
 *   const { url, status } = await getStatusPage();
 *   <a href={url}>{statusLabel(status)}</a>
 *
 * Reads `NEXT_PUBLIC_STATUS_URL` (typically a statuspage.io / Better
 * Stack / Instatus URL). When unset, returns a stub that resolves to
 * `"unknown"` so the footer link still renders without crashing.
 *
 * The live indicator polls `${url}/api/v2/status.json` (the
 * statuspage.io shape) on demand. Result is cached for 60 s in
 * memory so a footer doesn't fan out a network call per page-view.
 */

export type StatusLevel = "operational" | "degraded" | "outage" | "unknown";

interface StatusPageResp {
  status?: { indicator?: "none" | "minor" | "major" | "critical"; description?: string };
}

const CACHE_MS = 60_000;
let cache: { ts: number; level: StatusLevel } | null = null;

export function getStatusUrl(): string {
  return (
    process.env.NEXT_PUBLIC_STATUS_URL ?? "https://status.vyne.app"
  );
}

export async function getStatusLevel(): Promise<StatusLevel> {
  if (typeof window === "undefined") return "unknown";
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.level;
  const url = getStatusUrl();
  try {
    const res = await fetch(`${url}/api/v2/status.json`, { cache: "no-store" });
    if (!res.ok) {
      cache = { ts: Date.now(), level: "unknown" };
      return cache.level;
    }
    const data = (await res.json()) as StatusPageResp;
    const indicator = data.status?.indicator ?? "none";
    const level: StatusLevel =
      indicator === "none"
        ? "operational"
        : indicator === "minor"
          ? "degraded"
          : "outage";
    cache = { ts: Date.now(), level };
    return level;
  } catch {
    cache = { ts: Date.now(), level: "unknown" };
    return cache.level;
  }
}

export function statusLabel(level: StatusLevel): string {
  switch (level) {
    case "operational":
      return "All systems operational";
    case "degraded":
      return "Some systems degraded";
    case "outage":
      return "Major outage";
    case "unknown":
    default:
      return "Service status";
  }
}

export function statusColor(level: StatusLevel): string {
  switch (level) {
    case "operational":
      return "var(--status-success, #22C55E)";
    case "degraded":
      return "var(--status-warning, #F59E0B)";
    case "outage":
      return "var(--status-danger, #EF4444)";
    case "unknown":
    default:
      return "var(--text-tertiary)";
  }
}
