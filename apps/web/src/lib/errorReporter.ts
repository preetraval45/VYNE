"use client";

/**
 * Error reporter — fans out to Sentry when configured, console + custom
 * event otherwise. Call sites don't change between modes.
 *
 * Usage:
 *   reportError(err, { component: "ScheduleMeetingModal", action: "submit" })
 *   installGlobalErrorHandlers()  // call once in providers.tsx
 */

import * as Sentry from "@sentry/nextjs";
import { notifyError } from "./toast";

interface ErrorContext {
  component?: string;
  action?: string;
  [k: string]: unknown;
}

const SENTRY_ENABLED =
  typeof window !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export function reportError(err: unknown, context: ErrorContext = {}) {
  const payload = {
    message:
      typeof err === "string"
        ? err
        : err instanceof Error
          ? err.message
          : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    context,
    when: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.pathname : "",
  };
  // eslint-disable-next-line no-console
  console.error("[vyne:error]", payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vyne:error", { detail: payload }));
  }
  if (SENTRY_ENABLED) {
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: context });
    } else {
      Sentry.captureMessage(payload.message, {
        level: "error",
        extra: { ...context, raw: err },
      });
    }
  }
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    reportError(e.error ?? e.message, { source: "window.onerror" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    reportError(e.reason, { source: "unhandledrejection" });
    void notifyError;
  });
}
