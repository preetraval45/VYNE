"use client";

/**
 * offlineQueue — IndexedDB-backed FIFO queue for outbound mutations.
 *
 * Pages don't talk to this directly. The fetch interceptor (or any
 * mutation helper) calls `enqueue()` when the browser is offline; on
 * `window.online` the queue replays each entry in order.
 *
 *   await offlineQueue.enqueue({
 *     url: "/api/deals/123",
 *     method: "PATCH",
 *     body: JSON.stringify(patch),
 *     headers: { "Content-Type": "application/json" },
 *   });
 *
 * Why IndexedDB and not localStorage:
 *   - Survives tab close + browser crash.
 *   - 100s of MB of quota vs 5 MB.
 *   - Async API doesn't block the main thread on writes.
 *
 * The schema is intentionally tiny: a single `mutations` store keyed
 * on auto-incrementing `id`. Each entry has the request envelope plus
 * a wall-clock timestamp so we can age out anything stuck > 24h.
 */

const DB_NAME = "vyne-offline";
const DB_VERSION = 1;
const STORE = "mutations";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface QueuedMutation {
  id?: number;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  enqueuedAt: number;
}

let _dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window))
    return Promise.resolve(null);
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return _dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T | null = null;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r as T;
      })
      .catch(() => {
        result = null;
      });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => resolve(null);
    tx.onabort = () => resolve(null);
  });
}

export const offlineQueue = {
  async enqueue(mut: Omit<QueuedMutation, "id" | "enqueuedAt">): Promise<void> {
    await withStore("readwrite", (store) => {
      store.add({
        ...mut,
        enqueuedAt: Date.now(),
      } as QueuedMutation);
    });
    notifyChange();
  },

  async size(): Promise<number> {
    const db = await openDb();
    if (!db) return 0;
    return new Promise<number>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => resolve(0);
    });
  },

  async list(): Promise<QueuedMutation[]> {
    const db = await openDb();
    if (!db) return [];
    return new Promise<QueuedMutation[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve((req.result as QueuedMutation[] | undefined) ?? []);
      req.onerror = () => resolve([]);
    });
  },

  async clear(): Promise<void> {
    await withStore("readwrite", (store) => {
      store.clear();
    });
    notifyChange();
  },

  /** Replay every queued mutation in FIFO order. Successful entries are
   *  removed; failures stay queued so a later retry can drain them. Stale
   *  entries (> 24h) are dropped on any flush so a corrupt mutation
   *  doesn't block the queue forever. */
  async flush(): Promise<{ ok: number; failed: number; stale: number }> {
    const items = await offlineQueue.list();
    const cutoff = Date.now() - MAX_AGE_MS;
    let ok = 0;
    let failed = 0;
    let stale = 0;

    for (const item of items) {
      if (!item.id) continue;
      if (item.enqueuedAt < cutoff) {
        await withStore("readwrite", (store) => store.delete(item.id!));
        stale++;
        continue;
      }
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await withStore("readwrite", (store) => store.delete(item.id!));
        ok++;
      } catch {
        failed++;
        // Stop on first failure: most likely we're offline again or the
        // server is down. Continuing would just rack up failures.
        break;
      }
    }

    notifyChange();
    return { ok, failed, stale };
  },
};

const CHANGE_EVT = "vyne:offline-queue-change";
function notifyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVT));
}

/** Subscribe to queue changes (size grew/shrank/cleared). The callback
 *  receives no args — call `offlineQueue.size()` to read the new value. */
export function onOfflineQueueChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVT, handler);
  return () => window.removeEventListener(CHANGE_EVT, handler);
}
