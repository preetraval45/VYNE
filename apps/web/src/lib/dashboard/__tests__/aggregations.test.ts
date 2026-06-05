import { describe, it, expect } from "vitest";
import {
  bucketByDay,
  bucketByDayMap,
  clamp,
  countBy,
  groupBy,
  hashTo,
  isToday,
  sumBy,
  syntheticMonthly,
  topN,
} from "../aggregations";

const items = [
  { id: "a", category: "fruit", value: 10 },
  { id: "b", category: "fruit", value: 7 },
  { id: "c", category: "veg", value: 12 },
  { id: "d", category: "fruit", value: 3 },
  { id: "e", category: "veg", value: 15 },
];

describe("groupBy", () => {
  it("buckets items by key projection", () => {
    const m = groupBy(items, (it) => it.category);
    expect(m.get("fruit")?.map((i) => i.id)).toEqual(["a", "b", "d"]);
    expect(m.get("veg")?.map((i) => i.id)).toEqual(["c", "e"]);
  });

  it("returns an empty Map for empty input", () => {
    const m = groupBy([] as { id: string }[], (it) => it.id);
    expect(m.size).toBe(0);
  });
});

describe("countBy", () => {
  it("tallies items per key", () => {
    const m = countBy(items, (it) => it.category);
    expect(m.get("fruit")).toBe(3);
    expect(m.get("veg")).toBe(2);
  });

  it("skips null/undefined keys", () => {
    const xs = [{ k: "a" }, { k: null }, { k: undefined }, { k: "a" }];
    const m = countBy(xs as { k: string | null | undefined }[], (x) => x.k);
    expect(m.get("a")).toBe(2);
    expect(m.has(null as never)).toBe(false);
  });
});

describe("sumBy", () => {
  it("sums values per key", () => {
    const m = sumBy(
      items,
      (it) => it.category,
      (it) => it.value,
    );
    expect(m.get("fruit")).toBe(20);
    expect(m.get("veg")).toBe(27);
  });
});

describe("topN", () => {
  it("returns the top N by score", () => {
    const top2 = topN(items, 2, (it) => it.value);
    expect(top2.map((i) => i.id)).toEqual(["e", "c"]);
  });

  it("returns all items when n >= length", () => {
    const all = topN(items, 100, (it) => it.value);
    expect(all.length).toBe(5);
  });

  it("returns [] when n <= 0", () => {
    expect(topN(items, 0, (it) => it.value)).toEqual([]);
  });
});

describe("bucketByDay", () => {
  it("buckets dated items into N day-counters ending today", () => {
    const now = Date.now();
    const days = (n: number) => new Date(now - n * 86400000).toISOString();
    const xs = [{ d: days(0) }, { d: days(0) }, { d: days(2) }, { d: days(6) }];
    const buckets = bucketByDay(xs, 7, (x) => x.d);
    expect(buckets.length).toBe(7);
    expect(buckets[6]).toBe(2); // today (last bucket)
    expect(buckets[4]).toBe(1); // 2 days ago
    expect(buckets[0]).toBe(1); // 6 days ago
  });

  it("respects the filter predicate", () => {
    const now = Date.now();
    const xs = [
      { d: new Date(now).toISOString(), skip: false },
      { d: new Date(now).toISOString(), skip: true },
    ];
    const buckets = bucketByDay(
      xs,
      1,
      (x) => x.d,
      (x) => !x.skip,
    );
    expect(buckets[0]).toBe(1);
  });
});

describe("bucketByDayMap", () => {
  it("produces a Map<iso, count>", () => {
    const today = new Date().toISOString().slice(0, 10);
    const xs = [{ d: today }, { d: today }];
    const m = bucketByDayMap(xs, (x) => x.d);
    expect(m.get(today)).toBe(2);
  });
});

describe("hashTo", () => {
  it("returns one of the labels deterministically", () => {
    const labels = ["a", "b", "c"] as const;
    expect(labels).toContain(hashTo("seed-1", labels));
    expect(hashTo("seed-1", labels)).toBe(hashTo("seed-1", labels));
  });
});

describe("isToday", () => {
  it("true for today, false for yesterday", () => {
    const today = new Date().toISOString();
    const yest = new Date(Date.now() - 86400000).toISOString();
    expect(isToday(today)).toBe(true);
    expect(isToday(yest)).toBe(false);
  });

  it("false for null/undefined/empty", () => {
    expect(isToday(null)).toBe(false);
    expect(isToday(undefined)).toBe(false);
    expect(isToday("")).toBe(false);
  });
});

describe("clamp", () => {
  it("clamps within [lo, hi]", () => {
    expect(clamp(0.5)).toBe(0.5);
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("syntheticMonthly", () => {
  it("produces an array of length months", () => {
    expect(syntheticMonthly(100, 6).length).toBe(6);
  });

  it("is deterministic for the same args", () => {
    const a = syntheticMonthly(100, 6, 0.05);
    const b = syntheticMonthly(100, 6, 0.05);
    expect(a).toEqual(b);
  });
});
