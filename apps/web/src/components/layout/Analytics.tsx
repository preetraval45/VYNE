"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Minimal pageview analytics. Picks up whichever provider key is set in
// NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST env. No-op when the
// key is missing (dev / demo builds). Intentionally lightweight — no
// third-party SDK bundled; we post events via navigator.sendBeacon.

const PH_KEY =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY) ||
  "";
const PH_HOST =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST) ||
  "https://us.i.posthog.com";

function getDistinctId(): string {
  if (typeof window === "undefined") return "anon";
  const key = "vyne-ph-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

function track(event: string, properties: Record<string, unknown>) {
  if (!PH_KEY || typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      api_key: PH_KEY,
      event,
      distinct_id: getDistinctId(),
      properties: {
        $current_url: window.location.href,
        $host: window.location.host,
        $pathname: window.location.pathname,
        ...properties,
      },
      timestamp: new Date().toISOString(),
    });
    const url = `${PH_HOST}/capture/`;
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // swallow — analytics must never break the app
  }
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("$pageview", { $pathname: pathname });
  }, [pathname]);

  return null;
}
