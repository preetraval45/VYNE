// Sentry server (Node runtime) config. Captures unhandled rejections
// in API routes + getServerSideProps. SENTRY_DSN (server) and
// NEXT_PUBLIC_SENTRY_DSN (client) are typically the same value.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    environment:
      process.env.SENTRY_ENV ??
      process.env.NEXT_PUBLIC_SENTRY_ENV ??
      "production",
    enabled: process.env.NODE_ENV === "production",
    release:
      process.env.SENTRY_RELEASE ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      undefined,
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
        if (event.extra && typeof event.extra === "object") {
          const ex = event.extra as Record<string, unknown>;
          for (const key of Object.keys(ex)) {
            if (/token|secret|key|password|otp|mfa|seed|csrf/i.test(key)) {
              ex[key] = "[redacted]";
            }
          }
        }
      } catch {
        // ignore
      }
      return event;
    },
    denyUrls: [/\/api\/auth\/login/, /\/api\/auth\/signup/],
  });
}
