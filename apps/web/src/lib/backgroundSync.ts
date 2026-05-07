"use client";

/**
 * Background sync registration helper (25.9).
 *
 *   await registerBackgroundSync("offline-mutations");
 *
 * Once the tag is registered, the service worker fires a `sync` event
 * the next time the device comes online — even if the tab is closed.
 * The SW handler reads the offline IndexedDB queue and replays each
 * mutation, surfacing conflicts via the existing OfflineConflictResolver.
 *
 * Falls back to a no-op when the browser doesn't expose
 * `ServiceWorkerRegistration.sync` (Safari today). Callers should
 * still poll the queue on `online` events as a safety net.
 */

const TAG_PREFIX = "vyne-sync-";

interface SyncManager {
  register: (tag: string) => Promise<void>;
  getTags: () => Promise<string[]>;
}

interface RegistrationWithSync extends ServiceWorkerRegistration {
  sync?: SyncManager;
}

export async function registerBackgroundSync(
  name: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "ssr" };
  }
  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "no-service-worker" };
  }
  try {
    const reg = (await navigator.serviceWorker.ready) as RegistrationWithSync;
    if (!reg.sync) return { ok: false, reason: "no-sync" };
    await reg.sync.register(`${TAG_PREFIX}${name}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "register failed",
    };
  }
}

export async function listBackgroundSyncTags(): Promise<string[]> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return [];
  }
  try {
    const reg = (await navigator.serviceWorker.ready) as RegistrationWithSync;
    if (!reg.sync) return [];
    const tags = await reg.sync.getTags();
    return tags.filter((t) => t.startsWith(TAG_PREFIX)).map((t) => t.slice(TAG_PREFIX.length));
  } catch {
    return [];
  }
}

/** Test helper: are we in a UA that exposes Background Sync? */
export function backgroundSyncSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  return "SyncManager" in window;
}
