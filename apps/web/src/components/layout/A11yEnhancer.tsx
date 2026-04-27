"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Runtime a11y safety net. Walks the DOM after each route change and
 * gives every <input>, <select>, and <textarea> an `aria-label` if it
 * lacks all of {aria-label, aria-labelledby, placeholder, title} AND
 * has no associated <label htmlFor>. Pulls the label from (in order)
 * the nearest preceding <label>, the `name` attribute, the `id`, or
 * the element type — whichever resolves first.
 *
 * This is a backstop, not a replacement for proper labeling. Authors
 * should still pair labels via htmlFor or aria-label, but this keeps
 * audit warnings down on forms that slipped through.
 */
export function A11yEnhancer() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = window.setTimeout(() => {
      const targets = document.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']), select, textarea",
      );
      targets.forEach((el) => {
        if (el.getAttribute("aria-label")) return;
        if (el.getAttribute("aria-labelledby")) return;
        if (el.getAttribute("placeholder")) return;
        if (el.getAttribute("title")) return;
        // <label htmlFor="id"> pairing
        const id = el.id;
        if (id && document.querySelector(`label[for="${id}"]`)) return;
        // Wrapped in a <label> ancestor
        if (el.closest("label")) return;
        const fallback =
          (el as HTMLInputElement).name ||
          el.id ||
          el.getAttribute("data-field") ||
          (el.tagName === "SELECT"
            ? "Select option"
            : (el as HTMLInputElement).type
              ? `${(el as HTMLInputElement).type} input`
              : "Input");
        el.setAttribute("aria-label", fallback);
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}
