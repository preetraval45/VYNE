"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * usePrefetchOnHover — call `router.prefetch(href)` ~120 ms after the
 * cursor enters a target so the chunk + RSC payload arrive before
 * the user clicks. Cancels on early leave so a fly-by hover doesn't
 * trigger a fetch.
 *
 *   const bind = usePrefetchOnHover();
 *   <Link href="/projects" {...bind("/projects")}>Projects</Link>
 *
 * Pairs well with `<Link prefetch>` for nav-bar items where the
 * default "prefetch on viewport" can be expensive (long sidebars).
 *
 * Touchstart fires immediately so mobile taps still benefit.
 */

export function usePrefetchOnHover(delayMs = 120) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetch = useCallback(
    (href: string) => {
      if (!href) return;
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      try {
        router.prefetch(href);
      } catch {
        // ignore — non-existent route
      }
    },
    [router],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return useCallback(
    (href: string) => ({
      onMouseEnter: () => {
        cancel();
        timerRef.current = setTimeout(() => prefetch(href), delayMs);
      },
      onMouseLeave: cancel,
      onFocus: () => prefetch(href),
      onTouchStart: () => prefetch(href),
    }),
    [cancel, prefetch, delayMs],
  );
}
