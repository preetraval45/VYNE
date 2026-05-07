"use client";

import { useAiConversationOverrides } from "@/lib/stores/aiConversationOverrides";

/**
 * Chain-of-thought toggle + parser (28.2.7).
 *
 *   const { reasoning, answer } = splitReasoning(rawReply);
 *   const visible = isReasoningVisible(conversationId);
 *
 * The model emits `<thinking>...</thinking>` blocks (Anthropic
 * extended-thinking style) or `## Reasoning` markdown sections; this
 * helper splits the raw reply into the visible answer + the hidden
 * reasoning trace. The chat UI renders reasoning inside a collapsed
 * `<details>` only when the active conversation override has
 * `showReasoning === true`.
 */

interface SplitReply {
  reasoning: string | null;
  answer: string;
}

const TAG_RE = /<thinking[^>]*>([\s\S]*?)<\/thinking>/gi;
const SECTION_RE = /^##?\s*(thinking|reasoning|chain[- ]of[- ]thought)\s*$/im;

export function splitReasoning(raw: string): SplitReply {
  if (!raw) return { reasoning: null, answer: "" };
  // 1) `<thinking>` tags first.
  const blocks: string[] = [];
  const stripped = raw.replace(TAG_RE, (_full, body: string) => {
    blocks.push(body.trim());
    return "";
  });
  if (blocks.length > 0) {
    return {
      reasoning: blocks.join("\n\n"),
      answer: stripped.trim(),
    };
  }
  // 2) `## Reasoning` heading section.
  const sectionMatch = SECTION_RE.exec(raw);
  if (sectionMatch) {
    const idx = sectionMatch.index;
    const headingEnd = idx + sectionMatch[0].length;
    // Reasoning runs until the next `##` heading.
    const next = /^##\s+/m.exec(raw.slice(headingEnd));
    const reasoningEnd = next ? headingEnd + next.index : raw.length;
    const reasoning = raw.slice(headingEnd, reasoningEnd).trim();
    const answer =
      raw.slice(0, idx).trim() +
      (reasoningEnd < raw.length ? "\n\n" + raw.slice(reasoningEnd).trim() : "");
    return { reasoning, answer: answer.trim() };
  }
  return { reasoning: null, answer: raw };
}

export function isReasoningVisible(conversationId: string | null | undefined): boolean {
  if (!conversationId) return false;
  const override = useAiConversationOverrides
    .getState()
    .effectiveOverride(conversationId);
  return Boolean(override?.showReasoning);
}

/**
 * Toggle helper for the chat header chip. Stores the choice on the
 * conversation override so the next reply respects it.
 */
export function setReasoningVisible(
  conversationId: string,
  visible: boolean,
): void {
  useAiConversationOverrides
    .getState()
    .setOverride(conversationId, { showReasoning: visible });
}
