"use client";

import { useEffect, useState } from "react";

/**
 * Pull-to-refresh: when the user is at scrollTop=0 on a touch device
 * and pulls down ≥ 70px, fire `vyne:pull-refresh` so any list page
 * can reload its data. Renders a small "↓ Release to refresh" pill at
 * the top while the user is mid-pull. Touch-only — no-op on desktop.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let startY = 0;
    let active = false;

    function getScrollContainer(): HTMLElement | Window {
      const main = document.getElementById("main-content");
      return main ?? window;
    }
    function scrollTopOf(el: HTMLElement | Window) {
      return el === window
        ? window.scrollY
        : (el as HTMLElement).scrollTop;
    }

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const cont = getScrollContainer();
      if (scrollTopOf(cont) > 0) return;
      startY = t.clientY;
      active = true;
    }
    function onMove(e: TouchEvent) {
      if (!active) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY;
      if (dy > 0) {
        // Damp the pull distance so it feels physical
        setPull(Math.min(120, dy * 0.55));
      } else {
        setPull(0);
      }
    }
    function onEnd() {
      if (active && pull >= 70) {
        window.dispatchEvent(new CustomEvent("vyne:pull-refresh"));
        // Mirror by triggering a soft reload of TanStack queries via a
        // bubble event — list pages can listen and call refetch().
      }
      active = false;
      setPull(0);
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull]);

  if (pull === 0) return null;
  const ready = pull >= 70;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 8 + Math.min(40, pull * 0.4),
        left: "50%",
        transform: `translateX(-50%) scale(${ready ? 1 : 0.85})`,
        zIndex: 96,
        padding: "5px 14px",
        borderRadius: 999,
        background: ready
          ? "var(--vyne-teal)"
          : "var(--content-bg)",
        color: ready ? "#fff" : "var(--text-secondary)",
        border: "1px solid var(--content-border)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        opacity: Math.min(1, pull / 70),
        transition: "transform 0.1s, background 0.15s, color 0.15s",
        pointerEvents: "none",
      }}
    >
      {ready ? "↑ Release to refresh" : "Pull to refresh"}
    </div>
  );
}
