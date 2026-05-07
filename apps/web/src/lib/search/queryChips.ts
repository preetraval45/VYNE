/**
 * Query-chip parser for Cmd+K & global search.
 *
 *   parseQuery("from:sarah type:deal closed quarterly")
 *     → {
 *         text: "closed quarterly",
 *         chips: { from: "sarah", type: "deal" },
 *       }
 *
 * Recognised chip keys (others fall through into `text` untouched):
 *   - from:    actor / author name (matches `actor`, `author.name`)
 *   - type:    canonical entity type (deal, task, doc, contact, …)
 *   - in:      module id (crm, ops, finance, …)
 *   - tag:     case-insensitive tag match
 *   - is:      status keyword (open, closed, won, paid, overdue, …)
 *   - before:  ISO date or relative ("yesterday", "1w")
 *   - after:   same syntax
 *
 * Designed to be cheap and dependency-free so it runs in the keystroke
 * loop. Returns plain data — the caller owns matching against records.
 */

export type ChipKey =
  | "from"
  | "type"
  | "in"
  | "tag"
  | "is"
  | "before"
  | "after";

export interface ParsedQuery {
  text: string;
  chips: Partial<Record<ChipKey, string>>;
}

const CHIP_KEYS: readonly ChipKey[] = [
  "from",
  "type",
  "in",
  "tag",
  "is",
  "before",
  "after",
];

const CHIP_RE = new RegExp(
  `(^|\\s)(${CHIP_KEYS.join("|")}):("[^"]+"|\\S+)`,
  "gi",
);

export function parseQuery(raw: string): ParsedQuery {
  if (!raw) return { text: "", chips: {} };
  const chips: Partial<Record<ChipKey, string>> = {};
  let text = raw;
  text = text.replace(CHIP_RE, (_full, leading, key, value) => {
    const k = key.toLowerCase() as ChipKey;
    let v = value;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    chips[k] = v.toLowerCase();
    return leading;
  });
  text = text.replace(/\s+/g, " ").trim();
  return { text, chips };
}

/** Turn a chip dict back into a string fragment. Handy for "save this". */
export function stringifyChips(chips: Partial<Record<ChipKey, string>>): string {
  return Object.entries(chips)
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) =>
      v!.includes(" ") ? `${k}:"${v}"` : `${k}:${v}`,
    )
    .join(" ");
}

/** Cheap Levenshtein for did-you-mean. O(m*n); fine for short tokens. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Suggest the closest term from `vocabulary` to the typed `query`.
 * Returns null if nothing is within `maxDistance` (default 2). Use when
 * a query yields zero results — the caller renders "Did you mean
 * `<suggestion>`?" with one click to accept.
 */
export function didYouMean(
  query: string,
  vocabulary: readonly string[],
  maxDistance = 2,
): string | null {
  const q = query.toLowerCase().trim();
  if (!q || vocabulary.length === 0) return null;
  let best: { word: string; distance: number } | null = null;
  for (const word of vocabulary) {
    const w = word.toLowerCase();
    if (w === q) return null; // exact match — no suggestion needed
    const d = levenshtein(q, w);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = { word, distance: d };
    }
  }
  return best?.word ?? null;
}

/**
 * For multi-word queries, run did-you-mean on each whitespace-split
 * token and return the corrected query if at least one token improves.
 * Tokens shorter than 4 chars are left alone (too noisy).
 */
export function correctQuery(
  query: string,
  vocabulary: readonly string[],
): string | null {
  const tokens = query.split(/\s+/);
  let changed = false;
  const corrected = tokens.map((t) => {
    if (t.length < 4 || /^\w+:/.test(t)) return t; // skip chips
    const sug = didYouMean(t, vocabulary);
    if (sug && sug.toLowerCase() !== t.toLowerCase()) {
      changed = true;
      return sug;
    }
    return t;
  });
  return changed ? corrected.join(" ") : null;
}
