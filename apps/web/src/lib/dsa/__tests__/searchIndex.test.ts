import { describe, it, expect } from "vitest";
import { buildSearchIndex, tokenize } from "../searchIndex";

interface Row {
  id: string;
  name: string;
  email: string;
}

const fixture: Row[] = [
  { id: "1", name: "Acme Corp", email: "ops@acme.com" },
  { id: "2", name: "Globex Industries", email: "billing@globex.io" },
  { id: "3", name: "Initech", email: "support@initech.com" },
  { id: "4", name: "Vandelay Imports", email: "art@vandelay.co" },
  { id: "5", name: "Acme Subsidiary", email: "sub@acme.com" },
];

describe("tokenize", () => {
  it("lowercases + splits on non-alphanumeric", () => {
    expect(tokenize("Acme Corp")).toEqual(["acme", "corp"]);
  });

  it("drops 1-char tokens to keep the trie shallow", () => {
    expect(tokenize("A B Acme")).toEqual(["acme"]);
  });

  it("keeps email-shaped tokens together (@ + . are token chars)", () => {
    expect(tokenize("ops@acme.com")).toContain("ops@acme.com");
  });

  it("returns empty for falsy input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("buildSearchIndex", () => {
  it("returns all items when query is empty", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    expect(idx.searchItems("").length).toBe(5);
  });

  it("prefix-matches a single token across multiple items", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    const hits = idx.searchItems("acme");
    expect(hits.map((h) => h.id).sort()).toEqual(["1", "5"]);
  });

  it("returns empty when no token matches", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    expect(idx.searchItems("zzzz").length).toBe(0);
  });

  it("ANDs multi-word queries (every word must hit some field)", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    const hits = idx.searchItems("acme subsidiary");
    expect(hits.map((h) => h.id)).toEqual(["5"]);
  });

  it("preserves original order in result", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name]);
    const all = idx.searchItems("");
    expect(all.map((h) => h.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("upsert() replaces a row's index entries", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    idx.upsert({ id: "1", name: "Renamed Inc", email: "new@renamed.com" });
    expect(idx.searchItems("acme").map((h) => h.id)).toEqual(["5"]);
    expect(idx.searchItems("renamed").map((h) => h.id)).toEqual(["1"]);
  });

  it("remove() drops a row from future queries", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    idx.remove("1");
    expect(idx.searchItems("acme").map((h) => h.id)).toEqual(["5"]);
    expect(idx.size).toBe(4);
  });

  it("size reflects total indexed items", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name, r.email]);
    expect(idx.size).toBe(5);
  });

  it("is case-insensitive on the query side", () => {
    const idx = buildSearchIndex(fixture, (r) => [r.name]);
    expect(
      idx
        .searchItems("ACME")
        .map((h) => h.id)
        .sort(),
    ).toEqual(["1", "5"]);
  });
});
