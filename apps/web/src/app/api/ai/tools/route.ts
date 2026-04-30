import { NextResponse } from "next/server";
import { rateLimit, requireAuth } from "@/lib/api/security";

export const runtime = "edge";

// ─── Vyne AI — Tool-calling layer ─────────────────────────────────
//
// The /ask route is read-only: it answers questions but cannot mutate
// workspace records. This route lets Vyne AI propose mutations as
// structured tool calls. The client executes them against Zustand
// stores (CRM, ops, projects, contacts, invoicing) and shows the
// result as a chip in the chat thread.
//
// Why round-trip through the model + a structured response instead of
// a parse-on-client? Two reasons:
//   1. The model has access to fixtures-aware nouns (deal stages,
//      task statuses, product SKUs) and converts free-text into the
//      right shape: "create a deal for Acme worth $50k in negotiation"
//      → { tool: "createDeal", args: { company: "Acme", value: 50000,
//         stage: "Negotiation" } }.
//   2. We need the same flow on mobile, so keeping intent extraction
//      on the server means we don't ship a parser to two clients.

export const TOOL_CATALOG = [
  {
    name: "createDeal",
    description: "Create a new CRM deal. Use when the user says 'add', 'create', or 'log' a deal/opportunity.",
    args: {
      company: "string (required)",
      contactName: "string (optional)",
      email: "string (optional)",
      stage: "Lead|Qualified|Proposal|Negotiation|Won|Lost (default Lead)",
      value: "number in USD (default 0)",
      probability: "number 0-100 (optional)",
      assignee: "string (optional)",
      nextAction: "string (optional)",
      notes: "string (optional)",
    },
  },
  {
    name: "updateDeal",
    description: "Update a deal's stage, value, assignee, next action, or notes. Look up by id from context.",
    args: { id: "string (required)", patch: "object with any deal fields" },
  },
  {
    name: "deleteDeal",
    description: "Delete a deal by id.",
    args: { id: "string (required)" },
  },
  {
    name: "createTask",
    description: "Create a task/issue in a project. Project is matched by name or identifier.",
    args: {
      projectName: "string (required) — match against existing project name or identifier",
      title: "string (required)",
      description: "string (optional)",
      status: "todo|in_progress|in_review|done (default todo)",
      priority: "low|medium|high|urgent (default medium)",
      assigneeName: "string (optional)",
      dueDate: "ISO date (optional)",
    },
  },
  {
    name: "updateTask",
    description: "Update task title, status, priority, assignee, due date, or description.",
    args: { id: "string (required)", patch: "object with any task fields" },
  },
  {
    name: "deleteTask",
    description: "Delete a task by id.",
    args: { id: "string (required)" },
  },
  {
    name: "createContact",
    description: "Add a new contact (person) with name, email, company, title.",
    args: {
      name: "string (required)",
      email: "string (optional)",
      phone: "string (optional)",
      company: "string (optional)",
      title: "string (optional)",
    },
  },
  {
    name: "updateContact",
    description: "Update a contact's fields.",
    args: { id: "string (required)", patch: "object" },
  },
  {
    name: "deleteContact",
    description: "Delete a contact by id.",
    args: { id: "string (required)" },
  },
  {
    name: "createProduct",
    description: "Add a product to inventory.",
    args: {
      name: "string (required)",
      sku: "string (optional)",
      price: "number (optional)",
      costPrice: "number (optional)",
      stockQty: "number (optional, default 0)",
      uom: "string (default 'pcs')",
      categoryName: "string (optional)",
    },
  },
  {
    name: "updateProduct",
    description: "Update a product.",
    args: { id: "string (required)", patch: "object" },
  },
  {
    name: "deleteProduct",
    description: "Delete a product by id.",
    args: { id: "string (required)" },
  },
  {
    name: "createInvoice",
    description: "Create an invoice. Customer is matched by name; if unknown, uses the literal string.",
    args: {
      customerName: "string (required)",
      total: "number (required)",
      status: "draft|sent|paid|overdue (default draft)",
      dueDate: "ISO date (optional)",
      notes: "string (optional)",
    },
  },
  {
    name: "updateInvoice",
    description: "Update an invoice (e.g., mark paid).",
    args: { id: "string (required)", patch: "object" },
  },
  {
    name: "deleteInvoice",
    description: "Delete an invoice by id.",
    args: { id: "string (required)" },
  },
  {
    name: "createSupplier",
    description: "Add a supplier.",
    args: {
      name: "string (required)",
      contactName: "string (optional)",
      email: "string (optional)",
      phone: "string (optional)",
      status: "active|inactive (default active)",
    },
  },
  {
    name: "createWorkOrder",
    description: "Create a manufacturing work order.",
    args: {
      productName: "string (required)",
      qtyToProduce: "number (required)",
      status: "planned|in_progress|done (default planned)",
      scheduledDate: "ISO date (optional)",
      dueDate: "ISO date (optional)",
    },
  },
];

interface ContextBundle {
  projects?: Array<{ id: string; name: string; identifier?: string }>;
  tasks?: Array<{ id: string; key?: string; title: string }>;
  deals?: Array<{ id: string; company: string; stage: string }>;
  contacts?: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; name: string; sku?: string }>;
  invoices?: Array<{ id: string; number?: string; customer?: string }>;
}

interface ToolsPayload {
  question: string;
  context?: ContextBundle;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  rationale?: string;
}

interface ToolsResponse {
  message: string;
  toolCalls: ToolCall[];
  provider: "vyne" | "local";
}

const SYSTEM_PROMPT = `You are Vyne AI's mutation layer. Convert the user's request into a JSON object describing one short reply message and zero or more tool calls.

Available tools (name + args shape):
${TOOL_CATALOG.map((t) => `- ${t.name}: ${t.description}\n    args: ${JSON.stringify(t.args)}`).join("\n")}

Rules:
1. Output ONLY valid JSON matching this exact shape:
   {"message":"<one short sentence the user will see>","toolCalls":[{"tool":"<name>","args":{...},"rationale":"<one short clause>"}]}
2. NEVER wrap in markdown fences. NEVER prepend prose. The first character of your response is { and the last is }.
3. If the request is informational (no mutation needed), return {"message":"...","toolCalls":[]}.
4. For update/delete tools, look up the target id from CONTEXT. If you can't find it, return an empty toolCalls array and explain in message.
5. Keep message under 120 chars. Past tense if the action is unambiguous ("Created the deal."), conditional otherwise ("Couldn't find a deal matching that.").
6. If the user asks for multiple actions in one message ("create three contacts"), emit multiple toolCalls.
7. For createTask, the projectName MUST match (case-insensitive) one of the projects in CONTEXT, or the call will fail.`;

function serializeContext(ctx: ContextBundle | undefined): string {
  if (!ctx) return "(empty)";
  const lines: string[] = [];
  if (ctx.projects?.length) lines.push(`PROJECTS: ${JSON.stringify(ctx.projects.slice(0, 30))}`);
  if (ctx.tasks?.length) lines.push(`TASKS: ${JSON.stringify(ctx.tasks.slice(0, 50))}`);
  if (ctx.deals?.length) lines.push(`DEALS: ${JSON.stringify(ctx.deals.slice(0, 50))}`);
  if (ctx.contacts?.length) lines.push(`CONTACTS: ${JSON.stringify(ctx.contacts.slice(0, 50))}`);
  if (ctx.products?.length) lines.push(`PRODUCTS: ${JSON.stringify(ctx.products.slice(0, 50))}`);
  if (ctx.invoices?.length) lines.push(`INVOICES: ${JSON.stringify(ctx.invoices.slice(0, 30))}`);
  return lines.join("\n");
}

function tryParse(raw: string): ToolsResponse | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Partial<ToolsResponse>;
    if (typeof obj.message !== "string") return null;
    if (!Array.isArray(obj.toolCalls)) return null;
    const valid = obj.toolCalls.every(
      (c) => c && typeof (c as ToolCall).tool === "string" && typeof (c as ToolCall).args === "object",
    );
    if (!valid) return null;
    return { message: obj.message, toolCalls: obj.toolCalls as ToolCall[], provider: "vyne" };
  } catch {
    return null;
  }
}

function localFallback(question: string): ToolsResponse {
  // Tiny heuristic so demo mode still does *something* useful for the
  // most common verbs: "create deal", "create task", "create contact".
  const q = question.toLowerCase();
  const dealM = q.match(/(?:create|add|new)\s+deal[^\n]*?(?:for\s+)?([a-z0-9 .&-]+?)(?:\s+(?:worth|at|for)\s+\$?(\d[\d,]*))?$/i);
  if (dealM) {
    const company = dealM[1].trim();
    const value = dealM[2] ? Number(dealM[2].replace(/,/g, "")) : 0;
    return {
      message: `Created a Lead deal for ${company}.`,
      toolCalls: [{ tool: "createDeal", args: { company, value, stage: "Lead" }, rationale: "matched 'create deal' phrase" }],
      provider: "local",
    };
  }
  return {
    message: "Vyne AI tool-calling needs a model key (GROQ_API_KEY or ANTHROPIC_API_KEY). Without one, only simple 'create deal' phrasing works.",
    toolCalls: [],
    provider: "local",
  };
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  const rl = await rateLimit({ key: "ai-tools", limit: 30, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let payload: ToolsPayload;
  try {
    payload = (await req.json()) as ToolsPayload;
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
    return NextResponse.json(localFallback(question));
  }

  const contextText = serializeContext(payload.context);
  const userPrompt = `CONTEXT\n-------\n${contextText}\n\nUSER REQUEST\n------------\n${question}`;
  const history = (payload.history ?? []).slice(-4).map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: "user" as const, content: userPrompt });

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 800,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = body.choices?.[0]?.message?.content?.trim();
        if (text) {
          const parsed = tryParse(text);
          if (parsed) return NextResponse.json(parsed);
        }
      }
    } catch {
      // fall through
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
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
        const text = body.content?.find((c) => c.type === "text")?.text?.trim();
        if (text) {
          const parsed = tryParse(text);
          if (parsed) return NextResponse.json(parsed);
        }
      }
    } catch {
      // fall through
    }
  }

  return NextResponse.json(localFallback(question));
}
