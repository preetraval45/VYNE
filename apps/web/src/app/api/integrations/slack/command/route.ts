import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/integrations/slack/command
 * Receives Slack slash commands like `/vyne deal Acme`. Slack posts a
 * `application/x-www-form-urlencoded` body; we parse it, route the
 * command, and return a Slack-shaped JSON response (text + blocks).
 *
 * Configure in Slack:
 *   - Command:        /vyne
 *   - Request URL:    https://vyne.vercel.app/api/integrations/slack/command
 *   - Short description: Search VYNE workspace
 *   - Usage hint:     [find|deal|task|new] <query>
 *   - Signing secret: SLACK_SIGNING_SECRET (env var, required for verification)
 *
 * Verification: Slack signs every request with X-Slack-Signature; we
 * recompute the HMAC and reject mismatches when SLACK_SIGNING_SECRET
 * is configured. When the secret is missing (demo mode) the route
 * accepts unsigned posts so local testing keeps working.
 */

export const runtime = "edge";

interface SlackCommandPayload {
  team_id?: string;
  channel_id?: string;
  user_id?: string;
  user_name?: string;
  command?: string;
  text?: string;
  response_url?: string;
}

async function verifySlackSignature(
  raw: string,
  ts: string | null,
  sig: string | null,
): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // demo mode
  if (!ts || !sig) return false;
  const tsAge = Date.now() / 1000 - Number(ts);
  if (Number.isNaN(tsAge) || Math.abs(tsAge) > 60 * 5) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(`v0:${ts}:${raw}`),
    );
    const expected =
      "v0=" +
      Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return expected === sig;
  } catch {
    return false;
  }
}

function parsePayload(raw: string): SlackCommandPayload {
  const out: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v ?? "").replace(/\+/g, " ");
  }
  return out as SlackCommandPayload;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "slack-command",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const raw = await req.text();
  const ts = req.headers.get("x-slack-request-timestamp");
  const sig = req.headers.get("x-slack-signature");
  const verified = await verifySlackSignature(raw, ts, sig);
  if (!verified) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 },
    );
  }

  const body = parsePayload(raw);
  const text = (body.text ?? "").trim();
  const [verb, ...rest] = text.split(/\s+/);
  const query = rest.join(" ");

  // Route — minimal demo handler. Production extends with deal lookup,
  // task creation, etc. via the existing tool executor.
  let response: { text: string; response_type?: "ephemeral" | "in_channel" };
  switch ((verb ?? "find").toLowerCase()) {
    case "find":
    case "search":
      response = {
        response_type: "ephemeral",
        text: `🔍 *VYNE search:* "${query || "(no query)"}"\nOpen: https://vyne.vercel.app/?q=${encodeURIComponent(query)}`,
      };
      break;
    case "deal":
      response = {
        response_type: "ephemeral",
        text: `💼 Deal lookup: "${query}". https://vyne.vercel.app/crm?q=${encodeURIComponent(query)}`,
      };
      break;
    case "task":
      response = {
        response_type: "ephemeral",
        text: `✅ Task lookup: "${query}". https://vyne.vercel.app/projects?q=${encodeURIComponent(query)}`,
      };
      break;
    case "new":
      response = {
        response_type: "ephemeral",
        text: `➕ Open the new-record form: https://vyne.vercel.app/?action=new&q=${encodeURIComponent(query)}`,
      };
      break;
    default:
      response = {
        response_type: "ephemeral",
        text: "Try `/vyne find <query>`, `/vyne deal <name>`, `/vyne task <id>`, or `/vyne new <type>`.",
      };
  }

  return NextResponse.json(response);
}
