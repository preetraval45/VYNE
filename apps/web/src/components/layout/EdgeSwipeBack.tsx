"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { haptics } from "@/lib/haptics";

/**
 * iOS-style edge-swipe-back gesture. Touch starts within 16px of the
 * left viewport edge → drag right ≥ 90px → router.back(). Sibling of
 * MobileSwipeGesture (which opens the More sheet); they coexist
 * because the More sheet wants 60px threshold and back wants 90px,
 * and the More sheet is suppressed on detail routes via this
 * component's call to stopPropagation.
 *
 * Only fires on detail routes (paths with a dynamic segment like
 * `/crm/deals/d3` or `/projects/p1/tasks/t1`) to avoid duplicating
 * the MobileBottomNav More-sheet swipe on top-level pages.
 */
export function EdgeSwipeBack() {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only enable on routes that have an obvious "back" target.
    const isDetail = /\/[a-z0-9-]+\/[a-z0-9_-]{6,}/i.test(pathname) ||
                     /\/[a-z]+\/[a-z]+\/[a-z0-9_-]+/i.test(pathname);
    if (!isDetail) return;

    let startX = 0;
    let startY = 0;
    let startEdge = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startEdge = t.clientX <= 16;
    }
    function onMove(e: TouchEvent) {
      if (!startEdge) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 90 && dy < dx * 1.2) {
        startEdge = false;
        haptics.bump();
        router.back();
      }
    }
    function onEnd() {
      startEdge = false;
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pathname, router]);

  return null;
}
