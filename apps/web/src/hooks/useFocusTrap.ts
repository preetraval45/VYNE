"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Trap keyboard focus inside `containerRef` while `active` is true. Closes
 * on `Escape` via `onEscape` if provided. On mount, focuses the first
 * tabbable child (or the container itself if none). On unmount, restores
 * focus to whatever element was active before the trap engaged.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, isOpen, onClose);
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    (first ?? container).focus({ preventScroll: true });

    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;

      const list = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, [active, containerRef, onEscape]);
}
