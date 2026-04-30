"use client";

import { useEffect, useState } from "react";

/**
 * Mobile swipe-from-left-edge gesture: when the user starts a touch
 * within 16px of the left viewport edge and drags right ≥ 60px, fire
 * `vyne:open-more` so the bottom-nav More sheet (or any other listener)
 * can open. Pure passive listener — doesn't interfere with horizontal
 * scrolls inside the page since it only activates from the screen edge.
 *
 * Also renders a 2×80px translucent edge hint on the left so the
 * gesture is discoverable. The hint fades out forever after the user
 * has triggered the swipe once (sticky in localStorage).
 */
export function MobileSwipeGesture() {
  const [hintHidden, setHintHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHintHidden(localStorage.getItem("vyne-edge-hint-seen") === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let startX = 0;
    let startY = 0;
    let startEdge = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      startEdge = t.clientX <= 18;
    }
    function onMove(e: TouchEvent) {
      if (!startEdge) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      // Trigger if user has dragged right > 60px and the gesture is
      // mostly horizontal (vertical < 1.5x horizontal).
      if (dx > 60 && dy < dx * 1.5) {
        startEdge = false;
        window.dispatchEvent(new CustomEvent("vyne:open-more"));
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(8);
        }
        try {
          localStorage.setItem("vyne-edge-hint-seen", "1");
        } catch {
          // ignore quota / privacy mode
        }
        setHintHidden(true);
      }
    }
    function onEnd() {
      startEdge = false;
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (hintHidden) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: 3,
        height: 64,
        borderRadius: "0 4px 4px 0",
        background: "linear-gradient(180deg, transparent 0%, rgba(var(--vyne-accent-rgb, 91, 91, 214), 0.45) 50%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 65,
      }}
    />
  );
}
