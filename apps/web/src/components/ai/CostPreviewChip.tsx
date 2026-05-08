"use client";

// Pre-flight cost preview (UI_UPGRADE_PLAN.md 5.7).
//
// Shows an inline estimate of input tokens + USD before the user
// submits. Uses a 4-char/token heuristic plus the selected model's
// pricing from the existing aiCostMeter. Updates live as the user
// types (debounced via React's natural batching). Hidden when input
// is empty so it doesn't clutter the empty-composer state.

import { useMemo } from "react";
import { Coins } from "lucide-react";
import { useAiMemoryStore } from "@/lib/stores/aiMemory";
import { useAiWorkspace } from "@/lib/stores/aiWorkspace";

// Per-model price (USD) per 1k input tokens. Aligns with the
// aiCostMeter pricing table — we duplicate just the input numbers
// here because the preview only estimates the input cost (output is
// unknown until streaming completes).
const INPUT_USD_PER_1K: Record<string, number> = {
  haiku: 0.0008, // claude-haiku
  sonnet: 0.003, // claude-sonnet
  opus: 0.015, // claude-opus
};

function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token is a reasonable English-text approximation.
  // Code + JSON skews lower so we add a small buffer for safety.
  return Math.ceil(text.length / 4) + 8;
}

interface CostPreviewChipProps {
  /** The user's current composer text. */
  input: string;
  /** Selected AI model — keys map to INPUT_USD_PER_1K. */
  model?: "haiku" | "sonnet" | "opus";
  /** Optional inline-edit override; defaults to "tag" style (chip). */
  variant?: "chip" | "inline";
}

export function CostPreviewChip({
  input,
  model = "sonnet",
  variant = "chip",
}: CostPreviewChipProps) {
  const memoryFacts = useAiMemoryStore((s) => s.facts);
  const persona = useAiWorkspace((s) => s.persona);
  const memories = useAiWorkspace((s) => s.memories);

  const estimate = useMemo(() => {
    if (!input.trim()) return null;

    // Build the same preface the chat route prepends so the estimate
    // matches reality.
    const prefaceParts: string[] = [
      persona.tone,
      persona.length,
      persona.customInstructions,
    ];
    const activeMemories = memories.filter((m) => m.active);
    for (const m of activeMemories) prefaceParts.push(m.body);
    for (const f of memoryFacts) prefaceParts.push(f.text);

    const prefaceTokens = estimateTokens(prefaceParts.join("\n\n"));
    const inputTokens = estimateTokens(input);
    const totalTokens = prefaceTokens + inputTokens;

    const ratePerK = INPUT_USD_PER_1K[model] ?? INPUT_USD_PER_1K.sonnet;
    const usd = (totalTokens / 1000) * ratePerK;

    return {
      tokens: totalTokens,
      usd,
      prefaceTokens,
      inputTokens,
    };
  }, [input, model, persona, memories, memoryFacts]);

  if (!estimate) return null;

  const usdLabel =
    estimate.usd < 0.001
      ? "<$0.001"
      : estimate.usd < 0.01
        ? `$${estimate.usd.toFixed(4)}`
        : `$${estimate.usd.toFixed(3)}`;

  if (variant === "inline") {
    return (
      <span
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
        }}
        title={`~${estimate.tokens.toLocaleString()} input tokens (preface ${estimate.prefaceTokens} + input ${estimate.inputTokens}) at ${INPUT_USD_PER_1K[model] * 1000}¢/1k. Output cost adds at completion.`}
      >
        {usdLabel} · ~{estimate.tokens.toLocaleString()} tok
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        fontSize: 11,
        color: "var(--text-secondary)",
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 99,
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
      }}
      title={`Estimated input cost.\n• Preface (persona + memories): ~${estimate.prefaceTokens.toLocaleString()} tokens\n• Your prompt: ~${estimate.inputTokens.toLocaleString()} tokens\n• Model: ${model} ($${INPUT_USD_PER_1K[model]}/1k input)\nOutput cost adds at completion.`}
    >
      <Coins size={11} aria-hidden="true" />
      ~{estimate.tokens.toLocaleString()} tok · {usdLabel}
    </span>
  );
}
