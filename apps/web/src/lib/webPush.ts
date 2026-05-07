"use client";

/**
 * Web Push subscription helper.
 *
 * Flow:
 *   1. ensurePushSubscription() registers /sw.js (if not already),
 *      requests Notification permission, calls
 *      pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY }),
 *      and POSTs the resulting PushSubscription to /api/notifications/subscribe.
 *   2. The server stores the subscription and uses web-push (or
 *      OneSignal / Firebase) to fan out push messages signed with the
 *      paired VAPID private key.
 *
 * Configuration:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY env var holds the urlsafe-base64
 *     VAPID public key. When missing, every helper short-circuits to
 *     a no-op so demo deployments don't crash.
 *
 * This file is browser-only — never import it server-side.
 */

const SUBSCRIBE_ENDPOINT = "/api/notifications/subscribe";
const UNSUBSCRIBE_ENDPOINT = "/api/notifications/unsubscribe";

export function isWebPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Idempotent: registers the SW (if needed), requests permission (if
 * "default"), subscribes, and POSTs the subscription to the server.
 * Returns the active PushSubscription on success, null on any
 * failure / unsupported / blocked path.
 */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return null;
    } else if (Notification.permission !== "granted") {
      return null;
    }

    const existing = await reg.pushManager.getSubscription();
    const keyBytes = urlBase64ToUint8Array(vapidKey);
    // PushManager#subscribe types want BufferSource on a real ArrayBuffer;
    // copy the underlying bytes into a fresh ArrayBuffer to satisfy the
    // signature on TS lib.dom.d.ts versions that exclude SharedArrayBuffer.
    const keyBuffer = new Uint8Array(keyBytes).buffer;
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBuffer,
      }));

    // Tell the server. Server can dedupe by endpoint URL.
    await fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    }).catch(() => {
      /* server may not be configured yet — keep subscription locally */
    });

    return sub;
  } catch {
    return null;
  }
}

/** Tear down the existing subscription on this device. */
export async function disablePushSubscription(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    await fetch(UNSUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {
      /* fall through */
    });
    return await sub.unsubscribe();
  } catch {
    return false;
  }
}
