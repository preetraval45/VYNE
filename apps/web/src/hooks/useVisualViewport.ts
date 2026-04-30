"use client";

import { useEffect } from "react";

/**
 * Tracks the visualViewport (window minus virtual keyboard) and writes
 * the keyboard inset into a CSS custom property `--keyboard-h` on
 * <html>. Components can use this to keep their composer pinned above
 * the on-screen keyboard:
 *
 *   bottom: calc(env(safe-area-inset-bottom) + var(--keyboard-h, 0px))
 *
 * iOS Safari is the worst offender — without this the message composer
 * jumps up but the message list does not scroll, hiding the latest
 * message under the keyboard.
 */
export function useVisualViewport() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    function update() {
      if (!vv) return;
      const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard-h", `${keyboardInset}px`);
    }
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.setProperty("--keyboard-h", "0px");
    };
  }, []);
}
