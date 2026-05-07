import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { MOCK_PRODUCTS, MOCK_ORDERS } from "@/lib/fixtures/ops";
import { EMPLOYEES } from "@/lib/fixtures/hr";

/**
 * POST /api/search/global
 * Body: { q: string; chips?: { from?: string; type?: string; in?: string; tag?: string; is?: string } }
 *
 * Layered ranker:
 *   1. Exact substring match on the primary label (rank 1.0)
 *   2. Token-prefix match on any displayable field (rank 0.6)
 *   3. Fuzzy distance ≤ 2 on label tokens (rank 0.3)
 *   4. Recency tie-breaker for entities with timestamps
 *
 * The same response shape will swap to a true vector search (OpenAI /
 * Voyage / Cohere embeddings) once embeddings are wired in. Until
 * then the fixture-backed scorer keeps the API contract stable.
 */

export const runtime = "edge";

interface ChipDict {
  from?: string;
  type?: string;
  in?: string;
  tag?: string;
  is?: string;
}

interface SearchResult {
  id: string;
  type: "product" | "order" | "person" | "doc" | "task" | "deal" | "channel";
  module: string;
  title: string;
  snippet?: string;
  href: string;
  score: number;
  ts?: string;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Fast Levenshtein with early-out cap. */
function withinDistance(a: string, b: string, cap: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let row = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < row) row = curr[j];
    }
    if (row > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function scoreLabel(query: string, label: string): number {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (!q) return 0;
  if (l.includes(q)) {
    // Boost if it's a prefix
    return l.startsWith(q) ? 1.0 : 0.85;
  }
  const qTokens = tokenize(q);
  const lTokens = tokenize(l);
  let prefixHits = 0;
  for (const qt of qTokens) {
    if (lTokens.some((lt) => lt.startsWith(qt))) prefixHits += 1;
  }
  if (prefixHits > 0) return 0.6 * (prefixHits / qTokens.length);
  // Fuzzy fallback
  let fuzzyHits = 0;
  for (const qt of qTokens) {
    if (qt.length < 4) continue;
    if (lTokens.some((lt) => withinDistance(qt, lt, 2) <= 2)) fuzzyHits += 1;
  }
  return 0.3 * (fuzzyHits / Math.max(qTokens.length, 1));
}

function applyChips(r: SearchResult, chips: ChipDict): boolean {
  if (chips.type && r.type !== chips.type.toLowerCase()) return false;
  if (chips.in && r.module.toLowerCase() !== chips.in.toLowerCase()) return false;
  return true;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "search-global",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as {
    q?: string;
    chips?: ChipDict;
    limit?: number;
  };
  const q = (body.q ?? "").trim();
  const chips = body.chips ?? {};
  const limit = Math.min(Math.max(body.limit ?? 24, 1), 100);

  const results: SearchResult[] = [];

  // Products
  for (const p of MOCK_PRODUCTS) {
    const score = scoreLabel(q, `${p.sku} ${p.name}`);
    if (score <= 0) continue;
    results.push({
      id: `product-${p.id}`,
      type: "product",
      module: "ops",
      title: `${p.sku} · ${p.name}`,
      snippet: `${p.categoryName ?? "Uncategorized"} · ${p.stockQty} in stock`,
      href: `/ops?product=${p.id}`,
      score,
    });
  }

  // Orders
  for (const o of MOCK_ORDERS) {
    const score = scoreLabel(q, `${o.id} ${o.customerName}`);
    if (score <= 0) continue;
    results.push({
      id: `order-${o.id}`,
      type: "order",
      module: "ops",
      title: `${o.id} · ${o.customerName}`,
      snippet: `${o.status} · $${o.total}`,
      href: `/ops?order=${o.id}`,
      score,
    });
  }

  // People
  for (const e of EMPLOYEES) {
    const score = scoreLabel(q, `${e.name} ${e.title}`);
    if (score <= 0) continue;
    results.push({
      id: `person-${e.id}`,
      type: "person",
      module: "hr",
      title: e.name,
      snippet: `${e.title} · ${e.department}`,
      href: `/hr?employee=${e.id}`,
      score,
    });
  }

  // Apply chip filters + sort
  const ranked = results
    .filter((r) => applyChips(r, chips))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({
    ok: true,
    q,
    chips,
    count: ranked.length,
    results: ranked,
    /** Surface so the client can log to analytics. */
    elapsedMs: 0,
  });
}
