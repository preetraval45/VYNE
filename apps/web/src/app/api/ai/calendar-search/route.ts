import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface BusySlot {
  startsAt: string;
  endsAt: string;
  label?: string;
}

interface CalendarSearchRequest {
  /** Natural-language question, e.g. "When am I free with Sarah and Tony for 90 min next week?" */
  query: string;
  /** Per-attendee free/busy data already available locally */
  busyByAttendee: Record<string, BusySlot[]>;
  /** Time window to consider (default: next 7 days) */
  windowStart?: string;
  windowEnd?: string;
  /** Available attendee names so the LLM can pick the right ones from the question */
  knownAttendees?: Array<{ id: string; name: string }>;
  /** User's working hours in 24h, e.g. "9-18" */
  workingHours?: string;
}

interface CalendarSearchResponse {
  parsedDuration: number; // minutes
  parsedAttendeeIds: string[];
  parsedWindow?: { startsAt: string; endsAt: string };
  suggestedSlots: Array<{
    startsAt: string;
    endsAt: string;
    reason: string;
  }>;
  explanation: string;
  provider: "groq" | "claude" | "demo";
}

const SYSTEM = `You parse a natural-language calendar query and return structured JSON the calendar UI can render.

Rules:
- parsedDuration: requested duration in minutes (default 30).
- parsedAttendeeIds: attendee ids from the knownAttendees list whose names appear in the query.
- parsedWindow: ISO start/end of the time window the user implied ("next week", "tomorrow afternoon", etc.). Use the windowStart/windowEnd defaults if no window mentioned.
- suggestedSlots: up to 3 slots within the window where ALL parsed attendees are free (no overlap with their busy slots) AND inside business hours. Reason explains why this slot was picked.
- explanation: 1 short sentence the UI shows above the slot list.

Output JSON only — no prose, no fences.`;

export async function POST(req: Request) {
  let payload: CalendarSearchRequest;
  try {
    payload = (await req.json()) as CalendarSearchRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!payload.query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const now = new Date();
  const windowStart = payload.windowStart ?? now.toISOString();
  const windowEnd =
    payload.windowEnd ?? new Date(now.getTime() + 7 * 86400_000).toISOString();

  const userPrompt = `Query: "${payload.query}"
Now: ${new Date().toISOString()}
Window: ${windowStart} → ${windowEnd}
Working hours: ${payload.workingHours ?? "9-18"}

Known attendees:
${(payload.knownAttendees ?? []).map((a) => `- ${a.id}: ${a.name}`).join("\n")}

Busy slots (per attendee id):
${Object.entries(payload.busyByAttendee ?? {})
  .map(
    ([id, slots]) =>
      `${id}:\n` + slots.map((s) => `  ${s.startsAt} → ${s.endsAt}${s.label ? ` (${s.label})` : ""}`).join("\n"),
  )
  .join("\n")}

Parse and suggest slots. Return JSON.`;

  const json = await callLlamaJson<CalendarSearchResponse>(
    SYSTEM,
    userPrompt,
    { maxTokens: 700 },
  );

  if (json && Array.isArray(json.suggestedSlots)) {
    return NextResponse.json<CalendarSearchResponse>({
      parsedDuration: json.parsedDuration ?? 30,
      parsedAttendeeIds: json.parsedAttendeeIds ?? [],
      parsedWindow: json.parsedWindow,
      suggestedSlots: json.suggestedSlots.slice(0, 3),
      explanation:
        json.explanation ?? `Found ${json.suggestedSlots.length} possible slot${json.suggestedSlots.length === 1 ? "" : "s"}.`,
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  return NextResponse.json<CalendarSearchResponse>({
    parsedDuration: 30,
    parsedAttendeeIds: [],
    suggestedSlots: [],
    explanation:
      "AI calendar search needs GROQ_API_KEY to parse natural-language queries.",
    provider: "demo",
  });
}
