import { describe, it, expect } from "vitest";
import { LRU, memoize, memoizeMany } from "../lru";

describe("LRU", () => {
  it("stores and retrieves a value", () => {
    const lru = new LRU<string, number>(3);
    lru.set("a", 1);
    expect(lru.get("a")).toBe(1);
  });

  it("evicts the least-recently-used entry once max is hit", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.set("c", 3); // evicts "a"
    expect(lru.get("a")).toBeUndefined();
    expect(lru.get("b")).toBe(2);
    expect(lru.get("c")).toBe(3);
  });

  it("get() refreshes recency", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.get("a"); // a is now MRU
    lru.set("c", 3); // should evict "b", not "a"
    expect(lru.get("a")).toBe(1);
    expect(lru.get("b")).toBeUndefined();
    expect(lru.get("c")).toBe(3);
  });

  it("set() of an existing key updates the value + recency", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.set("a", 100); // updates value, refreshes recency
    lru.set("c", 3); // should evict "b", not "a"
    expect(lru.get("a")).toBe(100);
    expect(lru.get("b")).toBeUndefined();
  });

  it("has() returns true/false without affecting recency", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    expect(lru.has("a")).toBe(true);
    expect(lru.has("z")).toBe(false);
  });

  it("delete() removes a key", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    expect(lru.delete("a")).toBe(true);
    expect(lru.get("a")).toBeUndefined();
    expect(lru.delete("a")).toBe(false);
  });

  it("clear() empties the cache", () => {
    const lru = new LRU<string, number>(2);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.clear();
    expect(lru.size).toBe(0);
  });

  it("size reports current entry count", () => {
    const lru = new LRU<string, number>(5);
    lru.set("a", 1);
    lru.set("b", 2);
    expect(lru.size).toBe(2);
  });

  it("throws when maxEntries < 1", () => {
    expect(() => new LRU<string, number>(0)).toThrow();
  });
});

describe("memoize", () => {
  it("only invokes the function once per argument", () => {
    let calls = 0;
    const square = memoize((n: number) => {
      calls += 1;
      return n * n;
    }, 10);
    expect(square(4)).toBe(16);
    expect(square(4)).toBe(16);
    expect(square(4)).toBe(16);
    expect(calls).toBe(1);
  });

  it("re-invokes after eviction", () => {
    let calls = 0;
    const square = memoize((n: number) => {
      calls += 1;
      return n * n;
    }, 2);
    square(1);
    square(2);
    square(3); // evicts 1
    square(1); // miss → re-invoke
    expect(calls).toBe(4);
  });
});

describe("memoizeMany", () => {
  it("hashes multiple primitive args into a single key", () => {
    let calls = 0;
    const sum = memoizeMany((...args: number[]) => {
      calls += 1;
      return args.reduce((s, n) => s + n, 0);
    }, 10);
    expect(sum(1, 2, 3)).toBe(6);
    expect(sum(1, 2, 3)).toBe(6);
    expect(calls).toBe(1);
  });
});
