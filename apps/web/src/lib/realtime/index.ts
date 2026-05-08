"use client";

// Realtime provider dispatcher (UI_UPGRADE_PLAN.md 4.2).
//
// Selects between Pusher (default) and Supabase Realtime based on the
// `NEXT_PUBLIC_REALTIME_PROVIDER` env var. Both adapters expose the
// same `subscribe(channel, event, handler) → unsubscribe`,
// `isRealtimeEnabled()`, and `publishFromClient(channel, event, data)`
// API so callers swap with zero changes.
//
// Pusher is loaded synchronously (default + the existing 16 callers
// expect immediate behavior on mount). Supabase is dynamically loaded
// only when explicitly chosen, so Pusher-only deploys never ship the
// @supabase/supabase-js bundle weight.

import * as pusher from "./pusher";

const provider = (
  process.env.NEXT_PUBLIC_REALTIME_PROVIDER ?? "pusher"
).toLowerCase();

interface RealtimeAdapter {
  isRealtimeEnabled: () => boolean;
  subscribe: <T = unknown>(
    channel: string,
    event: string,
    handler: (data: T) => void,
  ) => () => void;
  publishFromClient: (
    channel: string,
    event: string,
    data: unknown,
  ) => Promise<boolean>;
}

const pusherAdapter: RealtimeAdapter = {
  isRealtimeEnabled: pusher.isRealtimeEnabled,
  subscribe: pusher.subscribe,
  publishFromClient: pusher.publishFromClient,
};

let supabaseAdapter: RealtimeAdapter | null = null;
let supabasePromise: Promise<RealtimeAdapter> | null = null;
function loadSupabase(): Promise<RealtimeAdapter> {
  if (supabaseAdapter) return Promise.resolve(supabaseAdapter);
  if (supabasePromise) return supabasePromise;
  supabasePromise = import("./supabase").then((m) => {
    supabaseAdapter = {
      isRealtimeEnabled: m.isRealtimeEnabled,
      subscribe: m.subscribe,
      publishFromClient: m.publishFromClient,
    };
    return supabaseAdapter;
  });
  return supabasePromise;
}

// Kick the dynamic import early when Supabase is selected so cold-
// start subscribes don't queue.
if (provider === "supabase" && typeof window !== "undefined") {
  void loadSupabase();
}

export function isRealtimeEnabled(): boolean {
  if (provider === "supabase") {
    return supabaseAdapter?.isRealtimeEnabled() ?? false;
  }
  return pusherAdapter.isRealtimeEnabled();
}

export function subscribe<T = unknown>(
  channel: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  if (provider === "supabase") {
    if (supabaseAdapter) {
      return supabaseAdapter.subscribe(channel, event, handler);
    }
    // Adapter still loading — queue + replay so we don't drop early subscribers.
    let cancelled = false;
    let teardown: (() => void) | null = null;
    void loadSupabase().then((a) => {
      if (cancelled) return;
      teardown = a.subscribe(channel, event, handler);
    });
    return () => {
      cancelled = true;
      if (teardown) teardown();
    };
  }
  return pusherAdapter.subscribe(channel, event, handler);
}

export async function publishFromClient(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  if (provider === "supabase") {
    const a = await loadSupabase();
    return a.publishFromClient(channel, event, data);
  }
  return pusherAdapter.publishFromClient(channel, event, data);
}

/** Identifier for the active provider — useful for the status card. */
export function realtimeProvider(): "pusher" | "supabase" {
  return provider === "supabase" ? "supabase" : "pusher";
}
