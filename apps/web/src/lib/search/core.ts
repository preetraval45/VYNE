"use client";

import { parseQuery, type ParsedQuery, type ChipKey } from "./queryChips";

/**
 * VYNE search scoring layer.
 *
 *   const hits = searchCorpus(records, "from:sarah type:deal acme");
 *
 * Reuses the existing `queryChips` parser for filter syntax + did-you-mean
 * and lays a relevance scorer + grouped output on top. No React, no
 * zustand — pure utility, safe to call from any code path.
 *
 * Scoring model:
 *   1. Exact id / title match → +90
 *   2. Title substring match → +60
 *   3. Token-prefix match (every query token is a prefix of a title
 *      token) → +30 per token
 *   4. Fuzzy match (Levenshtein ≤ 2 vs any title token) → +12 per token
 *   5. Body substring match → +6 per token
 *   6. Recency bonus: updatedAt within last 7 days → +6
 */

export type EntityType =
  | "deal"
  | "contact"
  | "project"
  | "task"
  | "invoice"
  | "product"
  | "doc"
  | "message"
  | "channel"
  | "person"
  | "page"
  | "command"
  | "attachment";

export interface SearchableRecord {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  href?: string;
  module?: string;
  body?: string;
  owner?: string;
  updatedAt?: string;
  tags?: string[];
}

export interface ScoredHit {
  record: SearchableRecord;
  score: number;
  reason: string[];
}

const RECENCY_MS = 7 * 24 * 60 * 60 * 1000;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

function chipExcludes(rec: SearchableRecord, chips: ParsedQuery["chips"]): boolean {
  for (const k of Object.keys(chips) as ChipKey[]) {
    const value = chips[k];
    if (!value) continue;
    switch (k) {
      case "type":
        if (rec.type !== value) return true;
        break;
      case "in":
        if ((rec.module ?? "").toLowerCase() !== value) return true;
        break;
      case "from":
        if (!(rec.owner ?? "").toLowerCase().includes(value)) return true;
        break;
      case "tag":
        if (!(rec.tags ?? []).map((t) => t.toLowerCase()).includes(value))
          return true;
        break;
      case "is":
        // best-effort match against tag list
        if (!(rec.tags ?? []).map((t) => t.toLowerCase()).includes(value))
          return true;
        break;
      case "after":
        if (!rec.updatedAt) return true;
        if (new Date(rec.updatedAt).getTime() <= new Date(value).getTime())
          return true;
        break;
      case "before":
        if (!rec.updatedAt) return true;
        if (new Date(rec.updatedAt).getTime() >= new Date(value).getTime())
          return true;
        break;
    }
  }
  return false;
}

export function scoreRecord(
  rec: SearchableRecord,
  q: ParsedQuery,
): ScoredHit | null {
  if (chipExcludes(rec, q.chips)) return null;

  const text = q.text.toLowerCase().trim();
  const hasChips = Object.keys(q.chips).length > 0;
  if (text.length === 0)
    return hasChips ? { record: rec, score: 0, reason: ["chip-only"] } : null;

  let score = 0;
  const reason: string[] = [];
  const titleLower = rec.title.toLowerCase();
  const idLower = rec.id.toLowerCase();
  const bodyLower = (rec.body ?? "").toLowerCase();

  if (idLower === text || titleLower === text) {
    score += 90;
    reason.push("exact");
  }
  if (titleLower.includes(text)) {
    score += 60;
    reason.push("title-substring");
  }
  const titleTokens = tokenize(rec.title);
  const tokens = tokenize(text);
  for (const t of tokens) {
    if (titleTokens.some((tt) => tt.startsWith(t))) {
      score += 30;
      reason.push(`prefix:${t}`);
      continue;
    }
    if (titleTokens.some((tt) => editDistance(tt, t, 2) <= 2)) {
      score += 12;
      reason.push(`fuzzy:${t}`);
      continue;
    }
    if (bodyLower.includes(t)) {
      score += 6;
      reason.push(`body:${t}`);
    }
  }
  if (rec.updatedAt) {
    const age = Date.now() - new Date(rec.updatedAt).getTime();
    if (age >= 0 && age <= RECENCY_MS) {
      score += 6;
      reason.push("recent");
    }
  }
  return score > 0 ? { record: rec, score, reason } : null;
}

export function searchCorpus(
  corpus: ReadonlyArray<SearchableRecord>,
  rawQuery: string,
  limit = 30,
): ScoredHit[] {
  const q = parseQuery(rawQuery);
  if (q.text.length === 0 && Object.keys(q.chips).length === 0) return [];
  const out: ScoredHit[] = [];
  for (const rec of corpus) {
    const hit = scoreRecord(rec, q);
    if (hit) out.push(hit);
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

export function groupByType(
  hits: ScoredHit[],
  preferredOrder: EntityType[] = [
    "deal",
    "contact",
    "project",
    "task",
    "invoice",
    "doc",
    "product",
    "channel",
    "message",
    "person",
    "page",
    "attachment",
    "command",
  ],
): Map<EntityType, ScoredHit[]> {
  const map = new Map<EntityType, ScoredHit[]>();
  for (const t of preferredOrder) map.set(t, []);
  for (const h of hits) {
    const list = map.get(h.record.type) ?? [];
    list.push(h);
    map.set(h.record.type, list);
  }
  for (const [k, v] of map) if (v.length === 0) map.delete(k);
  return map;
}

export type { ParsedQuery };
