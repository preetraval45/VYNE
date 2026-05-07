"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Setup-score store. Each entry is a discrete step the user can
 * complete to "set up" their workspace; completion is tracked
 * locally and exposed as both:
 *
 *   - a 0-100 score (what % of weighted steps are done)
 *   - a per-step status feed for the welcome checklist
 *
 * Items can be marked done programmatically (e.g. when the user
 * actually invites a teammate, the membership flow flips the
 * `invite-team` step) or dismissed manually for users who don't
 * care about a particular step. Dismissed steps still count
 * toward the score so the gauge fills.
 */

export type SetupRoleId = "admin" | "sales" | "ops" | "engineer" | "any";

export interface SetupStep {
  id: string;
  /** Short headline shown in the checklist row. */
  title: string;
  /** One-sentence helper text. */
  description: string;
  /** What clicking the row does. Internal route preferred; external `https://` opens in new tab. */
  href?: string;
  /** Higher weight = bigger score impact. Sum across all steps used for normalisation. */
  weight: number;
  /** Restrict step to a role. "any" = everyone. */
  role: SetupRoleId;
  /** Lucide icon name — looked up at render time so the store stays serializable. */
  icon: string;
  /** Estimated time-to-complete (shown as a small chip). */
  durationMin?: number;
  /** Group label for the checklist sections. */
  group: "Workspace" | "Connect data" | "Invite & share" | "Try it";
}

export interface SetupRecord {
  done: boolean;
  doneAt?: string;
  dismissed?: boolean;
  dismissedAt?: string;
}

interface SetupScoreStore {
  records: Record<string, SetupRecord>;
  markDone: (id: string) => void;
  markUndone: (id: string) => void;
  dismiss: (id: string) => void;
  unhide: (id: string) => void;
  reset: () => void;
  /** Current 0-100 score for the active role. */
  score: (role?: SetupRoleId) => number;
  /** Resolved per-step state for the active role. Hides nothing. */
  steps: (role?: SetupRoleId) => Array<SetupStep & SetupRecord>;
}

const STEPS: SetupStep[] = [
  {
    id: "create-workspace",
    title: "Create your workspace",
    description: "Name it, pick a colour, set a logo.",
    href: "/settings?panel=general",
    weight: 1,
    role: "any",
    icon: "Building2",
    durationMin: 1,
    group: "Workspace",
  },
  {
    id: "set-theme",
    title: "Pick an accent colour",
    description: "85 swatches or any hex; cascades across the whole UI.",
    href: "/settings?panel=appearance",
    weight: 1,
    role: "any",
    icon: "Palette",
    durationMin: 1,
    group: "Workspace",
  },
  {
    id: "invite-team",
    title: "Invite a teammate",
    description: "Even one helper makes Cmd+K + presence + chat tangible.",
    href: "/settings?panel=members",
    weight: 2,
    role: "admin",
    icon: "UserPlus",
    durationMin: 2,
    group: "Invite & share",
  },
  {
    id: "connect-stripe",
    title: "Connect Stripe (or skip)",
    description: "Powers invoice payment links; Stripe-test works in demo.",
    href: "/settings?panel=integrations",
    weight: 2,
    role: "any",
    icon: "CreditCard",
    durationMin: 3,
    group: "Connect data",
  },
  {
    id: "import-csv",
    title: "Import contacts from CSV",
    description: "AI maps columns; preview before commit.",
    href: "/contacts?import=1",
    weight: 1,
    role: "any",
    icon: "Upload",
    durationMin: 3,
    group: "Connect data",
  },
  {
    id: "create-deal",
    title: "Add your first deal",
    description: "Or sample-load one — deal coach + AI work the same either way.",
    href: "/crm",
    weight: 1,
    role: "sales",
    icon: "Briefcase",
    durationMin: 1,
    group: "Try it",
  },
  {
    id: "create-project",
    title: "Spin up a project",
    description: "Board view, sprint planner, and the AI sprint planner all wake up.",
    href: "/projects",
    weight: 1,
    role: "engineer",
    icon: "ListChecks",
    durationMin: 2,
    group: "Try it",
  },
  {
    id: "use-ai",
    title: "Ask Vyne AI a question",
    description: "Try “what changed in projects this week?”",
    href: "/ai/chat",
    weight: 2,
    role: "any",
    icon: "Sparkles",
    durationMin: 1,
    group: "Try it",
  },
  {
    id: "enable-push",
    title: "Turn on web push",
    description: "Stay in the loop without keeping the tab open.",
    href: "/settings?panel=notifications",
    weight: 1,
    role: "any",
    icon: "Bell",
    durationMin: 1,
    group: "Workspace",
  },
  {
    id: "save-view",
    title: "Save your first view",
    description: "Pin a filter combo on any list page (CRM, projects, ops…).",
    href: "/crm",
    weight: 1,
    role: "any",
    icon: "Bookmark",
    durationMin: 1,
    group: "Try it",
  },
];

function applicable(step: SetupStep, role: SetupRoleId): boolean {
  return step.role === "any" || role === "any" || step.role === role;
}

export const useSetupScore = create<SetupScoreStore>()(
  persist(
    (set, get) => ({
      records: {},
      markDone: (id) =>
        set((s) => ({
          records: {
            ...s.records,
            [id]: {
              ...(s.records[id] ?? {}),
              done: true,
              doneAt: new Date().toISOString(),
            },
          },
        })),
      markUndone: (id) =>
        set((s) => ({
          records: {
            ...s.records,
            [id]: { ...(s.records[id] ?? { done: false }), done: false, doneAt: undefined },
          },
        })),
      dismiss: (id) =>
        set((s) => ({
          records: {
            ...s.records,
            [id]: {
              ...(s.records[id] ?? { done: false }),
              dismissed: true,
              dismissedAt: new Date().toISOString(),
            },
          },
        })),
      unhide: (id) =>
        set((s) => ({
          records: {
            ...s.records,
            [id]: { ...(s.records[id] ?? { done: false }), dismissed: false },
          },
        })),
      reset: () => set({ records: {} }),
      score: (role = "any") => {
        const records = get().records;
        const items = STEPS.filter((s) => applicable(s, role));
        if (items.length === 0) return 0;
        const total = items.reduce((sum, s) => sum + s.weight, 0);
        const earned = items.reduce((sum, s) => {
          const r = records[s.id];
          if (r?.done || r?.dismissed) return sum + s.weight;
          return sum;
        }, 0);
        return Math.round((earned / total) * 100);
      },
      steps: (role = "any") => {
        const records = get().records;
        return STEPS.filter((s) => applicable(s, role)).map((s) => ({
          ...s,
          ...(records[s.id] ?? { done: false }),
        }));
      },
    }),
    { name: "vyne-setup-score", version: 1 },
  ),
);

/** Module-level helper so non-React code (route handlers, hooks) can flip a step. */
export function markSetupStep(id: string) {
  useSetupScore.getState().markDone(id);
}
