/**
 * Cursor-based pagination helpers, used by every list endpoint that
 * scales past a few thousand rows. Replaces `?page=N&limit=20`
 * offset paging (which gets slower as the data grows + breaks under
 * concurrent inserts) with a stable opaque cursor that encodes the
 * sort key + tiebreaker id.
 *
 *   const { items, cursor } = paginate(deals, {
 *     limit: 50,
 *     after: req.searchParams.get("cursor"),
 *     orderBy: "updatedAt",
 *     idField: "id",
 *   });
 *   return NextResponse.json({ items, nextCursor: cursor });
 *
 * Cursors are base64url-encoded JSON `{ k: <orderByValue>, i: <id> }`,
 * so any caller that round-trips them sees a stable string.
 */

interface PaginateOpts<T, K extends keyof T> {
  /** Max rows to return. */
  limit: number;
  /** Opaque cursor from the previous response. null for the first page. */
  after?: string | null;
  /** Key to sort by — must be present on every row. */
  orderBy: K;
  /** Tiebreaker id field — must be unique. */
  idField: keyof T;
  /** "asc" | "desc". Default desc (newest first). */
  direction?: "asc" | "desc";
}

interface PaginateResult<T> {
  items: T[];
  /** Cursor for the *next* page; null when the result was the last page. */
  cursor: string | null;
}

function encodeCursor(value: { k: unknown; i: unknown }): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }
  // browser fallback
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCursor(s: string): { k: unknown; i: unknown } | null {
  try {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/");
    const raw =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : atob(padded);
    return JSON.parse(raw) as { k: unknown; i: unknown };
  } catch {
    return null;
  }
}

function compare(
  a: unknown,
  b: unknown,
  direction: "asc" | "desc",
): number {
  if (a == null && b == null) return 0;
  if (a == null) return direction === "asc" ? -1 : 1;
  if (b == null) return direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }
  const av = String(a);
  const bv = String(b);
  if (av < bv) return direction === "asc" ? -1 : 1;
  if (av > bv) return direction === "asc" ? 1 : -1;
  return 0;
}

/**
 * In-memory pagination over an array. For SQL-backed code, mirror
 * this contract:
 *
 *   SELECT * FROM deals
 *   WHERE (updated_at, id) < ($1, $2)         -- desc
 *   ORDER BY updated_at DESC, id DESC
 *   LIMIT $3 + 1;
 *
 * (And `>` for asc.) The `LIMIT + 1` trick reveals "is there another
 * page" without a separate count.
 */
export function paginate<T, K extends keyof T>(
  rows: readonly T[],
  opts: PaginateOpts<T, K>,
): PaginateResult<T> {
  const { limit, after, orderBy, idField } = opts;
  const direction = opts.direction ?? "desc";

  const sorted = [...rows].sort((a, b) => {
    const primary = compare(a[orderBy], b[orderBy], direction);
    if (primary !== 0) return primary;
    return compare(a[idField], b[idField], direction);
  });

  let startIdx = 0;
  if (after) {
    const cur = decodeCursor(after);
    if (cur) {
      startIdx = sorted.findIndex((r) => {
        const c = compare(r[orderBy], cur.k, direction);
        if (c !== 0) return c > 0;
        return compare(r[idField], cur.i, direction) > 0;
      });
      if (startIdx === -1) startIdx = sorted.length;
    }
  }

  const slice = sorted.slice(startIdx, startIdx + limit);
  const last = slice[slice.length - 1];
  const more = startIdx + limit < sorted.length;
  const cursor =
    more && last
      ? encodeCursor({ k: last[orderBy], i: last[idField] })
      : null;

  return { items: slice, cursor };
}
