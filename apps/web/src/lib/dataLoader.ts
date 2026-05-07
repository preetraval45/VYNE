/**
 * Tiny DataLoader — coalesces N synchronous-looking lookups into a
 * single batched fetch on the next tick. Eliminates N+1 SQL queries
 * inside detail-panel renderers without a server-side cache.
 *
 *   const users = createLoader<string, User>(async (ids) =>
 *     db.user.findMany({ where: { id: { in: ids } } }),
 *   );
 *   const [a, b, c] = await Promise.all([
 *     users.load("u1"),
 *     users.load("u2"),
 *     users.load("u3"),
 *   ]);
 *   // → one SQL roundtrip with `WHERE id IN ('u1','u2','u3')`.
 *
 * Loaders are scoped per-request: create at the top of the handler,
 * pass through the call tree, discard on response. Don't share
 * across requests — caching results between different callers leaks
 * authorisation.
 */

export interface DataLoader<K, V> {
  load: (key: K) => Promise<V | undefined>;
  loadMany: (keys: readonly K[]) => Promise<Array<V | undefined>>;
  /** Drop a single entry from the per-tick cache. */
  clear: (key: K) => void;
  /** Drop everything from the per-tick cache. */
  clearAll: () => void;
}

interface CreateLoaderOpts<K, V> {
  /** Map ids → values back. Default: shallow `(v) => v.id`. */
  cacheKeyFn?: (key: K) => string | number;
  /** Max keys per batch. Default 200. */
  maxBatchSize?: number;
}

export function createLoader<K, V>(
  batchFn: (keys: readonly K[]) => Promise<readonly (V | undefined)[]>,
  opts: CreateLoaderOpts<K, V> = {},
): DataLoader<K, V> {
  const cacheKeyFn = opts.cacheKeyFn ?? ((k: K) => String(k));
  const maxBatchSize = opts.maxBatchSize ?? 200;
  const cache = new Map<string | number, Promise<V | undefined>>();

  let queue: Array<{
    key: K;
    cacheKey: string | number;
    resolve: (v: V | undefined) => void;
    reject: (e: Error) => void;
  }> = [];
  let scheduled = false;

  function flush() {
    scheduled = false;
    const batches: typeof queue[] = [];
    while (queue.length > 0) {
      batches.push(queue.splice(0, maxBatchSize));
    }
    queue = [];
    for (const batch of batches) {
      const keys = batch.map((b) => b.key);
      batchFn(keys)
        .then((values) => {
          if (values.length !== keys.length) {
            for (const b of batch) {
              b.reject(
                new Error(
                  `DataLoader batch returned ${values.length} values for ${keys.length} keys.`,
                ),
              );
            }
            return;
          }
          for (let i = 0; i < batch.length; i++) {
            batch[i].resolve(values[i]);
          }
        })
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          for (const b of batch) {
            cache.delete(b.cacheKey);
            b.reject(e);
          }
        });
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  }

  return {
    load(key) {
      const cacheKey = cacheKeyFn(key);
      const existing = cache.get(cacheKey);
      if (existing) return existing;
      const promise = new Promise<V | undefined>((resolve, reject) => {
        queue.push({ key, cacheKey, resolve, reject });
        schedule();
      });
      cache.set(cacheKey, promise);
      return promise;
    },
    loadMany(keys) {
      return Promise.all(keys.map((k) => this.load(k)));
    },
    clear(key) {
      cache.delete(cacheKeyFn(key));
    },
    clearAll() {
      cache.clear();
    },
  };
}
