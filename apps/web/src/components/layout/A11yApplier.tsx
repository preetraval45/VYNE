"use client";

import { useEffect } from "react";
import { useA11y } from "@/lib/stores/a11y";

/**
 * A11yApplier — applies the prefs from `useA11y` to `<html>` so the
 * rest of the app reacts via CSS selectors and `dir`.
 *
 *   data-contrast="high"
 *   data-motion="reduce"
 *   data-link-style="underline"
 *   --text-scale: 1 | 1.25 | 1.5
 *   dir="ltr" | "rtl"
 *
 * Mounts once in the dashboard layout. No UI; side-effects only.
 */
export function A11yApplier() {
  const prefs = useA11y();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (prefs.highContrast) root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");

    if (prefs.reduceMotion) root.setAttribute("data-motion", "reduce");
    else root.removeAttribute("data-motion");

    if (prefs.underlineLinks)
      root.setAttribute("data-link-style", "underline");
    else root.removeAttribute("data-link-style");

    root.style.setProperty("--text-scale", String(prefs.textScale));

    if (prefs.direction === "rtl") {
      root.setAttribute("dir", "rtl");
    } else if (prefs.direction === "ltr") {
      root.setAttribute("dir", "ltr");
    } else {
      // auto — let the browser decide based on lang
      root.removeAttribute("dir");
    }
  }, [prefs]);

  return null;
}
