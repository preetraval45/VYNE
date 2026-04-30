"use client";

// Single shared Pusher client per browser tab. Subscribed channels
// are reference-counted so multiple components using the same channel
// don't double-subscribe and so the connection stays open until every
// subscriber has unsubscribed.
//
// Public broadcasts (channel names without `private-` / `presence-`
// prefix) don't require auth. We use those for org-wide topics like
// `org-demo` so this module stays simple. Upgrade to private channels
// when RBAC/auth is enforced.

import Pusher from "pusher-js";

let _client: Pusher | null = null;
const counts = new Map<string, number>();

function ensureClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  if (_client) return _client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1";
  if (!key) return null;
  _client = new Pusher(key, {
    cluster,
    authEndpoint: "/api/realtime/auth",
    forceTLS: true,
  });
  return _client;
}

export function isRealtimeEnabled(): boolean {
  return Boolean(typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY);
}

/**
 * Subscribe to a Pusher channel + event. Returns an unsubscribe fn.
 * If realtime isn't configured, returns a no-op so callers don't have
 * to feature-detect on every site.
 */
export function subscribe<T = unknown>(
  channel: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  const client = ensureClient();
  if (!client) return () => {};
  let ch = client.channel(channel);
  if (!ch || !ch.subscribed) {
    ch = client.subscribe(channel);
  }
  const next = (counts.get(channel) ?? 0) + 1;
  counts.set(channel, next);
  ch.bind(event, handler);
  return () => {
    try {
      ch.unbind(event, handler);
    } catch {
      // ignore
    }
    const remaining = (counts.get(channel) ?? 1) - 1;
    if (remaining <= 0) {
      counts.delete(channel);
      try {
        client.unsubscribe(channel);
      } catch {
        // ignore
      }
    } else {
      counts.set(channel, remaining);
    }
  };
}

/**
 * Fire-and-forget publish from the client. Goes through the server
 * `/api/realtime/publish` route so the secret stays server-side. Most
 * mutations should publish from their REST handler instead, so a
 * persist + broadcast happens in one round-trip; this helper is for
 * UI-only signals (typing indicator, presence).
 */
export async function publishFromClient(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  if (!isRealtimeEnabled()) return false;
  try {
    const res = await fetch("/api/realtime/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, event, data }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}
