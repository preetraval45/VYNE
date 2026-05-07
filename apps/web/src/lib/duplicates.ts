/**
 * Fuzzy duplicate finder. Scores every pair of records by how many
 * fingerprint values match; returns clusters above a confidence
 * threshold.
 *
 *   const groups = findDuplicates(contacts, {
 *     fingerprints: [
 *       { field: "email", weight: 50, normalize: (v) => v.toLowerCase().trim() },
 *       { field: "phone", weight: 30, normalize: stripDigits },
 *       { field: "name",  weight: 20, normalize: (v) => v.toLowerCase() },
 *     ],
 *     minScore: 50,
 *   });
 *
 * Each cluster is `{ records: T[]; score: number; matchedOn: string[] }`.
 * The merge UI picks the "primary" (highest score, most recent) and
 * lets the user accept or reject one cluster at a time.
 */

export interface Fingerprint<T> {
  /** Field on the record to fingerprint. */
  field: keyof T;
  /** Weight contributed when this field matches (sum of weights = 100). */
  weight: number;
  /** Normalize before comparing — lowercase / strip / split / etc. */
  normalize?: (value: unknown) => string;
}

export interface DuplicateCluster<T> {
  records: T[];
  /** 0..100 inclusive — average pairwise score across the cluster. */
  score: number;
  /** Which fingerprint fields matched. */
  matchedOn: string[];
}

export interface FindDuplicatesOpts<T> {
  fingerprints: Fingerprint<T>[];
  /** Minimum cluster score to surface (0..100). Default 60. */
  minScore?: number;
  /** Optional id getter; defaults to `(r) => (r as any).id`. */
  idOf?: (r: T) => string;
}

function defaultNormalize(v: unknown): string {
  if (v == null) return "";
  return String(v).toLowerCase().trim();
}

function pairScore<T>(
  a: T,
  b: T,
  fingerprints: Fingerprint<T>[],
): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = [];
  for (const fp of fingerprints) {
    const norm = fp.normalize ?? defaultNormalize;
    const av = norm(a[fp.field]);
    const bv = norm(b[fp.field]);
    if (av && bv && av === bv) {
      score += fp.weight;
      matchedOn.push(String(fp.field));
    }
  }
  return { score: Math.min(100, score), matchedOn };
}

/**
 * Union-find — groups any pair scoring ≥ minScore into the same
 * cluster, then returns clusters with average pairwise score.
 */
export function findDuplicates<T>(
  records: T[],
  opts: FindDuplicatesOpts<T>,
): DuplicateCluster<T>[] {
  const minScore = opts.minScore ?? 60;
  const idOf = opts.idOf ?? ((r: T) => String((r as { id?: string }).id ?? ""));

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let cur = id;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, parent.get(next) ?? next);
      cur = parent.get(cur)!;
    }
    return cur;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Init.
  for (const r of records) {
    const id = idOf(r);
    if (!id) continue;
    parent.set(id, id);
  }

  // Pairwise scan. O(n²) — fine for ≤ a few thousand rows; swap for an
  // LSH index when corpora cross 10k.
  const pairScores = new Map<string, { score: number; matchedOn: string[] }>();
  for (let i = 0; i < records.length; i++) {
    const a = records[i];
    const aid = idOf(a);
    if (!aid) continue;
    for (let j = i + 1; j < records.length; j++) {
      const b = records[j];
      const bid = idOf(b);
      if (!bid) continue;
      const ps = pairScore(a, b, opts.fingerprints);
      if (ps.score >= minScore) {
        pairScores.set(`${aid}::${bid}`, ps);
        union(aid, bid);
      }
    }
  }

  // Bucket by root.
  const buckets = new Map<string, T[]>();
  const bucketMatched = new Map<string, Set<string>>();
  const bucketScores = new Map<string, number[]>();
  for (const r of records) {
    const id = idOf(r);
    if (!id) continue;
    const root = find(id);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root)!.push(r);
  }
  // Re-walk pairs to compute average scores per bucket.
  for (const [pairKey, ps] of pairScores) {
    const [aid, bid] = pairKey.split("::");
    const root = find(aid);
    if (find(bid) !== root) continue;
    if (!bucketScores.has(root)) bucketScores.set(root, []);
    bucketScores.get(root)!.push(ps.score);
    if (!bucketMatched.has(root)) bucketMatched.set(root, new Set());
    for (const f of ps.matchedOn) bucketMatched.get(root)!.add(f);
  }

  const out: DuplicateCluster<T>[] = [];
  for (const [root, rs] of buckets) {
    if (rs.length < 2) continue;
    const scores = bucketScores.get(root) ?? [];
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    out.push({
      records: rs,
      score: avg,
      matchedOn: Array.from(bucketMatched.get(root) ?? []),
    });
  }

  // Sort by score desc.
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Merge n records into a single primary by copying every non-empty
 * field from secondaries into blank fields on the primary.
 *
 *   const merged = mergeRecords(primary, [secondary1, secondary2]);
 *   // Caller still needs to delete the secondaries from their store.
 */
export function mergeRecords<T extends Record<string, unknown>>(
  primary: T,
  secondaries: T[],
): T {
  const merged = { ...primary };
  for (const sec of secondaries) {
    for (const [key, value] of Object.entries(sec)) {
      if (value == null || value === "") continue;
      if (merged[key] == null || merged[key] === "") {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }
  return merged;
}

/** Strip non-digit characters from a phone number. */
export function stripDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}
