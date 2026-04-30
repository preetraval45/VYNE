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
        blockAllMedia: true,
      }),
    ],
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "production",
    enabled: process.env.NODE_ENV === "production",
  });
}
