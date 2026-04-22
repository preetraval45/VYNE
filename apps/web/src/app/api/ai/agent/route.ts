import { callClaudeStream, isClaudeConfigured } from "@/lib/ai/claude";

export const runtime = "edge";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentPayload {
  messages?: AgentMessage[];
}

const SYSTEM_PROMPT = `You are Vyne AI — the conversational agent inside the VYNE company OS.

Capabilities:
- Answer questions about a user's projects, deals, contacts, invoices, products, and orders by reasoning over the workspace data they share.
- Suggest next actions, summarise threads, draft messages, and explain numbers.
- When you don't know, say so clearly. Do NOT invent data.

Tone:
- Concise and direct. Prefer short paragraphs and short bullet lists.
- Use markdown sparingly: bold for terms, code for IDs/numbers.
- Reference module pages with relative links like /crm or /projects/<id> so the UI can render them as clickable.

Constraints:
- Don't make up record IDs, dates, or dollar amounts.
- If the user asks you to do something destructive (delete, archive, send), describe what you would do and ask for confirmation.
- If the user asks for something only the human can do (sign a contract, call someone), say so.

If no workspace data is provided, answer generally and offer to look it up.`;

const FALLBACK = `I'm not connected to the AI service yet. To enable me, set the \`ANTHROPIC_API_KEY\` environment variable in Vercel:

1. Go to your Vercel project → Settings → Environment Variables
2. Add \`ANTHROPIC_API_KEY\` with your key from console.anthropic.com
3. Redeploy

Once that's set, I'll be able to answer questions about your projects, deals, contacts, invoices, and more — and stream responses back in real time.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AgentPayload;
  const messages = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content.trim(),
  );
  if (messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  if (!isClaudeConfigured()) {
    // Stream the fallback so the client uses the same code path.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(FALLBACK));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-vyne-ai": "demo",
      },
    });
  }

  const stream = await callClaudeStream(SYSTEM_PROMPT, messages, {
    quality: "balanced",
    maxTokens: 1024,
  });
  if (!stream) {
    return new Response("AI unavailable", { status: 503 });
  }

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-vyne-ai": "claude",
    },
  });
}
