"use client";

/**
 * Forward-to-AI helper (28.1.9).
 *
 *   forwardMessageToAi({
 *     message: { author: "Sarah", body: "Can we ship this Friday?" },
 *     threadContext: [...],
 *     intent: "summarize",
 *   });
 *
 * Builds a deep-link to `/ai/chat?prompt=…` with the selected message
 * + thread context pre-baked into a structured prompt. Three intents
 * cover the common patterns:
 *
 *   - "summarize"  → "Summarize this conversation in 3 bullets…"
 *   - "draft"      → "Draft a reply to Sarah given the context above…"
 *   - "extract"    → "Extract action items + decisions + blockers…"
 *
 * Optional `customInstruction` overrides the canned template, so a
 * power user can route an arbitrary "translate this to French" or
 * "rewrite as a bug report" through the same surface.
 */

export type ForwardIntent = "summarize" | "draft" | "extract" | "custom";

export interface ForwardableMessage {
  author?: string;
  body?: string;
  createdAt?: string;
}

export interface ForwardOpts {
  /** The selected message — required. */
  message: ForwardableMessage;
  /** Surrounding thread / channel messages for context. */
  threadContext?: ForwardableMessage[];
  /** Channel name shown in the prompt header. */
  channelName?: string;
  /** Pre-canned intent. Default "summarize". */
  intent?: ForwardIntent;
  /** Free-form override (used when `intent === "custom"`). */
  customInstruction?: string;
}

const INTENT_TEMPLATE: Record<Exclude<ForwardIntent, "custom">, string> = {
  summarize:
    "Summarize the conversation above in 3 short bullets. Lead with what's most important.",
  draft:
    "Draft a reply I can send. Match the tone of the existing conversation. Keep it under 80 words. End with a clear next step.",
  extract:
    "Extract three lists from the conversation: decisions made, action items (with owner if mentioned), and open blockers. Use bullets.",
};

function fmtMessage(m: ForwardableMessage): string {
  const author = m.author ? `${m.author}: ` : "";
  const ts = m.createdAt
    ? ` (${new Date(m.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })})`
    : "";
  const body = (m.body ?? "").trim();
  return `${author}${body}${ts}`.trim();
}

/**
 * Build the AI prompt without doing any navigation — useful when the
 * caller wants to inspect / edit the prompt before opening the chat.
 */
export function buildForwardPrompt(opts: ForwardOpts): string {
  const { message, threadContext = [], channelName, intent = "summarize", customInstruction } = opts;
  const lines: string[] = [];
  if (channelName) lines.push(`Channel: ${channelName}`);
  if (threadContext.length > 0) {
    lines.push("");
    lines.push("Recent context:");
    for (const m of threadContext.slice(-12)) lines.push(`> ${fmtMessage(m)}`);
  }
  lines.push("");
  lines.push("Selected message:");
  lines.push(`> ${fmtMessage(message)}`);
  lines.push("");
  const instruction =
    intent === "custom" && customInstruction?.trim()
      ? customInstruction.trim()
      : INTENT_TEMPLATE[intent === "custom" ? "summarize" : intent];
  lines.push(instruction);
  return lines.join("\n");
}

/**
 * Build the deep-link URL the message context-menu navigates to.
 * Caller does the actual `router.push` — keeps this function pure.
 */
export function buildForwardUrl(opts: ForwardOpts): string {
  const prompt = buildForwardPrompt(opts);
  const trimmed = prompt.length > 4000 ? prompt.slice(0, 4000) + "\n…(truncated)" : prompt;
  return `/ai/chat?prompt=${encodeURIComponent(trimmed)}`;
}

/**
 * Imperative shortcut — builds the URL and navigates. Use when the
 * caller doesn't need to inspect the prompt first.
 */
export function forwardMessageToAi(opts: ForwardOpts): string {
  const url = buildForwardUrl(opts);
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
  return url;
}
