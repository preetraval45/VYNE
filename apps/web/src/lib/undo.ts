"use client";

import toast from "react-hot-toast";
import { haptics } from "./haptics";

/**
 * Run a delete (or any reversible mutation) and immediately show a 5s
 * toast with an Undo button. The mutation runs synchronously; the
 * `restore` callback is what fires if the user taps Undo. Pattern:
 *
 *   undoableDelete({
 *     label: "Deleted deal — Acme",
 *     mutate: () => store.deleteDeal(id),
 *     restore: () => store.addDeal(snapshot),
 *   });
 */
export function undoableDelete(opts: {
  label: string;
  mutate: () => void;
  restore: () => void;
  durationMs?: number;
}): void {
  const { label, mutate, restore, durationMs = 5000 } = opts;
  mutate();
  haptics.warn();
  toast(
    (t) => {
      const handleUndo = () => {
        restore();
        haptics.bump();
        toast.dismiss(t.id);
        toast.success("Restored", { duration: 1800 });
      };
      // react-hot-toast accepts a JSX element; this file is .ts so
      // build the node imperatively via React.createElement at the
      // caller. Here we keep it as a string + Undo button via the
      // toast options API.
      return label + "  ·  tap to undo";
    },
    {
      duration: durationMs,
      style: { cursor: "pointer" },
    },
  );
  // Poor-man's Undo: clicking anywhere on the toast triggers restore.
  // We attach a one-shot listener to the document because the toast
  // node is dynamic and doesn't expose a click prop in the .ts API.
  // See undoableDeleteRich() for a JSX version with a real Undo button.
  if (typeof window === "undefined") return;
  const id = `vyne-undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let used = false;
  const handler = (e: MouseEvent) => {
    if (used) return;
    const el = e.target as HTMLElement | null;
    if (!el) return;
    const toastEl = el.closest('[role="status"], .go2072408551, [class*="toast"]');
    if (toastEl) {
      used = true;
      restore();
      haptics.bump();
      toast.dismiss();
      toast.success("Restored", { duration: 1800 });
      window.removeEventListener("click", handler, true);
    }
  };
  window.addEventListener("click", handler, true);
  setTimeout(() => {
    window.removeEventListener("click", handler, true);
  }, durationMs + 200);
  void id;
}
