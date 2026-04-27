"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SlashTemplate {
  id: string;
  cmd: string;
  args: string;
  icon: string;
  desc: string;
  category: string;
  /** AI prompt that's run with the user's args appended. If unset, treated as a static command. */
  prompt?: string;
  /** "ai" | "static" — used by the renderer */
  kind: "ai" | "static";
  /** Custom user templates can be edited; built-ins can't. */
  builtin?: boolean;
  createdAt: string;
}

interface SlashTemplatesState {
  templates: SlashTemplate[];
  addTemplate: (
    t: Omit<SlashTemplate, "id" | "createdAt" | "builtin">,
  ) => SlashTemplate;
  updateTemplate: (id: string, patch: Partial<SlashTemplate>) => void;
  deleteTemplate: (id: string) => void;
  resetBuiltins: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `slash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const BUILTIN_TEMPLATES: SlashTemplate[] = [
  {
    id: "builtin-standup",
    cmd: "standup",
    args: "[blockers]",
    icon: "🧱",
    desc: "Generate a daily standup post from your recent activity",
    category: "AI templates",
    prompt:
      "Write a concise daily standup post in this format: 'Yesterday: …', 'Today: …', 'Blockers: …'. Use my recent calendar events, completed tasks, and any blockers I list. If I list extra context after the command, use it as the blockers section.",
    kind: "ai",
    builtin: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-incident",
    cmd: "incident",
    args: "<title>",
    icon: "🚨",
    desc: "Open an incident channel structure with sections + roles",
    category: "AI templates",
    prompt:
      "Generate an incident response post with: TITLE, IMPACT (who/how many affected), CURRENT STATUS, OWNER, NEXT UPDATE TIME (in 30 min), TIMELINE (empty bullets to fill in). Use the args as the incident title.",
    kind: "ai",
    builtin: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-postmortem",
    cmd: "postmortem",
    args: "<incident-id or summary>",
    icon: "🔍",
    desc: "Draft a blameless post-mortem template",
    category: "AI templates",
    prompt:
      "Generate a blameless post-mortem with sections: SUMMARY, IMPACT, TIMELINE OF EVENTS, ROOT CAUSE, WHAT WENT WELL, WHAT WENT WRONG, ACTION ITEMS (with owners). Keep it factual.",
    kind: "ai",
    builtin: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-pr-summary",
    cmd: "pr-summary",
    args: "<branch or PR url>",
    icon: "🔀",
    desc: "Summarize a pull request for non-engineers",
    category: "AI templates",
    prompt:
      "Summarize the given pull request in plain English for product/sales: what user-facing change, who's affected, what to test, any breaking changes. 80 words max.",
    kind: "ai",
    builtin: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-customer-update",
    cmd: "customer-update",
    args: "<customer name>",
    icon: "💬",
    desc: "Pull recent activity for a customer into a status post",
    category: "AI templates",
    prompt:
      "Write a status update for the given customer: deal stage, last contact, open tickets, next step. Use whatever VYNE context is available.",
    kind: "ai",
    builtin: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

export const useSlashTemplatesStore = create<SlashTemplatesState>()(
  persist(
    (set) => ({
      templates: BUILTIN_TEMPLATES,

      addTemplate: (t) => {
        const tpl: SlashTemplate = {
          ...t,
          id: newId(),
          builtin: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ templates: [...s.templates, tpl] }));
        return tpl;
      },

      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id && !t.builtin ? { ...t, ...patch } : t,
          ),
        })),

      deleteTemplate: (id) =>
        set((s) => ({
          templates: s.templates.filter((t) => t.builtin || t.id !== id),
        })),

      resetBuiltins: () =>
        set((s) => {
          // Replace builtin templates with the canonical set, keep user ones.
          const userTemplates = s.templates.filter((t) => !t.builtin);
          return { templates: [...BUILTIN_TEMPLATES, ...userTemplates] };
        }),
    }),
    {
      name: "vyne-slash-templates",
      version: 1,
      // Always overlay the latest BUILTIN_TEMPLATES on rehydrate so updates ship
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const userTemplates = state.templates.filter((t) => !t.builtin);
        state.templates = [...BUILTIN_TEMPLATES, ...userTemplates];
      },
    },
  ),
);
