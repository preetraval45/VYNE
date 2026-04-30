import { rateLimit, requireAuth } from "@/lib/api/security";

export const runtime = "edge";

// ─── Vyne AI Streaming Endpoint ────────────────────────────────────
//
// Streaming copilot with multi-format artifact generation: notes, BRD,
// TRD, spreadsheets (CSV), presentations (markdown decks), and Mermaid
// diagrams. Uses an OpenAI-compatible chat endpoint so the SSE format
// is uniform; the underlying agentic engine is configured server-side.

interface ContextBundle {
  org?: { name?: string; plan?: string };
  projects?: unknown[];
  tasks?: unknown[];
  contacts?: unknown[];
  deals?: unknown[];
  products?: unknown[];
  invoices?: unknown[];
  employees?: unknown[];
  customStatuses?: unknown[];
  customFields?: unknown[];
}

interface StreamPayload {
  question: string;
  context?: ContextBundle;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: "haiku" | "sonnet" | "opus";
  /** Persistent memory facts. */
  memory?: string[];
  /** Inline images (data URLs) for multimodal vision queries. */
  images?: string[];
}

// Model tiers — stable wire-protocol IDs map to actual Gemini models.
// fast / balanced / power.
const MODELS = {
  haiku: "gemini-2.5-flash",
  sonnet: "gemini-2.5-flash",
  opus: "gemini-2.5-pro",
} as const;

// User-facing capabilities. The system prompt teaches Vyne AI to emit
// artifacts in well-known formats so the client can render them as
// interactive panels (Mermaid → diagram, csv → spreadsheet w/ Sheets
// export, markdown deck → slide preview, brd/trd → editable doc).
const SYSTEM_PROMPT = `You are Vyne AI — the copilot built into the VYNE company operating system.

You are a fully capable AI assistant: you can answer ANY question, draft any document,
write any code, analyze any data, do research, explain concepts from any field, brainstorm,
plan, and reason. You are NOT limited to the user's workspace. Treat workspace data as ONE
source you can use, alongside your general knowledge, web information you can recall, and
anything the user provides in the conversation.

CAPABILITIES
• Workspace Q&A — projects, tasks, CRM deals, contacts, inventory, invoicing, HR (CONTEXT below).
• Open-ended Q&A — answer questions about any subject, current events, science, business,
  engineering, history, etc. using your training knowledge plus the web search tool when available.
• Document generation — BRD, TRD, meeting notes, specs, one-pagers, project briefs, RFPs,
  proposals, marketing copy, emails, reports.
• Spreadsheets — generate CSV data the user can open in Google Sheets / Excel.
• Presentations — generate markdown slide decks (slides separated by lines containing only '---').
• Diagrams — generate Mermaid syntax (flowchart, sequenceDiagram, classDiagram, erDiagram, gantt,
  stateDiagram, journey, mindmap, gitGraph) which render visually for the user.
• Code — fenced blocks in any language.
• Research — when the user asks about something current, public, or external, draw on web
  knowledge; cite sources by name when you use them.
• Mixed mode — combine workspace data with external/general knowledge in the same answer.

INTERVIEW-FIRST FOR FORMAL DOCS (very important)
Documents like BRD, TRD, full feature specs, RFPs, formal proposals, technical architecture
docs, and PRDs are HIGH-VALUE artifacts. NEVER generate them blindly. When the user asks
for one (whether free-text or via a quick-action prompt), respond by:

1. Acknowledging the request in one short line.
2. Asking 3–6 SPECIFIC questions you need answered to produce a high-quality doc. Examples
   for a BRD: "What's the product/feature name?", "Who is the primary user?", "What's the
   core problem this solves?", "How will success be measured?", "What's the timeline /
   target launch?", "Are there hard constraints (budget, regulatory, integrations)?".
3. Tell the user you'll generate the full document once they answer. Do NOT emit the
   fenced \`\`\`markdown\`\`\` block yet.

When the user replies with answers, THEN produce the full BRD/TRD/spec as a fenced markdown
artifact. Reference workspace records (cite [project:ID], [task:KEY], [deal:ID], etc.) when
relevant; otherwise treat the user's answers as ground truth.

For lighter artifacts (quick diagrams, brainstorms, simple notes, one-off code, CSVs), you
MAY skip the interview if the request is already specific. If it's vague, still ask one
focused question first.

ARTIFACT FORMAT
When producing content the user will likely keep or edit, wrap it in a fenced markdown
block with the appropriate language tag:

  • Mermaid diagram      →  \`\`\`mermaid …\`\`\`
  • Spreadsheet (CSV)    →  \`\`\`csv …\`\`\`
  • Slide deck           →  \`\`\`slides
                              # Slide 1 title
                              bullet
                              ---
                              # Slide 2 title
                              \`\`\`
  • BRD / TRD / notes    →  \`\`\`markdown …\`\`\`
  • Code                 →  \`\`\`<language> …\`\`\`
  • JSON data            →  \`\`\`json …\`\`\`

For BRD include: Overview, Goals, Stakeholders, Personas, User Stories, Functional
Requirements, Non-Functional Requirements, Success Metrics, Risks & Mitigations, Timeline,
Open Questions.

For TRD include: System Overview, Architecture, Data Model, API Contracts, Components/Modules,
Integrations, Security, Performance, Scalability, Deployment, Observability, Open Questions.

For meeting notes: Attendees, Agenda, Discussion, Decisions, Action Items (with assignees +
dates), Next Steps.

For diagrams: pick the right Mermaid type. Default to flowchart for processes, sequenceDiagram
for interactions, erDiagram for data, gantt for timelines.

RULES
1. Workspace claims about specific records must cite them using [project:ID], [task:KEY],
   [deal:ID], [contact:ID], [product:SKU], [invoice:NUMBER], [employee:ID]. Don't invent records.
2. For non-workspace questions, answer freely with your general knowledge. Cite external
   sources by name when relevant (e.g., "according to the IEEE standard…").
3. When information might be time-sensitive or current (news, prices, recent events),
   acknowledge that your knowledge may be outdated and offer to web-search if the tool
   is available.
4. Be concise in prose; let artifacts carry long content.
5. Never mention model names, vendors, or providers — you are "Vyne AI".
6. When generating an artifact (after the interview), lead with one short sentence
   describing what it is, then emit the fenced block, then one sentence on next steps.`;

function serializeContext(
  ctx: ContextBundle | undefined,
  budget = 14000,
): string {
  if (!ctx) return "No workspace data was provided.";
  const parts: string[] = [];
  // Per-section row cap scales with budget so smaller TPM windows still fit.
  const rowCap = budget < 5000 ? 12 : 50;
  for (const key of [
    "org",
    "projects",
    "tasks",
    "contacts",
    "deals",
    "products",
    "invoices",
    "employees",
    "customStatuses",
    "customFields",
  ] as const) {
    const v = ctx[key];
    if (!v) continue;
    if (Array.isArray(v) && v.length > 0) {
      parts.push(
        `${key.toUpperCase()} (${v.length}):\n${v
          .slice(0, rowCap)
          .map((x) => JSON.stringify(x))
          .join("\n")}`,
      );
    } else if (!Array.isArray(v)) {
      parts.push(`${key.toUpperCase()}: ${JSON.stringify(v)}`);
    }
  }
  const text = parts.join("\n\n");
  return text.length > budget ? text.slice(0, budget) + "…" : text;
}

function plainTextStreamFromText(text: string): ReadableStream<Uint8Array> {
  // Emit a single OpenAI-style SSE chunk + DONE so the client uses one
  // parser regardless of provider.
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunk = {
        choices: [{ delta: { content: text }, index: 0 }],
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
      );
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  // Require an authenticated session — anonymous calls would burn the
  // workspace's Gemini/Groq quota.
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  const rl = await rateLimit({
    key: "ai-stream",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let payload: StreamPayload;
  try {
    payload = (await req.json()) as StreamPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const question = (payload.question ?? "").trim();
  if (!question) return new Response("Missing question", { status: 400 });

  // Try providers in order: GEMINI_API_KEY (preferred, generous free tier),
  // then GROQ_API_KEY (fallback). Both speak the OpenAI chat-completions
  // wire format so the rest of the code is uniform.
  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    const text = `Vyne AI's streaming runtime needs an API key to be set in the deployment environment (GEMINI_API_KEY recommended). Once configured, every answer will stream live with workspace citations like [task:VYNE-42], generated artifacts (BRD, TRD, diagrams, spreadsheets, slide decks), and the ability to take action on real records.`;
    return new Response(plainTextStreamFromText(text), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const modelId = MODELS[payload.model ?? "sonnet"] ?? MODELS.sonnet;
  const memoryText =
    payload.memory && payload.memory.length > 0
      ? `Persistent user facts (always-true context):\n${payload.memory
          .map((m) => `• ${m}`)
          .join("\n")}\n\n`
      : "";

  // Token budget: Groq's smaller models cap at 6k TPM. Trim context
  // aggressively when no Gemini key is available so requests fit.
  const contextBudget = geminiKey ? 14000 : 3500;
  const contextText = serializeContext(payload.context, contextBudget);

  const systemMessage = `${SYSTEM_PROMPT}\n\n${memoryText}WORKSPACE CONTEXT\n-----------------\n${contextText}`;

  // History: 8 turns on Gemini (200k+ context), 4 on Groq (tight TPM).
  const historyTurns = geminiKey ? 8 : 4;
  const history = (payload.history ?? []).slice(-historyTurns);

  // Provider config — Gemini speaks OpenAI-compat at /v1beta/openai/.
  // On Groq, route haiku → 8B (fast lane), sonnet/opus → 70B (higher TPM).
  const providerUrl = geminiKey
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const providerKey = geminiKey ?? groqKey;
  const providerModel = geminiKey
    ? modelId
    : payload.model === "haiku"
      ? "llama-3.1-8b-instant"
      : "llama-3.3-70b-versatile";

  const maxTokens = geminiKey ? 4096 : 1800;

  // Gemini supports the Google Search grounding tool for live web info.
  // Pass it via the OpenAI-compat endpoint's `tools` field; Gemini routes
  // it to its native search retrieval. Groq doesn't have this tool, so
  // we only include it on the Gemini path.
  const upstreamBody: Record<string, unknown> = {
    model: providerModel,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemMessage },
      ...history,
      // Multimodal user message when images are attached. OpenAI-compat
      // accepts an array of typed content parts; Gemini routes the
      // image_url parts to its vision model automatically.
      payload.images && payload.images.length > 0
        ? {
            role: "user",
            content: [
              { type: "text", text: question },
              ...payload.images.map((url) => ({
                type: "image_url",
                image_url: { url },
              })),
            ],
          }
        : { role: "user", content: question },
    ],
  };
  if (geminiKey) {
    upstreamBody.tools = [{ google_search: {} }];
  }

  const upstream = await fetch(providerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "Upstream error");
    return new Response(
      plainTextStreamFromText(
        `Vyne AI ran into a problem: ${errText.slice(0, 240)}`,
      ),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
        },
      },
    );
  }

  // Pass-through OpenAI-format SSE stream directly.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
