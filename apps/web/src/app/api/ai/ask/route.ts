import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";

// ─── Vyne AI ───────────────────────────────────────────────────────
//
// This endpoint powers the Vyne-branded assistant. It is NOT a thin
// wrapper around a public chatbot: it is a retrieval-augmented answer
// layer that grounds every reply in the caller's actual workspace
// (projects, tasks, CRM deals, contacts, inventory, invoicing, HR…).
//
// Flow per request:
//   1. Client gathers a structured snapshot of the user's stores and
//      sends it as `context` alongside the question.
//   2. This route composes a strict system prompt that forbids the
//      model from answering anything not supported by the context,
//      cites record ids in the answer, and returns a friendly refusal
//      when the workspace has no data on the question.
//   3. Claude is used as the underlying inference engine (same
//      anthropic-version as the rest of /api/ai/*) — but the response
//      is always attributed to "Vyne AI" in the client UI. If
//      ANTHROPIC_API_KEY is unset we fall back to a deterministic
//      local answer so the feature works in demo mode.

interface ContextBundle {
  org?: { name?: string; plan?: string };
  projects?: Array<{
    id: string;
    name: string;
    identifier?: string;
    status?: string;
    leadName?: string;
    memberCount?: number;
    taskCount?: number;
    doneTaskCount?: number;
    updatedAt?: string;
  }>;
  tasks?: Array<{
    id: string;
    key?: string;
    title: string;
    projectName?: string;
    status: string;
    priority: string;
    assigneeName?: string | null;
    dueDate?: string | null;
    tags?: string[];
  }>;
  contacts?: Array<{
    id: string;
    name: string;
    email?: string;
    company?: string;
  }>;
  deals?: Array<{
    id: string;
    company: string;
    stage: string;
    value: number;
    probability?: number;
    assignee?: string;
    nextAction?: string;
  }>;
  products?: Array<{
    id: string;
    name: string;
    sku?: string;
    stock?: number;
    price?: number;
    status?: string;
  }>;
  invoices?: Array<{
    id: string;
    number?: string;
    customer?: string;
    status?: string;
    total?: number;
    dueDate?: string;
  }>;
  employees?: Array<{
    id: string;
    name: string;
    role?: string;
    department?: string;
  }>;
  customStatuses?: Array<{ module: string; id: string; label: string }>;
  customFields?: Array<{
    module: string;
    id: string;
    label: string;
    type: string;
  }>;
}

interface AskPayload {
  question: string;
  context?: ContextBundle;
  /** Prior messages for multi-turn continuity. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface AskResponse {
  answer: string;
  citations: Array<{ kind: string; id: string; label: string }>;
  /** "vyne" when Claude answered against workspace data, "local" for demo fallback. */
  provider: "vyne" | "local";
}

const SYSTEM_PROMPT = `You are Vyne AI, the built-in assistant for the VYNE company operating system.
You answer business questions about THIS user's workspace only — projects, tasks, CRM deals,
contacts, inventory, invoicing, HR and related records provided in the CONTEXT block.

Rules (non-negotiable):
1. Ground every claim in the CONTEXT. If the CONTEXT does not contain relevant records, say so
   plainly — do not invent data, dates, or names.
2. When referencing a record, cite its identifier in the form [project:ID], [task:KEY],
   [deal:ID], [contact:ID], [product:SKU], [invoice:NUMBER], or [employee:ID]. One or more
   citations per factual sentence.
3. Keep answers tight: 1–2 short paragraphs or a concise bullet list. Never pad.
4. When the user asks "what should I do next?" propose concrete next actions tied to real
   records already in CONTEXT (e.g. "Nudge the 'Acme expansion' deal — it has been in
   Negotiation for 14 days").
5. Never mention other AI providers or model names. You are "Vyne AI".
6. If a question is out of scope (general world knowledge unrelated to this workspace),
   briefly explain that Vyne AI answers workspace questions and suggest two concrete
   workspace questions the user could ask instead.`;

function truncate(s: string, max = 4000) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function serializeContext(ctx: ContextBundle | undefined): string {
  if (!ctx) return "No workspace data was provided.";
  const parts: string[] = [];
  if (ctx.org) parts.push(`ORG: ${JSON.stringify(ctx.org)}`);
  if (ctx.projects?.length)
    parts.push(
      `PROJECTS (${ctx.projects.length}):\n${ctx.projects.map((p) => JSON.stringify(p)).join("\n")}`,
    );
  if (ctx.tasks?.length)
    parts.push(
      `TASKS (${ctx.tasks.length}):\n${ctx.tasks.map((t) => JSON.stringify(t)).join("\n")}`,
    );
  if (ctx.deals?.length)
    parts.push(
      `DEALS (${ctx.deals.length}):\n${ctx.deals.map((d) => JSON.stringify(d)).join("\n")}`,
    );
  if (ctx.contacts?.length)
    parts.push(
      `CONTACTS (${ctx.contacts.length}):\n${ctx.contacts.map((c) => JSON.stringify(c)).join("\n")}`,
    );
  if (ctx.products?.length)
    parts.push(
      `PRODUCTS (${ctx.products.length}):\n${ctx.products.map((p) => JSON.stringify(p)).join("\n")}`,
    );
  if (ctx.invoices?.length)
    parts.push(
      `INVOICES (${ctx.invoices.length}):\n${ctx.invoices.map((i) => JSON.stringify(i)).join("\n")}`,
    );
  if (ctx.employees?.length)
    parts.push(
      `EMPLOYEES (${ctx.employees.length}):\n${ctx.employees.map((e) => JSON.stringify(e)).join("\n")}`,
    );
  if (ctx.customStatuses?.length)
    parts.push(`CUSTOM STATUSES: ${JSON.stringify(ctx.customStatuses)}`);
  if (ctx.customFields?.length)
    parts.push(`CUSTOM FIELDS: ${JSON.stringify(ctx.customFields)}`);
  return truncate(parts.join("\n\n"), 12_000);
}

function extractCitations(answer: string): AskResponse["citations"] {
  const re =
    /\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\]/g;
  const seen = new Set<string>();
  const out: AskResponse["citations"] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    const kind = m[1];
    const id = m[2];
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, id, label: m[0] });
  }
  return out;
}

function localFallback(
  question: string,
  ctx: ContextBundle | undefined,
): AskResponse {
  // No key — give a deterministic, honest answer that summarises the
  // workspace so the demo experience is still useful.
  const projectCount = ctx?.projects?.length ?? 0;
  const taskCount = ctx?.tasks?.length ?? 0;
  const openTasks = ctx?.tasks?.filter((t) => t.status !== "done").length ?? 0;
  const overdue =
    ctx?.tasks?.filter(
      (t) =>
        t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date(),
    ).length ?? 0;
  const dealCount = ctx?.deals?.length ?? 0;
  const dealValue = ctx?.deals?.reduce((a, d) => a + (d.value ?? 0), 0) ?? 0;

  const summary = [
    `You asked: "${truncate(question, 200)}"`,
    "",
    `Vyne AI runs against your workspace data. Your current snapshot:`,
    `• ${projectCount} projects, ${taskCount} tasks (${openTasks} open, ${overdue} overdue)`,
    `• ${dealCount} CRM deals totalling $${dealValue.toLocaleString()}`,
    "",
    "To get grounded answers (e.g. 'which deals are stalled?', 'what tasks are overdue for Sarah?'), set `ANTHROPIC_API_KEY` in the Vercel project env. Vyne AI will then reply against your real records with citations like [task:VYNE-42].",
  ].join("\n");

  return { answer: summary, citations: [], provider: "local" };
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "ai-ask", limit: 20, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let payload: AskPayload;
  try {
    payload = (await req.json()) as AskPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const question = (payload.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!claudeKey && !groqKey) {
    return NextResponse.json(localFallback(question, payload.context));
  }

  const contextText = serializeContext(payload.context);
  const userPrompt = `CONTEXT\n-------\n${contextText}\n\nQUESTION\n--------\n${question}`;

  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of payload.history?.slice(-6) ?? []) {
    history.push({ role: m.role, content: m.content });
  }
  history.push({ role: "user", content: userPrompt });

  // Llama (Groq) first — free + fast — fall back to Claude only if a key
  // is configured, otherwise to the deterministic local answer.
  if (groqKey) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 700,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
          }),
        },
      );
      if (res.ok) {
        const body = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = body.choices?.[0]?.message?.content?.trim();
        if (text) {
          return NextResponse.json({
            answer: text,
            citations: extractCitations(text),
            provider: "vyne",
          } satisfies AskResponse);
        }
      }
    } catch {
      // fall through to Claude / local
    }
  }

  if (claudeKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = body.content?.find((c) => c.type === "text")?.text?.trim();
        if (text) {
          return NextResponse.json({
            answer: text,
            citations: extractCitations(text),
            provider: "vyne",
          } satisfies AskResponse);
        }
      }
    } catch {
      // fall through to local
    }
  }

  return NextResponse.json(localFallback(question, payload.context));
}
