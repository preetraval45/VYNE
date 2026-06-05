"use client";

import { useMemo } from "react";
import { buildSearchIndex } from "@/lib/dsa/searchIndex";

/* ═══════════════════════════════════════════════════════════════
 * useSearchIndex — drop-in replacement for the
 *   items.filter(i => i.field.toLowerCase().includes(q))
 * pattern.
 *
 * Build once per items-reference change (O(n × t)), then every
 * keystroke is O(p + r) where p = prefix length and r = result count.
 *
 * Usage:
 *   const filtered = useSearchIndex(
 *     contacts,
 *     (c) => [c.name, c.email, c.title],
 *     debouncedSearch,
 *   );
 *
 * Falls back to the unfiltered array when the query is empty, so
 * the caller doesn't need to special-case the empty state.
 * ═══════════════════════════════════════════════════════════════ */

export function useSearchIndex<T>(
  items: readonly T[],
  fieldsOf: (item: T) => readonly string[],
  query: string,
): readonly T[] {
  // Build the index whenever the source array reference changes.
  // The fieldsOf closure is intentionally not in the dep array — it's
  // expected to be stable for a given component instance. Wrapping it
  // in useCallback at the call-site is overkill for this pattern.
  const index = useMemo(
    () => buildSearchIndex(items, fieldsOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  // Re-run the search only when the query or the index changes.
  return useMemo(() => index.searchItems(query), [index, query]);
}
