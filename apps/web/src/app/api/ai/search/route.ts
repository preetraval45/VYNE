import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { callClaudeJson } from "@/lib/ai/claude";

export const runtime = "edge";

interface SearchPayload {
  query?: string;
  /** Optional pre-fetched corpus to rank — when present, AI re-ranks instead of inventing. */
  corpus?: Array<{
    id: string;
    module: string;
    title: string;
    snippet?: string;
    href?: string;
  }>;
}

interface SearchHit {
  id: string;
  module: string;
  title: string;
  snippet: string;
  href?: string;
  score: number;
  reason: string;
}

interface SearchResponse {
  answer: string;
  hits: SearchHit[];
}

const DEMO_CORPUS: Array<{
  id: string;
  module: string;
  title: string;
  snippet: string;
  href: string;
  keywords: string[];
}> = [
  {
    id: "inc-042",
    module: "incident",
    title: "AI response latency elevated",
    snippet:
      "p95 above 5s on /api/ai/agents/query — traced to upstream model provider, 46-min outage.",
    href: "/observe",
    keywords: ["outage", "latency", "ai", "incident", "april"],
  },
  {
    id: "doc-onboard",
    module: "doc",
    title: "New hire onboarding playbook",
    snippet:
      "Day 1: laptop, accounts, intro to the team. Day 2: read the Master Plan and ship a hotfix.",
    href: "/docs",
    keywords: ["onboarding", "new hire", "playbook"],
  },
  {
    id: "iss-ENG-43",
    module: "issue",
    title: "ENG-43 — Fix Secrets Manager IAM permission",
    snippet:
      "Production IAM role missing kms:Decrypt on staging-secrets KMS key. Blocking deploys.",
    href: "/projects",
    keywords: ["security", "iam", "deploy", "urgent"],
  },
  {
    id: "inv-2026-042",
    module: "invoice",
    title: "INV-2026-042 · Acme Corp · $1,920 paid",
    snippet: "Annual subscription renewal, paid via Stripe on 2026-04-13.",
    href: "/invoicing",
    keywords: ["invoice", "paid", "acme", "revenue"],
  },
  {
    id: "doc-april-outage",
    module: "doc",
    title: "Postmortem — April 10 AI outage",
    snippet:
      "Root cause: upstream Anthropic model degradation. Impact: 47 stuck orders, ~$12k at risk. Resolved in 46 min.",
    href: "/docs",
    keywords: ["outage", "postmortem", "april", "incident", "ai", "orders"],
  },
  {
    id: "iss-PWR-003",
    module: "issue",
    title: "PWR-003 — Stock critical",
    snippet:
      "38 units left of PWR-003 — Vyne AI flagged critical, supplier reorder PO drafted.",
    href: "/ops",
    keywords: ["stock", "inventory", "critical", "pwr-003"],
  },
  {
    id: "channel-alerts",
    module: "channel",
    title: "#alerts — Live incident channel",
    snippet:
      '17 messages today — most recent: "api-service v2.4.1 deployment failed".',
    href: "/chat",
    keywords: ["alerts", "channel", "deploy", "incident"],
  },
];

function heuristicSearch(query: string): SearchResponse {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = DEMO_CORPUS.map((c) => {
    const haystack =
      `${c.title} ${c.snippet} ${c.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += 30;
      if (c.keywords.includes(t)) score += 30;
    }
    if (haystack.includes(q)) score += 25;
    return { ...c, score };
  })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const top = scored[0];
  const answer = top
    ? `Found ${scored.length} relevant ${scored.length === 1 ? "result" : "results"}. Top match: ${top.title} (${top.module}).`
    : `No matches in the demo corpus for "${query}". Try terms like "outage", "stock", or "invoice".`;

  return {
    answer,
    hits: scored.map((c) => ({
      id: c.id,
      module: c.module,
      title: c.title,
      snippet: c.snippet,
      href: c.href,
      score: Math.min(100, c.score),
      reason: `Matched on: ${
        c.keywords
          .filter((k) => tokens.some((t) => k.includes(t)))
          .slice(0, 3)
          .join(", ") || "partial text"
      }.`,
    })),
  };
}

export async function POST(request: Request) {
  const __rl = await rateLimit({
    key: "search",
    limit: 20,
    windowSec: 60,
    req: request,
  });
  if (!__rl.ok) return __rl.response!;
  const body = (await request.json().catch(() => ({}))) as SearchPayload;
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const corpus =
    body.corpus && body.corpus.length > 0 ? body.corpus : DEMO_CORPUS;
  const userPrompt = `User asked: "${query}"\n\nCorpus:\n${corpus
    .map(
      (c, i) =>
        `${i + 1}. [${c.module}] ${c.title} — ${c.snippet ?? ""}${"href" in c && c.href ? ` (${c.href})` : ""}`,
    )
    .join(
      "\n",
    )}\n\nRe-rank the corpus by relevance, return JSON: { "answer" (1-2 sentence direct answer), "hits" (array of up to 5: { id, module, title, snippet, href, score (0-100), reason (≤100 chars) }) }`;

  const real = await callClaudeJson<SearchResponse>(
    "You are VYNE's cross-module search agent. Always cite the corpus — never invent results. Score by relevance, summarise the top answer in plain English.",
    userPrompt,
    { maxTokens: 900 },
  );

  if (real?.hits) {
    return NextResponse.json({ ...real, provider: "claude" });
  }
  return NextResponse.json({ ...heuristicSearch(query), provider: "demo" });
}
