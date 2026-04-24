import { NextResponse } from "next/server";

export const runtime = "edge";

// ─── Vyne AI Morning Brief ────────────────────────────────────────
//
// Daily founder-style briefing. Grounded in three inputs:
//   - current workspace snapshot (projects, tasks, CRM, inventory, etc.)
//   - last N Q&A sessions the user had with Vyne AI
//   - the active weekly Compass intention (if set)
//
// Output is a short, structured brief: ONE thing to focus on,
// up to three watch-outs, and a reflection question for tonight.
// Citations use the same [kind:id] format as /api/ai/ask so the
// client can render them as clickable record links.

interface Context {
  projects?: Array<{ id: string; name: string; status?: string; identifier?: string }>;
  tasks?: Array<{
    id: string;
    key?: string;
    title: string;
    status: string;
    priority: string;
    assigneeName?: string | null;
    dueDate?: string | null;
    projectName?: string;
  }>;
  deals?: Array<{ id: string; company: string; stage: string; value: number; nextAction?: string }>;
  products?: Array<{ id: string; name: string; sku?: string; stock?: number; status?: string }>;
  invoices?: Array<{ id: string; number?: string; customer?: string; status?: string; total?: number; dueDate?: string }>;
}

interface RecentSession {
  createdAt: string;
  question: string;
  answer: string;
}

interface Payload {
  context?: Context;
  recentSessions?: RecentSession[];
  compass?: string;
}

interface BriefResponse {
  summary: string;
  citations: Array<{ kind: string; id: string; label: string }>;
  provider: "vyne" | "local";
}

const SYSTEM = `You are Vyne AI generating a founder's morning brief. The user hired
you to cut through the noise of their workspace and deliver ONE focused
recommendation for today plus a short reflection prompt for tonight.

Output format (markdown-free plain text):
1. Greeting + the single most important thing to do today, tied to real
   records. One line. Start with an emoji if it aids scannability.
2. "Watch-outs:" then 1–3 bullet lines of risks or stale items (overdue
   tasks, stalled deals, low inventory, unpaid invoices). Each line must
   cite at least one record like [task:VYNE-42].
3. "Tonight:" then a single reflective question seeded by the weekly
   compass (if present) or by the most recent session.

Rules:
- Never fabricate records. If CONTEXT is empty, say so plainly and keep
  the brief to a compass-anchored question.
- Keep the whole brief under 140 words.
- Never mention other AI providers or model names. You are Vyne AI.`;

function serialize(payload: Payload): string {
  const parts: string[] = [];
  if (payload.compass) parts.push(`WEEKLY COMPASS INTENTION: "${payload.compass}"`);
  if (payload.recentSessions?.length) {
    parts.push(
      `RECENT Q&A (most recent first, last ${payload.recentSessions.length}):\n` +
        payload.recentSessions
          .slice(0, 6)
          .map(
            (s) =>
              `• ${new Date(s.createdAt).toLocaleDateString()} — Q: ${s.question.slice(0, 160)} / A: ${s.answer.slice(0, 220)}`,
          )
          .join("\n"),
    );
  }
  const ctx = payload.context;
  if (ctx?.projects?.length) parts.push(`PROJECTS (${ctx.projects.length}): ${JSON.stringify(ctx.projects.slice(0, 20))}`);
  if (ctx?.tasks?.length) parts.push(`TASKS (${ctx.tasks.length}): ${JSON.stringify(ctx.tasks.slice(0, 60))}`);
  if (ctx?.deals?.length) parts.push(`DEALS (${ctx.deals.length}): ${JSON.stringify(ctx.deals.slice(0, 20))}`);
  if (ctx?.products?.length) parts.push(`PRODUCTS (${ctx.products.length}): ${JSON.stringify(ctx.products.slice(0, 20))}`);
  if (ctx?.invoices?.length) parts.push(`INVOICES (${ctx.invoices.length}): ${JSON.stringify(ctx.invoices.slice(0, 20))}`);
  return parts.join("\n\n");
}

function extractCitations(text: string): BriefResponse["citations"] {
  const re = /\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\]/g;
  const seen = new Set<string>();
  const out: BriefResponse["citations"] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: m[1], id: m[2], label: m[0] });
  }
  return out;
}

function local(payload: Payload): BriefResponse {
  const ctx = payload.context ?? {};
  const overdue =
    ctx.tasks?.filter(
      (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date(),
    ) ?? [];
  const stalledDeals = ctx.deals?.filter((d) => d.stage === "Negotiation" || d.stage === "Proposal") ?? [];

  const lines: string[] = [];
  lines.push(
    `☀️ Good morning. ${
      payload.compass
        ? `Your compass this week: "${payload.compass}". `
        : ""
    }Focus today on closing loops before opening new ones.`,
  );
  lines.push("");
  lines.push("Watch-outs:");
  if (overdue.length > 0) {
    lines.push(
      `• ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} — e.g. [task:${overdue[0].key ?? overdue[0].id}] "${overdue[0].title.slice(0, 60)}".`,
    );
  }
  if (stalledDeals.length > 0) {
    lines.push(
      `• ${stalledDeals.length} deal${stalledDeals.length === 1 ? "" : "s"} in Proposal/Negotiation — nudge [deal:${stalledDeals[0].id}] (${stalledDeals[0].company}).`,
    );
  }
  const lowStock = ctx.products?.filter((p) => p.status === "low_stock" || p.status === "out_of_stock") ?? [];
  if (lowStock.length > 0) {
    lines.push(`• ${lowStock.length} product${lowStock.length === 1 ? "" : "s"} low on stock — reorder [product:${lowStock[0].sku ?? lowStock[0].id}].`);
  }
  if (overdue.length === 0 && stalledDeals.length === 0 && lowStock.length === 0) {
    lines.push("• Nothing urgent — a rare clear runway. Spend it on one deep-work block.");
  }
  lines.push("");
  lines.push(
    `Tonight: ${
      payload.compass
        ? `What did I do today that moved me toward "${payload.compass}"?`
        : "What was the most honest thing you learned today?"
    }`,
  );

  const summary = lines.join("\n");
  return { summary, citations: extractCitations(summary), provider: "local" };
}

export async function POST(req: Request) {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json(local(payload));

  const userPrompt = serialize(payload) || "No workspace data yet — make the brief compass-anchored.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) return NextResponse.json(local(payload));
    const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = body.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) return NextResponse.json(local(payload));
    return NextResponse.json({
      summary: text,
      citations: extractCitations(text),
      provider: "vyne",
    } satisfies BriefResponse);
  } catch {
    return NextResponse.json(local(payload));
  }
}
