/* ═══════════════════════════════════════════════════════════════
 * Dashboard aggregation helpers — the "DSA" layer.
 *
 * The naive per-widget code does `items.filter(...)` once per project
 * × per metric, which is O(n × m). For a portfolio with 8 projects
 * and 200 tasks that's already 1600 ops to render one card.
 *
 * These helpers build the index Maps once (O(n)), so every downstream
 * widget is an O(1) lookup. Wrap them in useMemo on the consumer side
 * and the whole dashboard does linear work regardless of widget count.
 *
 * Everything here is pure data — no React. Safe to call in selectors
 * or server-side code.
 * ═══════════════════════════════════════════════════════════════ */

/** O(n) group-by — single pass, returns a Map keyed by the projection. */
export function groupBy<T, K>(
  items: readonly T[],
  key: (item: T) => K,
): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const bucket = out.get(k);
    if (bucket) bucket.push(it);
    else out.set(k, [it]);
  }
  return out;
}

/** O(n) tally — single pass, increments per key. */
export function countBy<T, K>(
  items: readonly T[],
  key: (item: T) => K | null | undefined,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const it of items) {
    const k = key(it);
    if (k === null || k === undefined) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** O(n) sum-by — single pass, sums a numeric projection per key. */
export function sumBy<T, K>(
  items: readonly T[],
  key: (item: T) => K | null | undefined,
  value: (item: T) => number,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const it of items) {
    const k = key(it);
    if (k === null || k === undefined) continue;
    out.set(k, (out.get(k) ?? 0) + value(it));
  }
  return out;
}

/**
 * O(n + k log k) top-N. Uses partial sort — much cheaper than full
 * sort + slice when N is small relative to n.
 */
export function topN<T>(
  items: readonly T[],
  n: number,
  score: (item: T) => number,
): T[] {
  if (n <= 0) return [];
  if (items.length <= n) return [...items].sort((a, b) => score(b) - score(a));
  // Min-heap of size n (array-backed). Simple — for the dashboard's small N
  // the constant overhead of a proper heap class isn't worth it.
  const heap: { item: T; s: number }[] = [];
  for (const it of items) {
    const s = score(it);
    if (heap.length < n) {
      heap.push({ item: it, s });
      heap.sort((a, b) => a.s - b.s);
    } else if (s > heap[0].s) {
      heap[0] = { item: it, s };
      heap.sort((a, b) => a.s - b.s);
    }
  }
  return heap.sort((a, b) => b.s - a.s).map((x) => x.item);
}

/**
 * O(n) bucket-by-day. Returns an array of N buckets where index 0 is
 * (today - N + 1) and index N-1 is today. Each bucket counts how many
 * items resolve to that day via `dateOf`.
 */
export function bucketByDay<T>(
  items: readonly T[],
  days: number,
  dateOf: (item: T) => string | null | undefined,
  filter?: (item: T) => boolean,
): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  for (const it of items) {
    if (filter && !filter(it)) continue;
    const iso = dateOf(it);
    if (!iso) continue;
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) continue;
    const daysAgo = Math.floor((now - ts) / 86400000);
    if (daysAgo < 0 || daysAgo >= days) continue;
    buckets[days - 1 - daysAgo] += 1;
  }
  return buckets;
}

/**
 * O(n) bucket-by-day Map — single iteration produces a Map<isoDate, count>
 * for use with ActivityCalendar.
 */
export function bucketByDayMap<T>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of items) {
    const iso = (dateOf(it) ?? "").slice(0, 10);
    if (!iso) continue;
    out.set(iso, (out.get(iso) ?? 0) + 1);
  }
  return out;
}

/** Stable hash → one of N labels. Used for fake geographic distribution. */
export function hashTo<T>(seed: string, labels: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return labels[Math.abs(h) % labels.length];
}

/** O(1) check — is `iso` (or its date portion) "today" in local time? */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) === today;
}

/** O(1) clamp helper used widely by gauges + ring widgets. */
export function clamp(v: number, lo = 0, hi = 1): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Synthetic-fallback monthly series (deterministic, smooth). */
export function syntheticMonthly(
  base: number,
  months = 6,
  growth = 0.05,
): number[] {
  return Array.from({ length: months }, (_, i) =>
    Math.round(base * (1 + i * growth) * (0.92 + 0.16 * Math.sin(i * 0.6))),
  );
}
