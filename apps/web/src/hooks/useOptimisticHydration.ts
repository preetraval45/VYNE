"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useOptimisticHydration — render the last-known persisted value
 * immediately, refetch in the background, diff-merge the result back
 * into state.
 *
 *   const { data, status } = useOptimisticHydration({
 *     key: "deals",
 *     read: () => useCRMStore.getState().deals,
 *     fetch: () => api.deals.list(),
 *     write: (next) => useCRMStore.getState().setAll(next),
 *   });
 *
 * Behaviour:
 *   - On mount, returns whatever `read()` returns synchronously
 *     (typically a hydrated Zustand cache → instant first paint).
 *   - Fires `fetch()` immediately. When it resolves, diff-merge
 *     against the cache and call `write()` so the persisted store
 *     is now authoritative.
 *   - `status` cycles through "stale" → "syncing" → "fresh" so the
 *     caller can show a subtle loading dot during the refetch.
 *
 * Pairs with the existing `<PullToRefresh />` for explicit re-syncs.
 */

export type HydrationStatus = "stale" | "syncing" | "fresh" | "error";

export interface OptimisticHydrationOpts<T> {
  /** Stable id used for telemetry / dedupe across remounts. */
  key: string;
  /** Read the locally-persisted value (sync). */
  read: () => T;
  /** Network fetch to refresh against. */
  fetch: () => Promise<T>;
  /** Persist the merged result back to the store. */
  write: (next: T) => void;
  /** When `false`, skips the refetch (e.g. while offline). Default true. */
  enabled?: boolean;
  /** Custom equality check used to skip a write when nothing changed. */
  equals?: (a: T, b: T) => boolean;
}

export interface OptimisticHydrationResult<T> {
  data: T;
  status: HydrationStatus;
  error: Error | null;
  /** Manually re-run the fetch (used by pull-to-refresh wiring). */
  refresh: () => Promise<void>;
}

const inflight = new Map<string, Promise<unknown>>();

function defaultEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useOptimisticHydration<T>(
  opts: OptimisticHydrationOpts<T>,
): OptimisticHydrationResult<T> {
  const { key, read, fetch, write, enabled = true } = opts;
  const equals = opts.equals ?? defaultEquals;

  const [data, setData] = useState<T>(() => read());
  const [status, setStatus] = useState<HydrationStatus>("stale");
  const [error, setError] = useState<Error | null>(null);
  const liveRef = useRef(true);

  const refresh = async () => {
    if (!enabled) return;
    setStatus("syncing");
    setError(null);
    try {
      // Dedupe across components that mount around the same instant.
      let promise = inflight.get(key) as Promise<T> | undefined;
      if (!promise) {
        promise = fetch();
        inflight.set(key, promise);
        promise.finally(() => {
          if (inflight.get(key) === promise) inflight.delete(key);
        });
      }
      const next = await promise;
      if (!liveRef.current) return;
      const cur = read();
      if (!equals(cur, next)) {
        write(next);
        setData(next);
      } else {
        setData(cur);
      }
      setStatus("fresh");
    } catch (err) {
      if (!liveRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }
  };

  useEffect(() => {
    liveRef.current = true;
    void refresh();
    return () => {
      liveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { data, status, error, refresh };
}
