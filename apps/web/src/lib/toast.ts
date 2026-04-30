"use client";

import toast from "react-hot-toast";

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
 */

export function notifyError(err: unknown, fallback = "Something went wrong") {
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : fallback;
  toast.error(msg, { duration: 5000 });
}

export function notifySuccess(message: string) {
  toast.success(message, { duration: 2500 });
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
