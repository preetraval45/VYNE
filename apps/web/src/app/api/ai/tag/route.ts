import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { callClaudeJson } from "@/lib/ai/claude";

export const runtime = "edge";

interface TagPayload {
  title?: string;
  description?: string;
  knownTags?: string[];
}

interface TagResponse {
  category: string;
  tags: string[];
  priority: "urgent" | "high" | "medium" | "low";
  rationale: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Bug: ["bug", "broken", "error", "crash", "fail", "regress"],
  Performance: ["slow", "latency", "p95", "timeout", "memory"],
  Security: ["security", "cve", "auth", "leak", "token"],
  Feature: ["add", "new", "feature", "support", "introduce"],
  Documentation: ["docs", "readme", "guide", "tutorial"],
  Design: ["ui", "ux", "design", "figma", "redesign"],
  Infrastructure: ["deploy", "infra", "k8s", "aws", "terraform", "pipeline"],
  Customer: ["customer", "user", "churn", "support ticket"],
};

function heuristicTag(payload: TagPayload): TagResponse {
  const text =
    `${payload.title ?? ""} ${payload.description ?? ""}`.toLowerCase();
  let category = "Feature";
  for (const [c, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => text.includes(k))) {
      category = c;
      break;
    }
  }

  const tags: string[] = [];
  for (const [c, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => text.includes(k))) {
      tags.push(c.toLowerCase());
    }
  }
  if (text.includes("mobile")) tags.push("mobile");
  if (text.includes("api")) tags.push("api");
  if (text.includes("frontend") || text.includes("ui")) tags.push("frontend");
  if (text.includes("backend") || text.includes("server")) tags.push("backend");

  let priority: TagResponse["priority"] = "medium";
  if (
    text.includes("urgent") ||
    text.includes("blocker") ||
    text.includes("outage")
  ) {
    priority = "urgent";
  } else if (text.includes("important") || text.includes("soon")) {
    priority = "high";
  } else if (text.includes("nice to have") || text.includes("someday")) {
    priority = "low";
  }

  return {
    category,
    tags: Array.from(new Set(tags)).slice(0, 5),
    priority,
    rationale: `Pattern-matched on keywords: ${tags.slice(0, 3).join(", ") || "general"}.`,
  };
}

export async function POST(request: Request) {
  const __rl = await rateLimit({
    key: "tag",
    limit: 20,
    windowSec: 60,
    req: request,
  });
  if (!__rl.ok) return __rl.response!;
  const body = (await request.json().catch(() => ({}))) as TagPayload;
  if (!body.title?.trim() && !body.description?.trim()) {
    return NextResponse.json(
      { error: "title or description required" },
      { status: 400 },
    );
  }

  const userPrompt = `Issue title: ${body.title ?? "(none)"}\nDescription: ${body.description ?? "(none)"}\n\nKnown tag pool (prefer reusing): ${(body.knownTags ?? []).join(", ") || "(none yet)"}\n\nReturn JSON: { "category" (single best category from: Bug/Feature/Performance/Security/Documentation/Design/Infrastructure/Customer/Other), "tags" (array of 2-5 short lowercase tags), "priority" (urgent/high/medium/low), "rationale" (1 short sentence) }.`;

  const real = await callClaudeJson<TagResponse>(
    "You are VYNE's issue triage agent. Pick exactly one category, suggest concise lowercase tags, and only flag urgent if it would block real work.",
    userPrompt,
    { maxTokens: 400 },
  );

  return NextResponse.json({
    suggestion: real ?? heuristicTag(body),
    provider: real ? "claude" : "demo",
  });
}
