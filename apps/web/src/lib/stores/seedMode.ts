// Seed gate: returns true only when this browser is in demo mode.
//
// The demo button on /login writes a `vyne-demo=1` cookie (via
// /api/auth/session) and a `vyne-demo-seed=1` localStorage flag (set
// by `enterDemo()` so client-only stores don't have to parse cookies).
// Real signups never set either, so their stores boot empty and only
// fill up as they create their own data.
//
// Why both? The cookie is what the middleware checks to allow access
// to /home. The localStorage flag exists because Zustand store init
// runs at module load time, before React mounts — `document.cookie` is
// available there, but a single boolean accessor keeps the per-store
// callers tidy.

const SEED_FLAG = "vyne-demo-seed";

function readDemoCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)vyne-demo=1\b/.test(document.cookie);
}

function readDemoFlag(): boolean {
  if (typeof globalThis.window === "undefined") return false;
  try {
    return globalThis.window.localStorage.getItem(SEED_FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * True when the current browser is the demo session. Use to gate
 * fixture seeding (INITIAL / MOCK arrays) inside Zustand store creators
 * so a real signup lands on an empty workspace.
 */
export function shouldSeedFixtures(): boolean {
  return readDemoCookie() || readDemoFlag();
}

/** Pick fixtures vs empty list based on demo mode. Accepts readonly
 *  fixtures (some are declared `as const`) and returns the same shape. */
export function seedOrEmpty<T>(fixtures: readonly T[]): T[] {
  return shouldSeedFixtures() ? (fixtures as T[]) : [];
}

/** Mark this browser as the demo session. Called by the demo button. */
export function markDemoSession() {
  if (typeof globalThis.window === "undefined") return;
  try {
    globalThis.window.localStorage.setItem(SEED_FLAG, "1");
  } catch {
    /* storage disabled — cookie is the source of truth anyway */
  }
}

/** Clear the demo flag (used on real signup/login + logout). */
export function clearDemoSession() {
  if (typeof globalThis.window === "undefined") return;
  try {
    globalThis.window.localStorage.removeItem(SEED_FLAG);
  } catch {
    /* ignore */
  }
}
