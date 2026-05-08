"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * AI workspace store — single source of truth for everything that
 * shapes how Vyne AI behaves *across* sessions:
 *
 *   - Persona  (16.2): tone / style / response length / banned words
 *   - Memories (16.3): user-curated long-term notes the AI references
 *                      every turn ("I prefer terse summaries", "I'm a
 *                      data scientist on the observability team")
 *   - Prompts  (16.7): team-shared library of saved prompts
 *
 * The persona + memories are serialised into a `systemPreface` string
 * that the chat route prepends to every system prompt, so the AI's
 * behaviour reflects the user's stated preferences without per-call
 * boilerplate.
 *
 * Token cost (16.5) lives in a separate store (`aiCostMeter.ts`) so
 * the heavy persistence path doesn't fire on every streaming chunk.
 */

export type PersonaTone =
  | "balanced"
  | "concise"
  | "detailed"
  | "friendly"
  | "formal"
  | "technical";

export type PersonaLength = "short" | "medium" | "long";

export interface Persona {
  /** Single-word tone preset. */
  tone: PersonaTone;
  /** Default answer verbosity. */
  length: PersonaLength;
  /** Hard-list of words/phrases the AI must avoid. */
  bannedWords: string[];
  /** Free-form addendum injected at the end of the system prompt. */
  customInstructions: string;
  /** When true, AI translates every reply to the user's locale. */
  translateToLocale: boolean;
}

export interface AiMemory {
  id: string;
  body: string;
  createdAt: string;
  /** When true, the memory is included in every system preface. */
  active: boolean;
}

/** UI_UPGRADE_PLAN.md 5.4 — A SkillStep is one tool invocation in a
 *  saved Skill (multi-step prompt). Users build skills via Settings →
 *  AI preferences and run them with `/skill <slug>` in the chat. */
export interface SkillStep {
  /** Tool name from the catalog (createDeal, queryTasks, etc.). */
  tool: string;
  /** Pre-filled arguments. Templating with `{{var}}` is reserved for
   *  a follow-up release; today, args are static JSON. */
  args: Record<string, unknown>;
  /** Optional one-line note shown in the trace. */
  note?: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  /** When true, all teammates see the prompt in the library. */
  shared: boolean;
  /** Stable slug for the slash trigger (`/skill weekly-pipeline`).
   *  When present, the prompt is treated as a Skill and the slash
   *  trigger executes the steps sequentially. Falls back to the id
   *  when not set. */
  slug?: string;
  /** When set, this prompt is a Skill — invoking it chains the tool
   *  calls instead of just sending the body to the AI. */
  steps?: SkillStep[];
}

interface AiWorkspaceStore {
  persona: Persona;
  memories: AiMemory[];
  prompts: SavedPrompt[];

  setPersona: (patch: Partial<Persona>) => void;
  resetPersona: () => void;

  addMemory: (body: string) => AiMemory;
  toggleMemory: (id: string) => void;
  removeMemory: (id: string) => void;

  savePrompt: (
    p: Omit<SavedPrompt, "id" | "createdAt"> & { id?: string },
  ) => SavedPrompt;
  removePrompt: (id: string) => void;

  /** Build the system-prompt addendum from active memories + persona. */
  systemPreface: () => string;
}

const DEFAULT_PERSONA: Persona = {
  tone: "balanced",
  length: "medium",
  bannedWords: [],
  customInstructions: "",
  translateToLocale: false,
};

const SEED_PROMPTS: SavedPrompt[] = [
  {
    id: "seed-board-update",
    title: "Weekly board update",
    body: "Write a board-ready update for last week. Cover: revenue MTD vs target, top 3 deals in flight, customer health changes, runway, hiring plan, and one strategic question for the board to weigh in on. Keep it under 250 words.",
    tags: ["leadership", "weekly"],
    createdAt: new Date(0).toISOString(),
    shared: true,
  },
  {
    id: "seed-pipeline-review",
    title: "Pipeline review",
    body: "Review my CRM pipeline. Identify the top 3 stalled deals, what stage they are stuck in, the median cycle time at that stage, and one specific re-engagement message I can send today. Reply with bullets, no preamble.",
    tags: ["sales", "ops"],
    createdAt: new Date(0).toISOString(),
    shared: true,
  },
  {
    id: "seed-incident-postmortem",
    title: "Incident postmortem draft",
    body: "Draft a blameless postmortem for an incident I'll describe. Include: timeline, customer impact (with revenue), root cause (5 whys), action items grouped by owner. Pull deploy events from the same window.",
    tags: ["engineering", "incident"],
    createdAt: new Date(0).toISOString(),
    shared: true,
  },
];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useAiWorkspace = create<AiWorkspaceStore>()(
  persist(
    (set, get) => ({
      persona: DEFAULT_PERSONA,
      memories: [],
      prompts: SEED_PROMPTS,

      setPersona: (patch) =>
        set((s) => ({ persona: { ...s.persona, ...patch } })),
      resetPersona: () => set({ persona: DEFAULT_PERSONA }),

      addMemory: (body) => {
        const trimmed = body.trim();
        if (!trimmed) {
          return {
            id: "noop",
            body: "",
            createdAt: new Date().toISOString(),
            active: false,
          };
        }
        const row: AiMemory = {
          id: newId(),
          body: trimmed.slice(0, 600),
          createdAt: new Date().toISOString(),
          active: true,
        };
        set((s) => ({ memories: [row, ...s.memories].slice(0, 30) }));
        return row;
      },
      toggleMemory: (id) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, active: !m.active } : m,
          ),
        })),
      removeMemory: (id) =>
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      savePrompt: (p) => {
        const id = p.id ?? newId();
        const row: SavedPrompt = {
          id,
          title: p.title.slice(0, 80) || "Untitled prompt",
          body: p.body,
          tags: p.tags ?? [],
          shared: p.shared ?? false,
          createdAt: new Date().toISOString(),
          slug: p.slug?.trim() || undefined,
          steps: p.steps && p.steps.length > 0 ? p.steps : undefined,
        };
        set((s) => {
          const existing = s.prompts.findIndex((x) => x.id === id);
          if (existing >= 0) {
            const next = [...s.prompts];
            next[existing] = row;
            return { prompts: next };
          }
          return { prompts: [row, ...s.prompts].slice(0, 60) };
        });
        return row;
      },
      removePrompt: (id) =>
        set((s) => ({ prompts: s.prompts.filter((p) => p.id !== id) })),

      systemPreface: () => {
        const { persona, memories } = get();
        const out: string[] = [];
        const toneCopy: Record<PersonaTone, string> = {
          balanced: "Balance clarity and warmth.",
          concise: "Be terse. Bullets over prose. No preamble.",
          detailed: "Be thorough. Show your reasoning step by step.",
          friendly: "Use a warm, encouraging voice. Light humour is fine.",
          formal: "Use a formal, business-professional tone. No contractions.",
          technical:
            "Assume a senior engineer audience. Use precise terminology.",
        };
        out.push(toneCopy[persona.tone]);
        const lengthCopy: Record<PersonaLength, string> = {
          short:
            "Keep replies to ≤ 80 words unless the user explicitly asks for more.",
          medium: "Aim for ~150-250 words.",
          long: "Provide thorough, multi-paragraph answers when warranted.",
        };
        out.push(lengthCopy[persona.length]);
        if (persona.bannedWords.length > 0) {
          out.push(
            `Never use these words/phrases: ${persona.bannedWords
              .map((w) => `"${w}"`)
              .join(", ")}.`,
          );
        }
        if (persona.customInstructions.trim()) {
          out.push(persona.customInstructions.trim());
        }
        if (persona.translateToLocale && typeof navigator !== "undefined") {
          out.push(
            `If the user's UI locale is non-English, reply in that locale: ${navigator.language}.`,
          );
        }
        const active = memories.filter((m) => m.active);
        if (active.length > 0) {
          out.push("Long-term notes about this user (apply silently):");
          for (const m of active) out.push(`- ${m.body}`);
        }
        return out.join("\n\n");
      },
    }),
    { name: "vyne-ai-workspace", version: 1 },
  ),
);

/** Locate a skill (prompt with steps[]) by slug or id. Returns null
 *  if no match. The chat composer's `/skill <name>` trigger uses this. */
export function findSkill(slugOrId: string): SavedPrompt | null {
  const needle = slugOrId.trim().toLowerCase();
  if (!needle) return null;
  const all = useAiWorkspace.getState().prompts;
  return (
    all.find(
      (p) =>
        Array.isArray(p.steps) &&
        p.steps.length > 0 &&
        ((p.slug && p.slug.toLowerCase() === needle) ||
          p.id.toLowerCase() === needle ||
          p.title.toLowerCase() === needle),
    ) ?? null
  );
}

/** List every prompt that has a steps[] array (i.e. is a Skill). */
export function listSkills(): SavedPrompt[] {
  return useAiWorkspace
    .getState()
    .prompts.filter((p) => Array.isArray(p.steps) && p.steps.length > 0);
}

/** Module-level helper so non-React code (route handlers, agent
 *  middleware) can pull the active preface without a hook. */
export function getAiSystemPreface(): string {
  return useAiWorkspace.getState().systemPreface();
}
