import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

// /api/ai/computer-use (UI_UPGRADE_PLAN.md 5.5)
//
// Drives a sandboxed browser via Anthropic computer-use + Browserbase
// (or E2B). Implementation is feature-detected — without the right
// env vars, the route returns a structured 503 with the exact keys
// needed so the UI can render a "configure these to enable" panel.
//
// Real flow once configured:
//   1. POST /api/ai/computer-use with { task, sessionId? }
//   2. If no sessionId, create a Browserbase session + return its id
//   3. Take a screenshot, send it + the task to Anthropic Messages
//      with computer-use tools
//   4. Execute returned actions on the Browserbase session
//   5. Stream {action, screenshot} pairs back to the client
//
// This route ships the orchestration shell + provider check today;
// the actual driver loop is wired when both keys are set.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ComputerUseRequest {
  task?: string;
  sessionId?: string;
}

interface ProviderStatus {
  ok: boolean;
  missing: string[];
  configured: {
    anthropic: boolean;
    browserbase: boolean;
    e2b: boolean;
  };
}

function checkProviders(): ProviderStatus {
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const browserbase = Boolean(
    process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID,
  );
  const e2b = Boolean(process.env.E2B_API_KEY);
  const missing: string[] = [];
  if (!anthropic) missing.push("ANTHROPIC_API_KEY");
  if (!browserbase && !e2b) {
    missing.push("BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID (or E2B_API_KEY)");
  }
  return {
    ok: anthropic && (browserbase || e2b),
    missing,
    configured: { anthropic, browserbase, e2b },
  };
}

export async function GET() {
  return NextResponse.json(checkProviders());
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-computer-use",
    limit: 10,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const status = checkProviders();
  if (!status.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "computer-use not configured",
        missing: status.missing,
        hint: "Set the listed env vars in Vercel project settings then redeploy.",
      },
      { status: 503 },
    );
  }

  let body: ComputerUseRequest;
  try {
    body = (await req.json()) as ComputerUseRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const task = (body.task ?? "").trim();
  if (!task) {
    return NextResponse.json({ error: "task required" }, { status: 400 });
  }

  // Real driver: lazy-imported so the module is only loaded when
  // computer-use is actually invoked. Returns a session + the first
  // batch of actions; the client polls for more or uses SSE in a
  // follow-up release.
  try {
    const driver = await import("@/lib/ai/computerUseDriver").catch(() => null);
    if (!driver?.runTask) {
      return NextResponse.json(
        {
          ok: false,
          error: "driver pending",
          hint: "Computer-use orchestration is configured at the env level but the driver module isn't shipped yet. Drop the runTask implementation into lib/ai/computerUseDriver.ts.",
          status,
        },
        { status: 501 },
      );
    }
    const result = await driver.runTask({
      task,
      sessionId: body.sessionId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "driver failed",
      },
      { status: 502 },
    );
  }
}
