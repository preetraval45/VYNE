"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight per-route scroll restoration. Stores the scrollTop of
 * `main#main-content` in sessionStorage keyed by the previous path,
 * then restores it when the user navigates back. Avoids the default
 * Next.js behaviour where back-nav jumps to the top, which is jarring
 * on long lists like /crm or /projects.
 */
export function ScrollRestoration() {
  const pathname = usePathname() ?? "";
  const prevPath = useRef<string>(pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const main = document.querySelector<HTMLElement>("main#main-content");
    if (!main) return;

    // Save the previous path's scroll position before the new path takes over.
    try {
      sessionStorage.setItem(`vyne-scroll:${prevPath.current}`, String(main.scrollTop));
    } catch {
      // ignore (privacy mode)
    }

    // Restore the scroll for the new path if we have one.
    const saved = (() => {
      try {
        return sessionStorage.getItem(`vyne-scroll:${pathname}`);
      } catch {
        return null;
      }
    })();
    if (saved != null) {
      const target = Number(saved);
      // Defer to next paint so the new content has rendered.
      requestAnimationFrame(() => {
        main.scrollTop = target;
      });
    } else {
      main.scrollTop = 0;
    }

    prevPath.current = pathname;
  }, [pathname]);

  return null;
}
