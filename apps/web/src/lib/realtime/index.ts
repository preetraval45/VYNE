"use client";

// PH-J — Realtime provider dispatcher with always-on fallback.
//
// Selection order at first call (not at module load — allows tests to
// stub env between cases):
//   1. NEXT_PUBLIC_REALTIME_PROVIDER overrides everything (escape hatch).
//   2. NEXT_PUBLIC_PUSHER_KEY → Pusher.
//   3. NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase.
//   4. SSE fallback (lib/realtime/sse.ts) — always works, no env needed.
//
// Same `subscribe`/`publishFromClient`/`isRealtimeEnabled` contract
// across all three. Callers don't change.

import * as pusher from "./pusher";
import * as sse from "./sse";

type ProviderName = "pusher" | "supabase" | "sse";

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

const sseAdapter: RealtimeAdapter = {
  isRealtimeEnabled: sse.isRealtimeEnabled,
  subscribe: sse.subscribe,
  publishFromClient: sse.publishFromClient,
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

// Resolve the active provider on first invocation + memo. Env vars
// are read at runtime so the same build can switch providers across
// deployments without rebuilding.
let resolved: ProviderName | null = null;
function pickProvider(): ProviderName {
  if (resolved) return resolved;
  const override = (
    process.env.NEXT_PUBLIC_REALTIME_PROVIDER ?? ""
  ).toLowerCase();
  if (override === "pusher" || override === "supabase" || override === "sse") {
    resolved = override;
    return resolved;
  }
  if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
    resolved = "pusher";
  } else if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    resolved = "supabase";
  } else {
    resolved = "sse";
  }
  return resolved;
}

// Kick the Supabase dynamic import early when it's the chosen
// provider so cold-start subscribes don't queue.
if (typeof window !== "undefined" && pickProvider() === "supabase") {
  void loadSupabase();
}

export function isRealtimeEnabled(): boolean {
  const p = pickProvider();
  if (p === "pusher") return pusherAdapter.isRealtimeEnabled();
  if (p === "supabase") return supabaseAdapter?.isRealtimeEnabled() ?? false;
  return sseAdapter.isRealtimeEnabled();
}

export function subscribe<T = unknown>(
  channel: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  const p = pickProvider();
  if (p === "pusher") return pusherAdapter.subscribe(channel, event, handler);
  if (p === "sse") return sseAdapter.subscribe(channel, event, handler);
  // Supabase — dynamic load with queue + replay so we don't drop
  // early subscribers issued before the import resolves.
  if (supabaseAdapter) {
    return supabaseAdapter.subscribe(channel, event, handler);
  }
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

export async function publishFromClient(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  const p = pickProvider();
  if (p === "pusher")
    return pusherAdapter.publishFromClient(channel, event, data);
  if (p === "sse") return sseAdapter.publishFromClient(channel, event, data);
  const a = await loadSupabase();
  return a.publishFromClient(channel, event, data);
}

/** Identifier for the active provider — useful for the status card. */
export function realtimeProvider(): ProviderName {
  return pickProvider();
}

/** Test-only — reset the memoised provider so a test can swap env vars. */
export function _resetProviderForTests(): void {
  resolved = null;
}
