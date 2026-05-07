/**
 * Pivot table builder (22.6).
 *
 *   const table = pivot(deals, {
 *     rows: ["stage"],
 *     cols: ["region"],
 *     measure: "value",
 *     agg: "sum",
 *   });
 *
 * Returns `{ rowHeaders, colHeaders, cells, totals }` so callers can
 * render with whatever table primitive they already use. Multiple
 * row + column dimensions concatenate with `·` to keep the matrix
 * 2-D for rendering.
 */

export type PivotAgg = "sum" | "count" | "avg" | "min" | "max";

export interface PivotOpts<T> {
  rows: Array<keyof T>;
  cols: Array<keyof T>;
  measure: keyof T;
  agg?: PivotAgg;
}

export interface PivotTable {
  rowHeaders: string[];
  colHeaders: string[];
  /** [rowIndex][colIndex] → number. */
  cells: number[][];
  /** Row totals (sum across columns). */
  rowTotals: number[];
  /** Column totals (sum across rows). */
  colTotals: number[];
  /** Grand total. */
  total: number;
}

function dimensionKey<T>(row: T, fields: Array<keyof T>): string {
  return fields.map((f) => String(row[f] ?? "—")).join(" · ");
}

export function pivot<T>(
  rows: readonly T[],
  opts: PivotOpts<T>,
): PivotTable {
  const agg = opts.agg ?? "sum";
  const rowKeys: string[] = [];
  const colKeys: string[] = [];
  const buckets = new Map<string, Map<string, { sum: number; count: number; min: number; max: number }>>();

  for (const r of rows) {
    const rk = dimensionKey(r, opts.rows);
    const ck = dimensionKey(r, opts.cols);
    if (!rowKeys.includes(rk)) rowKeys.push(rk);
    if (!colKeys.includes(ck)) colKeys.push(ck);
    const v = Number(r[opts.measure]);
    if (!buckets.has(rk)) buckets.set(rk, new Map());
    const colMap = buckets.get(rk)!;
    const cur = colMap.get(ck) ?? {
      sum: 0,
      count: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
    };
    cur.count += 1;
    if (Number.isFinite(v)) {
      cur.sum += v;
      if (v < cur.min) cur.min = v;
      if (v > cur.max) cur.max = v;
    }
    colMap.set(ck, cur);
  }

  rowKeys.sort();
  colKeys.sort();

  const cells: number[][] = [];
  const rowTotals: number[] = [];
  const colTotals: number[] = colKeys.map(() => 0);
  let total = 0;

  rowKeys.forEach((rk, ri) => {
    const row: number[] = [];
    let rowSum = 0;
    colKeys.forEach((ck, ci) => {
      const cur = buckets.get(rk)?.get(ck);
      let value = 0;
      if (cur) {
        switch (agg) {
          case "count":
            value = cur.count;
            break;
          case "avg":
            value = cur.count > 0 ? cur.sum / cur.count : 0;
            break;
          case "min":
            value = cur.min === Number.POSITIVE_INFINITY ? 0 : cur.min;
            break;
          case "max":
            value = cur.max === Number.NEGATIVE_INFINITY ? 0 : cur.max;
            break;
          case "sum":
          default:
            value = cur.sum;
            break;
        }
      }
      row.push(value);
      rowSum += value;
      colTotals[ci] += value;
    });
    cells.push(row);
    rowTotals.push(rowSum);
    total += rowSum;
  });

  return { rowHeaders: rowKeys, colHeaders: colKeys, cells, rowTotals, colTotals, total };
}
