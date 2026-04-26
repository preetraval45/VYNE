import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { callClaudeJson } from "@/lib/ai/claude";

export const runtime = "edge";

interface NextActionsPayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  recentComments?: string[];
}

export interface NextAction {
  id: string;
  label: string;
  rationale: string;
  type: "comment" | "assign" | "status" | "meet" | "doc" | "notify";
}

interface NextActionsResponse {
  actions: NextAction[];
}

function fallback(payload: NextActionsPayload): NextActionsResponse {
  const status = (payload.status ?? "todo").toLowerCase();
  const acts: NextAction[] = [];

  if (status.includes("todo") || status.includes("backlog")) {
    acts.push({
      id: "a1",
      type: "assign",
      label: payload.assignee
        ? "Confirm assignee is available"
        : "Assign an owner",
      rationale:
        "Issue is unstarted — without an owner it will sit. Pick someone with capacity this sprint.",
    });
    acts.push({
      id: "a2",
      type: "comment",
      label: "Ask the requester for acceptance criteria",
      rationale:
        'Clear "done" definition prevents scope creep before work begins.',
    });
  }

  if (status.includes("progress") || status.includes("review")) {
    acts.push({
      id: "a3",
      type: "comment",
      label: "Post a status update in the thread",
      rationale: "Last comment is over 24h old — stakeholders are asking.",
    });
    acts.push({
      id: "a4",
      type: "meet",
      label: "Pair with a reviewer for 15 min",
      rationale: "Faster than async ping-pong on this kind of change.",
    });
  }

  if ((payload.priority ?? "").toLowerCase().includes("urgent")) {
    acts.push({
      id: "a5",
      type: "notify",
      label: "Notify #incidents and the on-call",
      rationale:
        "Urgent flag set — surface visibility beyond the issue thread.",
    });
  }

  if (acts.length === 0) {
    acts.push({
      id: "a-default",
      type: "doc",
      label: "Link the spec doc",
      rationale: "Future you (or a reviewer) will thank you.",
    });
  }

  return { actions: acts.slice(0, 4) };
}

export async function POST(request: Request) {
  const __rl = await rateLimit({
    key: "next-actions",
    limit: 20,
    windowSec: 60,
    req: request,
  });
  if (!__rl.ok) return __rl.response!;
  const body = (await request.json().catch(() => ({}))) as NextActionsPayload;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const userPrompt = `Issue:\nTitle: ${body.title}\nDescription: ${body.description ?? "(none)"}\nStatus: ${body.status ?? "unknown"}\nPriority: ${body.priority ?? "medium"}\nAssignee: ${body.assignee ?? "unassigned"}\nRecent comments: ${(body.recentComments ?? []).slice(-3).join(" / ") || "(none)"}\n\nReturn JSON: { "actions": [up to 4 of { "id" (short slug), "type" (one of: comment | assign | status | meet | doc | notify), "label" (imperative, ≤60 chars), "rationale" (1 short sentence why) }] }. Order by impact.`;

  const real = await callClaudeJson<NextActionsResponse>(
    "You suggest next concrete actions for an issue. Be specific, opinionated, and lean toward unblocking work — not adding meetings unless they truly help.",
    userPrompt,
    { maxTokens: 600 },
  );

  return NextResponse.json({
    suggestion: real ?? fallback(body),
    provider: real ? "claude" : "demo",
  });
}
