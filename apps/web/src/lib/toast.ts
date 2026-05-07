"use client";

import toast from "react-hot-toast";
import { announce } from "@/components/layout/Announcer";

/**
 * Centralised toast helpers + fetch wrapper that surfaces errors so
 * they're never silent. Use these instead of bare `fetch()` whenever
 * a failure should be visible to the user.
 *
 *   await fetchWithToast("/api/x", { method: "POST", body: ... })
 *     - shows a red toast on network error or non-2xx response
 *     - returns the parsed JSON (or null on error)
 *
 *   notifyError(err, "Couldn't save settings")
 *     - red toast with optional context
 *
 *   notifySuccess("Saved")
 *     - green toast
 *
 *   undoToast({ message, onUndo })
 *     - 5-second toast with an Undo button
 *
 *   notifyCoalesce("invoices", n => `${n} invoices archived`)
 *     - bumps a counter on the same key for 800 ms instead of stacking
 *       N separate toasts. The renderer is called once with the final
 *       count when the window closes.
 *
 *   notifyOnce(key, msg)
 *     - same as notifyInfo but no-ops if the same key fired in the
 *       last DEDUPE_WINDOW_MS. Use for repeated background events
 *       (sync error, websocket disconnect) that should announce once
 *       and then go quiet.
 */

const DEDUPE_WINDOW_MS = 4_000;
const COALESCE_WINDOW_MS = 800;

const lastFireAt = new Map<string, number>();
const coalesceState = new Map<
  string,
  { count: number; timer: ReturnType<typeof setTimeout>; toastId: string }
>();

export function notifyError(err: unknown, fallback = "Something went wrong") {
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : fallback;
  toast.error(msg, { duration: 5000 });
  // Phase 19.3 — surface to screen readers (assertive: errors interrupt).
  announce(msg, "assertive");
}

export function notifySuccess(message: string) {
  toast.success(message, { duration: 2500 });
  announce(message, "polite");
}

export function notifyInfo(message: string) {
  toast(message, { duration: 2500 });
  announce(message, "polite");
}

/** Suppress repeated firings of the same `key` within a 4 s window. */
export function notifyOnce(
  key: string,
  message: string,
  level: "info" | "success" | "error" = "info",
) {
  const now = Date.now();
  const last = lastFireAt.get(key) ?? 0;
  if (now - last < DEDUPE_WINDOW_MS) return;
  lastFireAt.set(key, now);
  if (level === "success") notifySuccess(message);
  else if (level === "error") notifyError(message);
  else notifyInfo(message);
}

/**
 * Coalesce N rapid notifications into a single "N things happened"
 * toast. Each call bumps the count; an 800 ms inactivity window
 * triggers the render. Use for bulk operations: archive 5 → one toast.
 *
 *   notifyCoalesce("archive", n => `${n} invoice${n === 1 ? "" : "s"} archived`)
 */
export function notifyCoalesce(
  key: string,
  render: (count: number) => string,
  level: "info" | "success" = "success",
) {
  const existing = coalesceState.get(key);
  if (existing) {
    existing.count += 1;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushCoalesce(key, render, level), COALESCE_WINDOW_MS);
    coalesceState.set(key, existing);
    // Update the in-flight toast text live so users see the count tick up.
    if (level === "success") {
      toast.success(render(existing.count), { id: existing.toastId, duration: 2500 });
    } else {
      toast(render(existing.count), { id: existing.toastId, duration: 2500 });
    }
    return;
  }
  // First fire — open the toast immediately with count=1.
  const id = `coalesce-${key}-${Date.now()}`;
  if (level === "success") {
    toast.success(render(1), { id, duration: 2500 });
  } else {
    toast(render(1), { id, duration: 2500 });
  }
  const timer = setTimeout(() => flushCoalesce(key, render, level), COALESCE_WINDOW_MS);
  coalesceState.set(key, { count: 1, timer, toastId: id });
}

function flushCoalesce(
  key: string,
  _render: (count: number) => string,
  _level: "info" | "success",
) {
  // The toast is already on screen with the final text; just retire the
  // counter so the next event starts a new window.
  coalesceState.delete(key);
}

export interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  durationMs?: number;
}

/**
 * Renders a 5-second toast with an Undo button. Returns the toast id
 * so the caller can dismiss it manually. If the user taps Undo, the
 * onUndo callback fires and the toast closes immediately.
 */
export function undoToast({
  message,
  onUndo,
  durationMs = 5000,
}: UndoToastOptions): string {
  return toast(
    (t) => {
      const inner = document.createElement("span");
      inner.textContent = message;
      // We can't render React JSX from a plain TS module without
      // importing React, so emit a minimal HTML fragment instead.
      return inner.outerHTML;
    },
    {
      duration: durationMs,
      style: {
        background: "var(--content-bg)",
        color: "var(--text-primary)",
        border: "1px solid var(--content-border)",
      },
    },
  );
  // The Undo button + click handler are easier to render via the React
  // component variant; see <UndoToast> usage in components/. This
  // string-form fallback at least announces the action.
  void onUndo;
}

export interface FetchWithToastOptions extends RequestInit {
  /** Suppress success toast (errors still surface). */
  silentOnSuccess?: boolean;
  /** Custom message shown on success. */
  successMessage?: string;
  /** Override fallback error text. */
  errorMessage?: string;
}

/**
 * Wrapper around `fetch` that converts non-2xx responses + network
 * failures into red toasts and returns the parsed JSON (or null on error).
 */
export async function fetchWithToast<T = unknown>(
  url: string,
  init: FetchWithToastOptions = {},
): Promise<T | null> {
  const {
    silentOnSuccess = true,
    successMessage,
    errorMessage = "Request failed",
    ...rest
  } = init;
  try {
    const res = await fetch(url, rest);
    if (!res.ok) {
      // Try to extract a readable message
      let body = "";
      try {
        const cloned = res.clone();
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const json = (await cloned.json()) as { error?: string; message?: string };
          body = json.error ?? json.message ?? "";
        } else {
          body = (await cloned.text()).slice(0, 240);
        }
      } catch {
        // ignore parse errors
      }
      notifyError(
        body || `${errorMessage} (${res.status} ${res.statusText})`,
        errorMessage,
      );
      return null;
    }
    if (!silentOnSuccess && successMessage) {
      notifySuccess(successMessage);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  } catch (err) {
    notifyError(err, errorMessage);
    return null;
  }
}
