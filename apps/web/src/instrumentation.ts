// Next.js instrumentation hook — runs once per runtime (node / edge)
// to wire Sentry into request lifecycles. Without this Sentry won't
// catch errors thrown inside Server Components / Route Handlers.

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forward Next.js request errors to Sentry. Newer SDKs export
// onRequestError directly; older ones expose captureRequestError.
const captureFn =
  (Sentry as unknown as { captureRequestError?: (...a: unknown[]) => void })
    .captureRequestError ?? (() => {});

export const onRequestError = captureFn;
