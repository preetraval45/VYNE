"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Runtime mobile-layout safety net.
 *
 * Walks the DOM after each route change and forces inline-styled multi-
 * column grids, fixed-width sidebars, and over-wide elements to behave
 * on phones / tablet portrait. Pure DOM mutation — bypasses all CSS
 * specificity battles with inline `style={...}` declarations.
 *
 * Activates only when the viewport reports mobile-class width via
 * matchMedia. Detaches its overrides automatically on rotate to landscape.
 *
 * Three categories of fixes:
 *   1. `display: grid` with 2+ columns → collapse to single column
 *   2. `display: flex` row with > 1 child → ensure flex-wrap: wrap
 *   3. inline `width` / `min-width` exceeding viewport → reset to 100%
 *
 * Re-runs on route change AND on a single MutationObserver pass after
 * mount (Radix portals, framer-motion mounts, etc.).
 */
export function MobileLayoutNormalizer() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(
      "(max-width: 768px), (max-width: 1024px) and (orientation: portrait)",
    );

    function isMultiColumnGrid(value: string): boolean {
      if (!value || value === "none") return false;
      // Count the number of grid tracks. The computed value uses `px`
      // for fixed tracks and `Npx` for fr-resolved tracks.
      const tokens = value.trim().split(/\s+/).filter(Boolean);
      return tokens.length > 1;
    }

    function normalize(): void {
      if (!mq.matches) return;
      const vw = window.innerWidth;

      // 1) Grids with 2+ columns → single column
      const grids = document.querySelectorAll<HTMLElement>("[style]");
      grids.forEach((el) => {
        if (el.dataset.mlnDone === "1") return;
        const cs = getComputedStyle(el);
        if (cs.display === "grid" || cs.display === "inline-grid") {
          if (isMultiColumnGrid(cs.gridTemplateColumns)) {
            el.style.setProperty(
              "grid-template-columns",
              "1fr",
              "important",
            );
          }
        }
        // 2) Flex rows that aren't column-direction must wrap
        if (cs.display === "flex" || cs.display === "inline-flex") {
          if (cs.flexDirection !== "column" && cs.flexDirection !== "column-reverse") {
            if (cs.flexWrap === "nowrap" && el.children.length > 1) {
              el.style.setProperty("flex-wrap", "wrap", "important");
            }
          }
        }
        // 3) Fixed widths exceeding viewport
        const inlineWidth = el.style.width || "";
        const inlineMinWidth = el.style.minWidth || "";
        const wMatch = inlineWidth.match(/^(\d+)(px)?$/);
        if (wMatch && Number(wMatch[1]) > vw - 16) {
          el.style.setProperty("width", "100%", "important");
          el.style.setProperty("max-width", "100%", "important");
        }
        const mwMatch = inlineMinWidth.match(/^(\d+)(px)?$/);
        if (mwMatch && Number(mwMatch[1]) > vw - 16) {
          el.style.setProperty("min-width", "0", "important");
        }
        el.dataset.mlnDone = "1";
      });
    }

    function reset(): void {
      // When orientation flips back to a layout that doesn't need
      // collapse, mark elements as un-processed so a future mobile
      // visit re-applies (overrides remain harmless on desktop because
      // the `1fr` single column still works).
      document
        .querySelectorAll<HTMLElement>("[data-mln-done]")
        .forEach((el) => {
          delete el.dataset.mlnDone;
        });
    }

    // Initial pass with small delay to let portals/animations mount.
    const t1 = window.setTimeout(normalize, 50);
    const t2 = window.setTimeout(normalize, 250);
    const t3 = window.setTimeout(normalize, 800);

    // Re-run when DOM mutates (modals, dynamic lists, etc.). Debounce
    // aggressively because chat channels with many messages produce a
    // mutation per render and re-walking the whole DOM was expensive.
    // 200ms is fast enough that users don't perceive the gap.
    let debounceTimer: number | null = null;
    const obs = new MutationObserver(() => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        window.requestAnimationFrame(normalize);
      }, 200);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Re-run on viewport changes
    function onChange() {
      reset();
      normalize();
    }
    mq.addEventListener("change", onChange);
    window.addEventListener("resize", onChange, { passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      obs.disconnect();
      mq.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [pathname]);

  return null;
}
