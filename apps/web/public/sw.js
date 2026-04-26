// VYNE — minimal service worker.
// Required for the PWA install prompt to fire on Chromium browsers.
// Stays out of the way (no caching, no background fetch) so the
// always-fresh server experience is unchanged. We can layer in
// offline shell caching later without breaking installability.

const SW_VERSION = "vyne-v1";

self.addEventListener("install", (event) => {
  // Activate immediately so subsequent visits get the latest worker.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pure passthrough. The presence of the fetch listener is enough
  // for Chrome's installability heuristic.
  // No-op intentionally.
});
