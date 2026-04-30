// Sentry server (Node runtime) config. Captures unhandled rejections
// in API routes + getServerSideProps. SENTRY_DSN (server) and
// NEXT_PUBLIC_SENTRY_DSN (client) are typically the same value.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    environment: process.env.SENTRY_ENV ?? process.env.NEXT_PUBLIC_SENTRY_ENV ?? "production",
    enabled: process.env.NODE_ENV === "production",
  });
}
