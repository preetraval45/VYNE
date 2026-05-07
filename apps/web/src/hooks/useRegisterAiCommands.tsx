"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";

/**
 * useRegisterAiCommands — registers the page's `useAiSuggestedPrompts()`
 * list with the Cmd+K palette under the active module scope. Each
 * prompt becomes a "Ask Vyne AI: …" command that, when run, navigates
 * to /ai/chat with the question pre-filled.
 *
 * Drop into any module page that already calls `useRegisterCommands`
 * to get a free AI surface in the palette without duplicating the
 * prompt list.
 *
 *   useRegisterAiCommands("crm");
 *
 * The Cmd+K AI fall-through (Phase 10.10) handles arbitrary user
 * queries; this helper covers the curated, page-relevant prompts.
 */
export function useRegisterAiCommands(scope: string): void {
  const prompts = useAiSuggestedPrompts();

  const commands = useMemo(
    () =>
      prompts.map((p, i) => ({
        id: `ai-${scope}-${i}`,
        label: `Ask Vyne AI: ${p.label}`,
        description: p.prompt,
        icon: <Sparkles size={14} />,
        action: () => {
          if (typeof window !== "undefined") {
            window.location.href = `/ai/chat?prompt=${encodeURIComponent(p.prompt)}`;
          }
        },
        category: "AI Tools" as const,
        keywords: "ai vyne assistant " + p.label.toLowerCase(),
        badge: "AI",
      })),
    [scope, prompts],
  );

  useRegisterCommands(scope, commands);
}
