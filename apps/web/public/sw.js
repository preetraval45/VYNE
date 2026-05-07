// VYNE — service worker.
// Handles three layers:
//   1. PWA installability (install + activate hooks).
//   2. Web push notifications (Phase 13.3).
//   3. Offline shell + static asset cache (Phase 18.7).
//
// Strategy:
//   - Install: precache the offline shell ("/offline.html") so a hard
//     network failure still gets a friendly page instead of Chrome's
//     dino. Cache /icon-192.png + /manifest.webmanifest so the home
//     screen icon survives offline.
//   - Activate: drop any cache whose name doesn't match the current
//     SW_VERSION so old assets don't pile up across releases.
//   - Fetch: stale-while-revalidate for /_next/static/* (immutable
//     hashed assets — safe to serve from cache instantly while the
//     network refreshes the cache for next time). Network-first with
//     offline fallback for navigations. Pass-through for everything
//     else so API calls aren't cached.

const SW_VERSION = "vyne-v3";
const STATIC_CACHE = `vyne-static-${SW_VERSION}`;
const PAGE_CACHE = `vyne-pages-${SW_VERSION}`;
const PRECACHE_URLS = [
  "/offline.html",
  "/icon-192.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  // Activate immediately so subsequent visits get the latest worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // /offline.html may not exist in older builds — non-fatal.
      }),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Drop caches that aren't part of this version.
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith("vyne-") &&
                k !== STATIC_CACHE &&
                k !== PAGE_CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      ),
    ]),
  );
});

// Stale-while-revalidate for hashed Next.js static assets, network-
// first with offline fallback for navigations, pass-through for the
// rest.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle same-origin traffic — third-party CDNs handle their own caching.
  if (url.origin !== self.location.origin) return;

  // Hashed Next.js static — versioned by content hash, so SWR is safe.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Document navigations: network-first → fall back to cached page → fall back to offline shell.
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await networkPromise) || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return (
      offline ||
      new Response(
        "<!doctype html><meta charset=utf-8><title>Offline</title><h1>You're offline</h1><p>Reconnect and refresh to continue.</p>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      )
    );
  }
}

// NOTE: previously had a no-op `fetch` listener for the PWA install
// heuristic. Modern Chrome (>=92) no longer requires it — having an
// empty handler triggers a console warning ("Fetch event handler is
// recognized as no-op"), so we omit it. The manifest + start_url alone
// satisfy installability today.

// 13.3 — Web Push handler. Server posts JSON in the form:
//   { title, body, url?, tag?, icon? }
// Falls back to safe defaults when fields are missing so a malformed
// payload still surfaces something the user can act on.
self.addEventListener("push", (event) => {
  let payload = { title: "VYNE", body: "You have a new notification" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      try {
        payload.body = event.data.text();
      } catch {
        // ignore
      }
    }
  }
  const options = {
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/home" },
    renotify: Boolean(payload.tag),
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Click handler — focus an existing tab on the right URL or open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
        return null;
      }),
  );
});
