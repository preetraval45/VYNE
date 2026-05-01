"use client";

import { useCallback, useEffect, useState } from "react";

export type TimeRange = "24h" | "7d" | "30d" | "90d" | "ytd" | "all";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24h",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
  all: "All time",
};

export const TIME_RANGE_OPTIONS: TimeRange[] = ["24h", "7d", "30d", "90d", "ytd", "all"];

/**
 * Convert a TimeRange to a millisecond cutoff (Date.now() - cutoff = start).
 * Returns 0 for "all" (no filter).
 */
export function timeRangeToMs(range: TimeRange): number {
  switch (range) {
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d": return 7 * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    case "90d": return 90 * 24 * 60 * 60 * 1000;
    case "ytd": {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return now.getTime() - start.getTime();
    }
    case "all": return 0;
  }
}

/**
 * usePageDashboard — manages time-range state per page with localStorage
 * persistence. Each page passes a stable storage key (e.g. "crm").
 *
 * Returns range + setter. Pages compute KPIs from this range using
 * timeRangeToMs() against their own data.
 */
export function usePageDashboard(
  storageKey: string,
  defaultRange: TimeRange = "7d",
) {
  const [range, setRangeState] = useState<TimeRange>(defaultRange);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(`vyne-dash-range:${storageKey}`);
      if (saved && TIME_RANGE_OPTIONS.includes(saved as TimeRange)) {
        setRangeState(saved as TimeRange);
      }
    } catch {
      // localStorage may throw in private browsing — safe to ignore
    }
    setHydrated(true);
  }, [storageKey]);

  const setRange = useCallback(
    (next: TimeRange) => {
      setRangeState(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`vyne-dash-range:${storageKey}`, next);
        } catch {
          // ignore quota / private mode errors
        }
      }
    },
    [storageKey],
  );

  // Phase 6.2: Alt+1 / Alt+7 / Alt+3 switch range to 24h / 7d / 30d.
  // Wired here so any page using usePageDashboard inherits the shortcut.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      // Skip when typing in an input — don't hijack form fields.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      let next: TimeRange | null = null;
      if (e.key === "1") next = "24h";
      else if (e.key === "7") next = "7d";
      else if (e.key === "3") next = "30d";
      if (next) {
        e.preventDefault();
        setRange(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setRange]);

  return { range, setRange, hydrated, cutoffMs: timeRangeToMs(range) };
}
