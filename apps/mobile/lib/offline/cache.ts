/**
 * Offline-first cache layer using AsyncStorage.
 *
 * Each cached entry is stored as:
 *   { data: T, cachedAt: number, ttl: number }
 *
 * Usage:
 *   // Cache-then-network (shows stale data immediately, refreshes in background)
 *   const result = await offlineCache.fetch('inventory', fetchFn, { ttl: 300 })
 *
 *   // Invalidate on mutation
 *   await offlineCache.invalidate('inventory')
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_PREFIX = '@vyne_cache:'

interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttl: number // seconds
}

export interface CacheFetchOptions {
  /** Time-to-live in seconds. Default: 60 */
  ttl?: number
  /**
   * If true, return stale data immediately and refresh in background.
   * If false, wait for fresh data when stale. Default: true
   */
  staleWhileRevalidate?: boolean
}

function cacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

async function get<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key))
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    return null
  }
}

async function set<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now(), ttl }
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.ttl * 1000
}

/**
 * Cache-then-network fetch.
 * - Returns cached data immediately if fresh.
 * - If staleWhileRevalidate=true (default), returns stale data and refreshes in background.
 * - If no cache exists, awaits the network request.
 */
async function fetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheFetchOptions = {},
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const { ttl = 60, staleWhileRevalidate = true } = options
  const entry = await get<T>(key)

  // Fresh cache hit
  if (entry && !isStale(entry)) {
    return { data: entry.data, fromCache: true, stale: false }
  }

  // Stale-while-revalidate: return stale immediately + refresh async
  if (entry && staleWhileRevalidate) {
    fetcher()
      .then((fresh) => set(key, fresh, ttl))
      .catch(() => {/* network unavailable — stale data remains */})
    return { data: entry.data, fromCache: true, stale: true }
  }

  // No cache or must revalidate synchronously
  try {
    const fresh = await fetcher()
    await set(key, fresh, ttl)
    return { data: fresh, fromCache: false, stale: false }
  } catch (err) {
    // Network failed — return stale if we have it
    if (entry) {
      return { data: entry.data, fromCache: true, stale: true }
    }
    throw err
  }
}

/** Invalidate a single cache key */
async function invalidate(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(key))
  } catch {
    // ignore
  }
}

/** Invalidate all keys matching a prefix */
async function invalidatePrefix(prefix: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const matching = allKeys.filter(
      (k) => k.startsWith(`${CACHE_PREFIX}${prefix}`),
    )
    if (matching.length) await AsyncStorage.multiRemove(matching)
  } catch {
    // ignore
  }
}

/** Clear entire cache */
async function clearAll(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX))
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys)
  } catch {
    // ignore
  }
}

export const offlineCache = { fetch, get, set, invalidate, invalidatePrefix, clearAll }

// ─── Offline sync queue ─────────────────────────────────────────
// Queues mutations made while offline and replays them when connectivity returns.

const QUEUE_KEY = '@vyne_sync_queue'

interface SyncQueueItem {
  id: string
  timestamp: number
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  body?: unknown
}

async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    const queue: SyncQueueItem[] = raw ? JSON.parse(raw) : []
    queue.push({
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    })
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

async function drainSyncQueue(
  executor: (item: SyncQueueItem) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0
  let failed = 0
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    if (!raw) return { succeeded, failed }
    const queue: SyncQueueItem[] = JSON.parse(raw)
    const remaining: SyncQueueItem[] = []
    for (const item of queue) {
      try {
        await executor(item)
        succeeded++
      } catch {
        remaining.push(item)
        failed++
      }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  } catch {
    // ignore
  }
  return { succeeded, failed }
}

async function getSyncQueueLength(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncQueueItem[]).length : 0
  } catch {
    return 0
  }
}

export const syncQueue = { enqueue: enqueueSync, drain: drainSyncQueue, length: getSyncQueueLength }
export type { SyncQueueItem }
