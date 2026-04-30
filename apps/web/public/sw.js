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

// NOTE: previously had a no-op `fetch` listener for the PWA install
// heuristic. Modern Chrome (>=92) no longer requires it — having an
// empty handler triggers a console warning ("Fetch event handler is
// recognized as no-op"), so we omit it. The manifest + start_url alone
// satisfy installability today.
