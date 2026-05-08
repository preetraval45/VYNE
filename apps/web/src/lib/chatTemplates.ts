"use client";

// Message templates (UI_UPGRADE_PLAN.md 6.9).
//
// Reuses the aiWorkspace.prompts store — a "chat-template" prompt has
// the tag `chat-template` and a slug. Composer slash trigger:
//   /t <slug>          → expands the template body inline
//   /save-template     → asks the user for a slug + saves the current
//                        composer text as a chat template
//
// Stays in the same store as Skills + AI prompts so a single library
// of "things I type often" is shared across surfaces.

import { useAiWorkspace, type SavedPrompt } from "@/lib/stores/aiWorkspace";

export const CHAT_TEMPLATE_TAG = "chat-template";

export function isChatTemplate(p: SavedPrompt): boolean {
  return Array.isArray(p.tags) && p.tags.includes(CHAT_TEMPLATE_TAG);
}

export function listChatTemplates(): SavedPrompt[] {
  return useAiWorkspace.getState().prompts.filter(isChatTemplate);
}

/** Resolve a template by slug (or id, or title). Returns null on miss. */
export function findChatTemplate(slugOrId: string): SavedPrompt | null {
  const needle = slugOrId.trim().toLowerCase();
  if (!needle) return null;
  return (
    listChatTemplates().find(
      (p) =>
        (p.slug && p.slug.toLowerCase() === needle) ||
        p.id.toLowerCase() === needle ||
        p.title.toLowerCase() === needle,
    ) ?? null
  );
}

const TEMPLATE_RE = /^\/t\s+(\S+)/i;
const SAVE_RE = /^\/save-template\s+(\S+)\s+(.+)$/is;

/** Detects a /t <slug> trigger in the user's input and returns the
 *  expanded body, or null if no match. */
export function expandTemplateTrigger(input: string): {
  template: SavedPrompt;
  expanded: string;
} | null {
  const match = input.match(TEMPLATE_RE);
  if (!match) return null;
  const tpl = findChatTemplate(match[1]);
  if (!tpl) return null;
  // Replace just the trigger token; preserve any trailing text the
  // user appended after the slug.
  const trailing = input.slice(match[0].length).trim();
  const expanded = trailing ? `${tpl.body}\n\n${trailing}` : tpl.body;
  return { template: tpl, expanded };
}

/** Detects /save-template <slug> <body> and persists. Returns the
 *  saved row or null. */
export function saveTemplateFromTrigger(input: string): SavedPrompt | null {
  const match = input.match(SAVE_RE);
  if (!match) return null;
  const slug = match[1]
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const body = match[2].trim();
  if (!slug || !body) return null;
  return useAiWorkspace.getState().savePrompt({
    title: slug,
    slug,
    body,
    tags: [CHAT_TEMPLATE_TAG],
    shared: true,
  });
}
