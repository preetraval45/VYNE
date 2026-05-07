"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-conversation overrides for the AI chat (28.2.1 + 28.2.10).
 *
 *   setOverride(conversationId, { model: "opus", personaId: "engineering" });
 *   const eff = effectiveOverride(conversationId);
 *
 * The chat header reads `effectiveOverride()` to decide which model
 * to call + which persona to inject into the system prompt. When no
 * override exists, the workspace defaults from `aiWorkspace.persona`
 * + `aiMemory.preferredModel` win.
 *
 * Stored separately from `aiMemory.conversations` so changing a model
 * mid-conversation doesn't trigger a full memory rewrite.
 */

export type AiModelKey =
  | "haiku"
  | "sonnet"
  | "opus"
  | "groq-llama"
  | "gpt-4o-mini"
  | "gpt-4o";

export type PersonaId =
  | "default"
  | "engineering"
  | "sales"
  | "support"
  | "legal"
  | "ops"
  | "marketing"
  | "custom";

export interface ConversationOverride {
  conversationId: string;
  /** Override the workspace default model. null = use default. */
  model?: AiModelKey | null;
  /** Override the workspace persona. null = use default. */
  personaId?: PersonaId | null;
  /** Free-form persona prompt — only used when personaId === "custom". */
  customPersonaPrompt?: string;
  /** Show / hide chain-of-thought reasoning blocks (28.2.7). */
  showReasoning?: boolean;
  updatedAt: string;
}

interface AiConversationOverridesStore {
  overrides: ConversationOverride[];
  setOverride: (
    conversationId: string,
    patch: Partial<Omit<ConversationOverride, "conversationId" | "updatedAt">>,
  ) => ConversationOverride;
  clearOverride: (conversationId: string) => void;
  effectiveOverride: (
    conversationId: string,
  ) => ConversationOverride | null;
}

export const PERSONA_PRESETS: Record<
  Exclude<PersonaId, "default" | "custom">,
  string
> = {
  engineering:
    "Audience: senior engineers. Use precise terminology. Show working code first; explanation second. Cite docs / RFCs when relevant.",
  sales:
    "Audience: account executive. Be concise + persuasive. Frame everything in terms of customer outcomes + revenue impact. Avoid jargon.",
  support:
    "Audience: support agent. Stay calm + empathetic. Acknowledge frustration first, then provide a clear step-by-step resolution.",
  legal:
    "Audience: in-house legal. Use formal tone. Flag every assumption. Never advise on jurisdiction-specific law without disclaimer.",
  ops:
    "Audience: operations lead. Lead with impact metrics + numbers. Keep recommendations actionable + ranked by leverage.",
  marketing:
    "Audience: marketing manager. Use brand voice (warm, slightly playful). Focus on the audience problem before the solution. Bias to specifics.",
};

export const MODEL_LABELS: Record<AiModelKey, string> = {
  haiku: "Claude Haiku 4.5",
  sonnet: "Claude Sonnet 4.6",
  opus: "Claude Opus 4.7",
  "groq-llama": "Groq · Llama 3.3 70B",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4o": "GPT-4o",
};

export const useAiConversationOverrides =
  create<AiConversationOverridesStore>()(
    persist(
      (set, get) => ({
        overrides: [],
        setOverride: (conversationId, patch) => {
          const existing = get().overrides.find(
            (o) => o.conversationId === conversationId,
          );
          const next: ConversationOverride = {
            ...(existing ?? { conversationId, updatedAt: "" }),
            ...patch,
            conversationId,
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({
            overrides: [
              next,
              ...s.overrides.filter(
                (o) => o.conversationId !== conversationId,
              ),
            ],
          }));
          return next;
        },
        clearOverride: (conversationId) =>
          set((s) => ({
            overrides: s.overrides.filter(
              (o) => o.conversationId !== conversationId,
            ),
          })),
        effectiveOverride: (conversationId) =>
          get().overrides.find(
            (o) => o.conversationId === conversationId,
          ) ?? null,
      }),
      { name: "vyne-ai-conv-overrides", version: 1 },
    ),
  );

/** Resolve the persona prompt fragment for a given override, or the
 *  workspace default when no override exists. */
export function resolvePersonaPrompt(
  override: ConversationOverride | null,
  workspaceDefault: string,
): string {
  if (!override?.personaId || override.personaId === "default") {
    return workspaceDefault;
  }
  if (override.personaId === "custom") {
    return override.customPersonaPrompt?.trim() || workspaceDefault;
  }
  return PERSONA_PRESETS[override.personaId];
}
