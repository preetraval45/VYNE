// PH-J — Provider auto-select tests.
//
// The dispatcher resolves the active provider on first use based on
// env vars. The property we MUST guarantee: when NO env vars are set,
// SSE wins (the always-on fallback). When NEXT_PUBLIC_PUSHER_KEY is
// set, Pusher wins. When only Supabase env is set, Supabase wins.
// Explicit NEXT_PUBLIC_REALTIME_PROVIDER overrides everything.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We dynamically import the dispatcher inside each test AFTER setting
// env so the first-call memoisation resolves against the right config.
async function importFresh() {
  vi.resetModules();
  return await import("../index");
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Strip all realtime envs so each test starts from "nothing
  // configured" then opts in to specific ones.
  delete process.env.NEXT_PUBLIC_REALTIME_PROVIDER;
  delete process.env.NEXT_PUBLIC_PUSHER_KEY;
  delete process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("realtime dispatcher — auto-select", () => {
  it("falls back to SSE when no env vars are set", async () => {
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("sse");
    // SSE is always-on — isRealtimeEnabled returns true (provided
    // we're in a window-ish environment; jsdom counts).
    expect(mod.isRealtimeEnabled()).toBe(true);
  });

  it("picks Pusher when NEXT_PUBLIC_PUSHER_KEY is set", async () => {
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-pusher-key";
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("pusher");
  });

  it("picks Supabase when both Supabase env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("supabase");
  });

  it("does NOT pick Supabase when only one of the two env vars is set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    // ANON_KEY intentionally missing.
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("sse");
  });

  it("explicit NEXT_PUBLIC_REALTIME_PROVIDER overrides the auto-pick", async () => {
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-pusher-key";
    process.env.NEXT_PUBLIC_REALTIME_PROVIDER = "sse";
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("sse");
  });

  it("Pusher wins over Supabase when both are configured", async () => {
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-pusher-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("pusher");
  });

  it("memoises the choice — second call returns the same provider", async () => {
    const mod = await importFresh();
    const first = mod.realtimeProvider();
    // Even if env changes after the first call, the memo stands until
    // _resetProviderForTests is invoked. (Production: env doesn't
    // change at runtime.)
    process.env.NEXT_PUBLIC_PUSHER_KEY = "added-after-first-call";
    expect(mod.realtimeProvider()).toBe(first);
  });

  it("_resetProviderForTests lets a test re-evaluate", async () => {
    const mod = await importFresh();
    expect(mod.realtimeProvider()).toBe("sse");
    process.env.NEXT_PUBLIC_PUSHER_KEY = "now-set";
    mod._resetProviderForTests();
    expect(mod.realtimeProvider()).toBe("pusher");
  });
});

describe("realtime dispatcher — SSE subscribe never returns null", () => {
  it("subscribe in SSE mode returns a function (no-key fallback never noops away the surface)", async () => {
    const mod = await importFresh();
    // jsdom has no real EventSource — stub it so calling subscribe
    // doesn't throw. We're only asserting the API surface contract:
    // subscribe ALWAYS returns an unsubscribe function.
    (globalThis as unknown as { EventSource: unknown }).EventSource = class {
      addEventListener() {}
      removeEventListener() {}
      close() {}
      readyState = 0;
    };
    const off = mod.subscribe("ch", "ev", () => undefined);
    expect(typeof off).toBe("function");
    off();
  });
});
