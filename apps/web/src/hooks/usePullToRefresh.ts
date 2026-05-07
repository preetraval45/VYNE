"use client";

import { useEffect } from "react";

/**
 * usePullToRefresh — page-local subscriber to the global pull-to-refresh
 * bus the dashboard layout publishes.
 *
 *   useEffect ─ window.addEventListener("vyne:soft-refresh", handler)
 *
 * Handlers should be cheap re-fetches: re-hydrate Zustand from the API,
 * re-run a query, etc. The dashboard layout already shows the
 * "Refreshing… → Up to date" toast and broadcasts after its own work
 * (router.refresh + CRM hydrate) so handlers don't need to surface a
 * loading UI of their own.
 *
 * The hook listens to BOTH `vyne:soft-refresh` (the layout-level
 * broadcast) and `vyne:pull-refresh` (the raw PullToRefresh event) so
 * pages can opt in regardless of where the trigger came from.
 *
 *   usePullToRefresh(() => useProjectsStore.getState().hydrateFromServer());
 *
 * The handler reference is captured per-render — pass a stable
 * `useCallback` if you need to avoid re-binding on every render.
 */
export function usePullToRefresh(handler: () => void | Promise<void>): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fn = () => {
      void handler();
    };
    window.addEventListener("vyne:soft-refresh", fn);
    window.addEventListener("vyne:pull-refresh", fn);
    return () => {
      window.removeEventListener("vyne:soft-refresh", fn);
      window.removeEventListener("vyne:pull-refresh", fn);
    };
  }, [handler]);
}
