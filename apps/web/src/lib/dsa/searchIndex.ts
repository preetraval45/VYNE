/* ═══════════════════════════════════════════════════════════════
 * Generic search index.
 *
 * Naive search on most pages today is `items.filter(i =>
 * i.field.toLowerCase().includes(query))`, which is O(n × m × k)
 * per keystroke (n items × m fields × k query length). For a 5k-row
 * table on every keystroke that's millions of charCode comparisons.
 *
 * This module builds an **inverted token index** + **prefix Trie**:
 *   - `tokenize(s)` splits on non-alphanumeric → lowercase tokens
 *   - For every item, every token is hashed into `Map<token, Set<id>>`
 *     and inserted into a Trie so prefix queries are O(prefix-len).
 *
 * Search time is **O(p + r)** where p = query prefix length, r =
 * number of result ids matched — independent of the corpus size.
 *
 * Memory: O(total tokens). For a 5k-row × 10-token corpus that's
 * ~50k entries — a few MB at most.
 *
 * Use:
 *   const idx = buildSearchIndex(rows, r => [r.name, r.email, r.company]);
 *   const hits = idx.search("acme")          // → Set<id>
 *   const items = idx.searchItems("acme")    // → readonly T[]
 *
 * Pure data — safe in selectors, suspense boundaries, or workers.
 * ═══════════════════════════════════════════════════════════════ */

export interface SearchIndex<T> {
  /** Find all item ids whose any indexed field starts with the query.
   *  Multi-word queries are AND-ed: every word must hit at least one
   *  prefix in some indexed field of the same item. */
  search(query: string): ReadonlySet<string>;
  /** Convenience: same as `search` but returns the items, in original
   *  order. Useful for direct rendering. */
  searchItems(query: string): readonly T[];
  /** Re-index a mutated row. O(t) where t = tokens of the new row. */
  upsert(item: T): void;
  /** Drop a row from the index. O(t × avg-token-len). */
  remove(itemId: string): void;
  /** Number of indexed items (not tokens). */
  readonly size: number;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  ids: Set<string>;
}

function emptyTrieNode(): TrieNode {
  return { children: new Map(), ids: new Set() };
}

/** Split a string into normalized prefix-searchable tokens.
 *  - Lowercase
 *  - Split on anything that isn't a letter, digit, or dollar/period
 *    (so SKUs like "WIDGET-100" become ["widget", "100"])
 *  - Drop empties and 1-char tokens to keep the trie shallow. */
export function tokenize(s: string): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9$.@]+/)
    .filter((t) => t.length >= 2);
}

function insertIntoTrie(node: TrieNode, token: string, id: string): void {
  let cur = node;
  cur.ids.add(id);
  for (const ch of token) {
    let next = cur.children.get(ch);
    if (!next) {
      next = emptyTrieNode();
      cur.children.set(ch, next);
    }
    cur = next;
    cur.ids.add(id);
  }
}

function removeFromTrie(node: TrieNode, token: string, id: string): void {
  let cur = node;
  cur.ids.delete(id);
  for (const ch of token) {
    const next = cur.children.get(ch);
    if (!next) return;
    cur = next;
    cur.ids.delete(id);
  }
}

function searchTrie(node: TrieNode, prefix: string): ReadonlySet<string> {
  let cur = node;
  for (const ch of prefix) {
    const next = cur.children.get(ch);
    if (!next) return EMPTY_SET;
    cur = next;
  }
  return cur.ids;
}

const EMPTY_SET: ReadonlySet<string> = new Set();
const EMPTY_ARRAY: readonly never[] = Object.freeze([]);

export interface BuildOpts<T> {
  /** Returns the unique id of an item — defaults to `(i as any).id`. */
  id?: (item: T) => string;
}

/**
 * Build a search index in O(n × t) once, then search in O(p + r) forever.
 *
 * `fieldsOf(item)` is called once per item; return every string that
 * should be searchable. Returning more than ~10 fields per row is fine.
 */
export function buildSearchIndex<T>(
  items: readonly T[],
  fieldsOf: (item: T) => readonly string[],
  opts: BuildOpts<T> = {},
): SearchIndex<T> {
  const idOf = opts.id ?? ((it: T) => (it as { id: string }).id);
  const root = emptyTrieNode();
  const byId = new Map<string, { item: T; tokens: Set<string> }>();
  const order: string[] = [];

  for (const item of items) {
    const id = idOf(item);
    const tokens = new Set<string>();
    for (const field of fieldsOf(item)) {
      for (const tok of tokenize(field)) {
        tokens.add(tok);
        insertIntoTrie(root, tok, id);
      }
    }
    byId.set(id, { item, tokens });
    order.push(id);
  }

  function search(query: string): ReadonlySet<string> {
    const q = query.trim().toLowerCase();
    if (!q) return new Set(order);
    const words = q.split(/[^a-z0-9$.@]+/).filter((w) => w.length > 0);
    if (words.length === 0) return new Set(order);
    let acc: ReadonlySet<string> | null = null;
    for (const w of words) {
      const hit = searchTrie(root, w);
      if (hit.size === 0) return EMPTY_SET;
      if (acc === null) {
        acc = hit;
      } else {
        // Set intersection — iterate the smaller side.
        const small = acc.size < hit.size ? acc : hit;
        const large = acc.size < hit.size ? hit : acc;
        const next = new Set<string>();
        for (const id of small) if (large.has(id)) next.add(id);
        acc = next;
      }
    }
    return acc ?? EMPTY_SET;
  }

  function searchItems(query: string): readonly T[] {
    const ids = search(query);
    if (ids.size === 0) return EMPTY_ARRAY as readonly T[];
    if (ids.size === byId.size) {
      // No filtering — return everything in original order, no allocation.
      return order.map((id) => byId.get(id)!.item);
    }
    const out: T[] = [];
    for (const id of order) {
      if (ids.has(id)) out.push(byId.get(id)!.item);
    }
    return out;
  }

  function upsert(item: T): void {
    const id = idOf(item);
    const prev = byId.get(id);
    if (prev) {
      for (const tok of prev.tokens) removeFromTrie(root, tok, id);
    } else {
      order.push(id);
    }
    const tokens = new Set<string>();
    for (const field of fieldsOf(item)) {
      for (const tok of tokenize(field)) {
        tokens.add(tok);
        insertIntoTrie(root, tok, id);
      }
    }
    byId.set(id, { item, tokens });
  }

  function remove(itemId: string): void {
    const prev = byId.get(itemId);
    if (!prev) return;
    for (const tok of prev.tokens) removeFromTrie(root, tok, itemId);
    byId.delete(itemId);
    const idx = order.indexOf(itemId);
    if (idx >= 0) order.splice(idx, 1);
  }

  return {
    search,
    searchItems,
    upsert,
    remove,
    get size() {
      return byId.size;
    },
  };
}
