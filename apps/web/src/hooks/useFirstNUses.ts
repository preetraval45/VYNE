"use client";

import { useEffect, useState } from "react";

/**
 * useFirstNUses — return `true` for the first N times a user "uses" a
 * feature, then `false` forever after. Increment is opt-in (caller
 * decides what counts as a use).
 *
 *   const { firstUses, recordUse } = useFirstNUses("cmdk", 3);
 *   …
 *   onClick={() => { recordUse(); openPalette(); }}
 *   {firstUses && <Tip>Tap ⌘+K anytime to jump anywhere</Tip>}
 *
 * Backed by localStorage so the count survives reloads.
 */

const STORAGE_PREFIX = "vyne-first-uses-";

export interface UseFirstNUsesResult {
  /** True while count < n (you should still show the helper hint). */
  firstUses: boolean;
  /** Current count. */
  count: number;
  /** Bump the counter — usually called when the feature is invoked. */
  recordUse: () => void;
  /** Reset to 0 — for "show me the tips again" admin actions. */
  reset: () => void;
}

function readCount(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  return raw ? Math.max(0, Number.parseInt(raw, 10)) : 0;
}

function writeCount(key: string, n: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(n));
  } catch {
    // ignore quota errors
  }
}

export function useFirstNUses(key: string, n = 3): UseFirstNUsesResult {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readCount(key));
  }, [key]);

  return {
    firstUses: count < n,
    count,
    recordUse: () => {
      const next = readCount(key) + 1;
      writeCount(key, next);
      setCount(next);
    },
    reset: () => {
      writeCount(key, 0);
      setCount(0);
    },
  };
}
