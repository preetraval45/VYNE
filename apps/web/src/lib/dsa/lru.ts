/* ═══════════════════════════════════════════════════════════════
 * Size-bounded LRU cache.
 *
 * React's `useMemo` caches one value per render — perfect when the
 * dependency array changes. Useless for *parameterized* derivations
 * like "give me the aggregations for project X" where X varies but
 * the function is the same.
 *
 * This LRU caps memory while keeping recently-used results hot.
 * Implementation: `Map` preserves insertion order in ES2015+, so we
 * delete + re-set on access to mark "recently used". Eviction is
 * `map.keys().next().value` — the oldest entry. All operations are
 * **O(1)** amortized.
 *
 * Use:
 *   const cache = new LRU<string, AggregateResult>(200);
 *   const v = cache.get(key) ?? cache.set(key, compute(key));
 *
 * Or composed with a memoize helper:
 *   const project = memoize(getProjectAggregate, 200);
 *   project("proj-7")   // computed once, cached for next 200 keys
 * ═══════════════════════════════════════════════════════════════ */

export class LRU<K, V> {
  private readonly max: number;
  private readonly store = new Map<K, V>();

  constructor(maxEntries = 100) {
    if (maxEntries < 1) {
      throw new Error("LRU maxEntries must be >= 1");
    }
    this.max = maxEntries;
  }

  get(key: K): V | undefined {
    const v = this.store.get(key);
    if (v === undefined) return undefined;
    // Refresh recency: re-insert at the end.
    this.store.delete(key);
    this.store.set(key, v);
    return v;
  }

  set(key: K, value: V): V {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.max) {
      // Evict the least-recently-used entry — the first one.
      const oldest = this.store.keys().next().value as K | undefined;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.store.has(key);
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Memoize a single-arg pure function with an LRU. Subsequent calls
 * with the same argument are O(1) hash-lookups; new arguments compute
 * once and evict the oldest entry when the cache fills.
 *
 * Best for derivations where the input is a primitive id (string,
 * number) or a stable object reference. Don't pass freshly-constructed
 * objects — they'll never hit the cache.
 */
export function memoize<A, R>(
  fn: (arg: A) => R,
  maxEntries = 100,
): (arg: A) => R {
  const cache = new LRU<A, R>(maxEntries);
  return (arg: A): R => {
    const cached = cache.get(arg);
    if (cached !== undefined) return cached;
    const value = fn(arg);
    cache.set(arg, value);
    return value;
  };
}

/**
 * Memoize a multi-arg pure function. Args are joined with a `|`
 * separator into a single string key, so primitive args only.
 */
export function memoizeMany<A extends (string | number | boolean)[], R>(
  fn: (...args: A) => R,
  maxEntries = 100,
): (...args: A) => R {
  const cache = new LRU<string, R>(maxEntries);
  return (...args: A): R => {
    const key = args.join("|");
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const value = fn(...args);
    cache.set(key, value);
    return value;
  };
}
