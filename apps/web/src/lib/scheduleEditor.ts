"use client";

import {
  CADENCE_LABELS,
  type ScheduleCadence,
  type ScheduleDelivery,
} from "@/lib/stores/aiSchedules";

/**
 * Scheduled AI runs editor helpers (28.2.8).
 *
 * The Phase 16.12 store (`aiSchedules.ts`) is fine. The editor UX
 * needs three things on top:
 *
 *   1. A 3-step wizard data model (prompt → cadence → delivery).
 *   2. A natural-language → schedule parser ("every Monday 8am to
 *      Slack #sales") so admins can paste a sentence instead of
 *      filling 5 fields.
 *   3. A canonical preview string for the wizard's review step.
 *
 * No UI here — pure helpers any wizard implementation can call.
 */

export interface ScheduleDraft {
  name: string;
  prompt: string;
  cadence: ScheduleCadence;
  delivery: ScheduleDelivery;
  target?: string;
}

export interface ParseResult {
  draft: Partial<ScheduleDraft>;
  /** Confidence 0..1; below 0.4 → ask the user to confirm. */
  confidence: number;
  /** Human-readable explanation of every guess made. */
  notes: string[];
}

const CADENCE_SYNONYMS: Array<[RegExp, ScheduleCadence]> = [
  [/\b(hourly|every hour)\b/i, "hourly"],
  [/\b(every (week|monday)|monday(s)?\s*(at|@)?\s*9)/i, "weekly-mon-9am"],
  [/\b(friday(s)?\s*(at|@)?\s*5)/i, "weekly-fri-5pm"],
  [/\b(daily|every day|each day)\b.*\b(9|nine|morning)\b/i, "daily-9am"],
  [/\b(daily|every day|each day)\b.*\b(5|five|evening|eod)\b/i, "daily-5pm"],
  [/\b(daily|every day|each day)\b/i, "daily-9am"],
  [/\b(monthly|first of (the )?month|1st of (the )?month)\b/i, "monthly-first-9am"],
];

const SLACK_RE = /\bslack(\s*#?[\w-]+)?\b/i;
const EMAIL_RE = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const CHANNEL_RE = /#([a-z0-9-]+)/i;

/** Best-effort NL → schedule parse. */
export function parseScheduleSentence(input: string): ParseResult {
  const text = input.trim();
  if (!text) {
    return { draft: {}, confidence: 0, notes: ["empty input"] };
  }
  const notes: string[] = [];
  const draft: Partial<ScheduleDraft> = {};
  let confidence = 0.4;

  // Cadence
  for (const [re, cadence] of CADENCE_SYNONYMS) {
    if (re.test(text)) {
      draft.cadence = cadence;
      notes.push(`Cadence: "${CADENCE_LABELS[cadence]}"`);
      confidence += 0.2;
      break;
    }
  }

  // Delivery + target
  const slackMatch = text.match(SLACK_RE);
  const emailMatch = text.match(EMAIL_RE);
  const channelMatch = text.match(CHANNEL_RE);
  if (slackMatch || channelMatch) {
    draft.delivery = "slack";
    draft.target = (channelMatch?.[0] ?? slackMatch?.[1] ?? "").trim();
    if (draft.target) notes.push(`Slack target: "${draft.target}"`);
    confidence += 0.15;
  } else if (emailMatch) {
    draft.delivery = "email";
    draft.target = emailMatch[1];
    notes.push(`Email target: ${emailMatch[1]}`);
    confidence += 0.15;
  } else {
    draft.delivery = "in-app";
    notes.push(`Delivery defaulted to in-app (no target found)`);
  }

  // Prompt = the rest of the sentence with delivery + cadence stripped.
  let prompt = text;
  for (const [re] of CADENCE_SYNONYMS) prompt = prompt.replace(re, "");
  prompt = prompt
    .replace(SLACK_RE, "")
    .replace(EMAIL_RE, "")
    .replace(CHANNEL_RE, "")
    .replace(/\bto\b/i, "")
    .replace(/\bevery\b/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (prompt.length > 6) {
    draft.prompt = prompt.replace(/^(can you |please |then )?/i, "").trim();
    confidence += 0.15;
  }

  // Name — take the first 6 words of the prompt.
  if (draft.prompt) {
    draft.name = draft.prompt.split(/\s+/).slice(0, 6).join(" ");
  }

  return {
    draft,
    confidence: Math.min(confidence, 1),
    notes,
  };
}

/** Render a one-line summary of the draft for the wizard's review step. */
export function describeSchedule(draft: ScheduleDraft): string {
  const cadence = CADENCE_LABELS[draft.cadence] ?? draft.cadence;
  const target =
    draft.delivery === "in-app"
      ? "the bell"
      : draft.target
        ? `${draft.delivery} (${draft.target})`
        : draft.delivery;
  return `${draft.name || "Untitled run"} · ${cadence} → ${target}`;
}

/** Validation — returns the list of fields that aren't ready yet. */
export function validateScheduleDraft(draft: Partial<ScheduleDraft>): string[] {
  const out: string[] = [];
  if (!draft.name?.trim()) out.push("name");
  if (!draft.prompt?.trim()) out.push("prompt");
  if (!draft.cadence) out.push("cadence");
  if (!draft.delivery) out.push("delivery");
  if (draft.delivery && draft.delivery !== "in-app" && !draft.target?.trim()) {
    out.push("target");
  }
  return out;
}
