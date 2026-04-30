"use client";

import { useEffect, useState } from "react";

/**
 * j/k row navigation + `e` to open + `x` to multi-select for any list
 * page. Returns the focused index and a multi-selection set, plus a
 * setter so the page can highlight rows. Pages opt-in by passing the
 * row count + callbacks. Disabled when typing in inputs.
 */
export function useListKeyboardNav(opts: {
  count: number;
  onOpen?: (index: number) => void;
  onDelete?: (index: number) => void;
  enabled?: boolean;
}) {
  const { count, onOpen, onDelete, enabled = true } = opts;
  const [focusIdx, setFocusIdx] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled || count === 0) return;
    function isTyping(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        // Cmd+A — select all
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          setSelected(new Set(Array.from({ length: count }, (_, i) => i)));
        }
        return;
      }
      if (e.key === "j") {
        e.preventDefault();
        setFocusIdx((i) => Math.min(count - 1, i + 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "g") {
        setFocusIdx(0);
      } else if (e.key === "G") {
        setFocusIdx(count - 1);
      } else if (e.key === "e" || e.key === "Enter") {
        if (onOpen) {
          e.preventDefault();
          onOpen(focusIdx);
        }
      } else if (e.key === "x") {
        e.preventDefault();
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(focusIdx)) next.delete(focusIdx);
          else next.add(focusIdx);
          return next;
        });
      } else if (e.key === "Escape") {
        if (selected.size) setSelected(new Set());
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (onDelete) {
          e.preventDefault();
          onDelete(focusIdx);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, enabled, focusIdx, onOpen, onDelete, selected.size]);

  return { focusIdx, setFocusIdx, selected, setSelected };
}
