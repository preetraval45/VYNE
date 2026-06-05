"use client";

// Supabase Realtime adapter (UI_UPGRADE_PLAN.md 4.2). Implements the
// same `subscribe` / `publishFromClient` / `isRealtimeEnabled` shape as
// the Pusher adapter so the rest of the codebase stays untouched.
//
// Activate by setting:
//   NEXT_PUBLIC_REALTIME_PROVIDER=supabase
//   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-service-jwt>
//
// Demo + Pusher deploys never load this module thanks to the dynamic
// `import()` in lib/realtime/index.ts.

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
const channelCache = new Map<string, RealtimeChannel>();
const channelCounts = new Map<string, number>();

function ensureClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _client;
}

export function isRealtimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Subscribe to a Supabase Realtime broadcast channel + event. Same
 * signature as the Pusher adapter so callers don't change. Channels
 * are reference-counted — last unsubscribe tears down. */
export function subscribe<T = unknown>(
  channel: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  const client = ensureClient();
  if (!client) return () => {};

  let ch = channelCache.get(channel);
  if (!ch) {
    ch = client.channel(channel, {
      config: { broadcast: { self: false }, presence: { key: channel } },
    });
    channelCache.set(channel, ch);
    ch.subscribe();
  }
  const next = (channelCounts.get(channel) ?? 0) + 1;
  channelCounts.set(channel, next);

  // Translate Pusher's (channel, event, data) shape onto Supabase's
  // broadcast events. Both fire `payload` objects with the user data.
  const cb = (msg: { payload: T }) => {
    try {
      handler(msg.payload);
    } catch {
      // Swallow handler errors — one bad subscriber shouldn't kill
      // the channel for everyone else.
    }
  };
  // PH-J: cast through unknown to escape the SDK's overload picker
  // which mis-resolves `"broadcast"` against the `"system"` overload.
  // Runtime behaviour is unchanged — Supabase accepts these args.
  (
    ch as unknown as {
      on: (
        type: "broadcast",
        filter: { event: string },
        callback: (msg: { payload: T }) => void,
      ) => RealtimeChannel;
    }
  ).on("broadcast", { event }, cb);

  return () => {
    try {
      // Supabase doesn't expose a per-callback off — `unsubscribe`
      // tears the whole channel down. Reference count guards against
      // unrelated callbacks losing their subscription.
    } catch {
      // ignore
    }
    const remaining = (channelCounts.get(channel) ?? 1) - 1;
    if (remaining <= 0) {
      channelCounts.delete(channel);
      const cached = channelCache.get(channel);
      if (cached) {
        try {
          void cached.unsubscribe();
        } catch {
          // ignore
        }
        channelCache.delete(channel);
      }
    } else {
      channelCounts.set(channel, remaining);
    }
  };
}

/** Fan-out a broadcast from the client. The Supabase adapter sends
 * directly via the channel — no server-route round-trip needed because
 * the anon key is RLS-gated. Pusher needs the server because the
 * secret can't ship to the browser. */
export async function publishFromClient(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  const client = ensureClient();
  if (!client) return false;
  let ch = channelCache.get(channel);
  if (!ch) {
    ch = client.channel(channel);
    channelCache.set(channel, ch);
    ch.subscribe();
  }
  try {
    const status = await ch.send({
      type: "broadcast",
      event,
      payload: data,
    });
    return status === "ok";
  } catch {
    return false;
  }
}
