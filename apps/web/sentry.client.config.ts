// Sentry client (browser) config. Loads only when SENTRY_DSN is set
// so the bundle stays clean for self-hosters who don't want telemetry.
//
// Free tier: 5K errors/mo, 10K performance events, 50 replays. We
// keep tracesSampleRate low (0.1) to stay under the ceiling on real
// traffic. Bump locally to 1.0 when debugging.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "production",
    enabled: process.env.NODE_ENV === "production",
    // PH-B: tag each deploy so regressions are easy to bisect by commit.
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      undefined,
    // PH-B: PII scrub. Drop session cookies, Authorization, and any
    // body field whose key looks like a secret. The default sanitiser
    // doesn't cover form-style POST bodies for our routes.
    beforeSend(event) {
      try {
        if (event.request?.headers) {
          const h = event.request.headers as Record<string, unknown>;
          delete h.cookie;
          delete h.Cookie;
          delete h.authorization;
          delete h.Authorization;
        }
        if (event.request?.data && typeof event.request.data === "object") {
          const d = event.request.data as Record<string, unknown>;
          for (const key of Object.keys(d)) {
            if (/token|secret|key|password|otp|mfa|seed|csrf/i.test(key)) {
              d[key] = "[redacted]";
            }
          }
        }
      } catch {
        // never break error reporting by trying too hard to scrub.
      }
      return event;
    },
    // Auth paths echo credentials in their request bodies — never let
    // those events leave the browser.
    denyUrls: [/\/api\/auth\/login/, /\/api\/auth\/signup/],
    ignoreErrors: [
      "Hydration failed because",
      "Text content does not match server-rendered HTML",
      /chrome-extension:/,
      /moz-extension:/,
    ],
  });
}
