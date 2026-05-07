"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Personalization store — every per-user knob the workspace exposes
 * outside of the theme + a11y + i18n stores.
 *
 * Covers Phase 24:
 *   24.1 sidebarOrder    — module ordering on the sidebar
 *   24.2 pinnedRecords   — starred records bubbled to a sidebar group
 *   24.3 recentlyViewed  — last-N records visited (LRU)
 *   24.4 landingPage     — `home` / `dashboard` / module / specific record
 *   24.5 quickActions    — up to 6 custom shortcut tiles in the topbar
 *   24.7 commandHistory  — Cmd+K recent submissions
 *   24.9 welcome         — { greeting, photoUrl } shown on /home
 *
 * The theme store carries colours / density / fonts / sidebar pattern
 * (Phase 7); this store is *behaviour* — what surfaces appear, in
 * what order, and what the user sees first.
 */

export type ModuleId =
  | "home"
  | "ai"
  | "automations"
  | "chat"
  | "code"
  | "contacts"
  | "crm"
  | "docs"
  | "expenses"
  | "finance"
  | "hr"
  | "invoicing"
  | "maintenance"
  | "manufacturing"
  | "marketing"
  | "observe"
  | "ops"
  | "purchase"
  | "reporting"
  | "roadmap"
  | "sales"
  | "settings"
  | "projects"
  | "calendar"
  | "activity"
  | "timeline"
  | "timesheet"
  | "training"
  | "playbooks"
  | "runbooks"
  | "help"
  | "dashboard";

export type LandingTarget =
  /** Always /home (default). */
  | { type: "home" }
  /** Always /dashboard. */
  | { type: "dashboard" }
  /** Open a specific module. */
  | { type: "module"; module: ModuleId }
  /** Deep-link a specific record. e.g. type "deal", id "DEAL-42". */
  | { type: "record"; entity: string; id: string };

export interface PinnedRecord {
  id: string;
  /** Canonical "type:id" — `deal:DEAL-42`. */
  ref: string;
  /** Display label. */
  label: string;
  /** Module the record belongs to (used for the sidebar group icon). */
  module: ModuleId;
  /** Optional pinned-at ISO. */
  pinnedAt: string;
}

export interface RecentRecord {
  ref: string;
  label: string;
  module: ModuleId;
  href: string;
  visitedAt: string;
}

export interface QuickAction {
  id: string;
  label: string;
  /** Icon name from lucide-react (looked up at render time). */
  icon: string;
  /** Click target. Internal route preferred. */
  href?: string;
  /** Or fire a CustomEvent the host page handles (e.g. "vyne:open-notes"). */
  emit?: string;
  createdAt: string;
}

export interface WelcomeBlock {
  /** Free-form headline shown above the home dashboard. */
  greeting: string;
  /** Optional photo URL (e.g. team selfie / pet) — stamped into a 88×88 hero. */
  photoUrl?: string;
}

interface PersonalizationStore {
  sidebarOrder: ModuleId[];
  pinned: PinnedRecord[];
  recent: RecentRecord[];
  landing: LandingTarget;
  quickActions: QuickAction[];
  commandHistory: string[];
  welcome: WelcomeBlock;

  // Sidebar
  setSidebarOrder: (order: ModuleId[]) => void;
  moveSidebarModule: (module: ModuleId, direction: "up" | "down") => void;

  // Pins
  pinRecord: (record: Omit<PinnedRecord, "id" | "pinnedAt">) => PinnedRecord;
  unpinRecord: (ref: string) => void;
  isPinned: (ref: string) => boolean;

  // Recents
  recordVisit: (record: Omit<RecentRecord, "visitedAt">) => void;
  clearRecent: () => void;

  // Landing
  setLanding: (target: LandingTarget) => void;
  resolveLandingHref: () => string;

  // Quick actions
  addQuickAction: (
    payload: Omit<QuickAction, "id" | "createdAt">,
  ) => QuickAction;
  removeQuickAction: (id: string) => void;
  reorderQuickActions: (ids: string[]) => void;

  // Cmd+K history
  recordCommand: (input: string) => void;
  clearCommandHistory: () => void;

  // Welcome
  setWelcome: (patch: Partial<WelcomeBlock>) => void;
  resetWelcome: () => void;

  // Whole-store reset
  reset: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pers-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_SIDEBAR: ModuleId[] = [
  "home",
  "dashboard",
  "ai",
  "chat",
  "calendar",
  "crm",
  "sales",
  "contacts",
  "projects",
  "ops",
  "invoicing",
  "finance",
  "expenses",
  "hr",
  "marketing",
  "code",
  "observe",
  "maintenance",
  "manufacturing",
  "purchase",
  "automations",
  "playbooks",
  "runbooks",
  "roadmap",
  "reporting",
  "docs",
  "training",
  "activity",
  "timeline",
  "timesheet",
  "help",
  "settings",
];

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "qa-new-issue",
    label: "New issue",
    icon: "Plus",
    emit: "vyne:open-create-issue",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "qa-cmdk",
    label: "Search",
    icon: "Search",
    emit: "vyne:open-cmdk",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "qa-notes",
    label: "Quick note",
    icon: "StickyNote",
    emit: "vyne:open-notes",
    createdAt: new Date(0).toISOString(),
  },
];

const DEFAULT_LANDING: LandingTarget = { type: "home" };
const DEFAULT_WELCOME: WelcomeBlock = { greeting: "" };

const MAX_RECENT = 12;
const MAX_HISTORY = 50;
const MAX_QUICK_ACTIONS = 6;

export const usePersonalization = create<PersonalizationStore>()(
  persist(
    (set, get) => ({
      sidebarOrder: DEFAULT_SIDEBAR,
      pinned: [],
      recent: [],
      landing: DEFAULT_LANDING,
      quickActions: DEFAULT_QUICK_ACTIONS,
      commandHistory: [],
      welcome: DEFAULT_WELCOME,

      // ── Sidebar ────────────────────────────────────────────────
      setSidebarOrder: (order) => set({ sidebarOrder: order }),
      moveSidebarModule: (module, direction) =>
        set((s) => {
          const order = [...s.sidebarOrder];
          const idx = order.indexOf(module);
          if (idx < 0) return s;
          const swap = direction === "up" ? idx - 1 : idx + 1;
          if (swap < 0 || swap >= order.length) return s;
          [order[idx], order[swap]] = [order[swap], order[idx]];
          return { sidebarOrder: order };
        }),

      // ── Pins ───────────────────────────────────────────────────
      pinRecord: (record) => {
        const existing = get().pinned.find((p) => p.ref === record.ref);
        if (existing) return existing;
        const row: PinnedRecord = {
          id: newId(),
          pinnedAt: new Date().toISOString(),
          ...record,
        };
        set((s) => ({ pinned: [row, ...s.pinned] }));
        return row;
      },
      unpinRecord: (ref) =>
        set((s) => ({ pinned: s.pinned.filter((p) => p.ref !== ref) })),
      isPinned: (ref) => get().pinned.some((p) => p.ref === ref),

      // ── Recents ────────────────────────────────────────────────
      recordVisit: (record) => {
        const ts = new Date().toISOString();
        set((s) => ({
          recent: [
            { ...record, visitedAt: ts },
            ...s.recent.filter((r) => r.ref !== record.ref),
          ].slice(0, MAX_RECENT),
        }));
      },
      clearRecent: () => set({ recent: [] }),

      // ── Landing ────────────────────────────────────────────────
      setLanding: (target) => set({ landing: target }),
      resolveLandingHref: () => {
        const t = get().landing;
        switch (t.type) {
          case "home":
            return "/home";
          case "dashboard":
            return "/dashboard";
          case "module":
            return `/${t.module}`;
          case "record":
            return `/${t.entity}/${t.id}`;
          default:
            return "/home";
        }
      },

      // ── Quick actions ──────────────────────────────────────────
      addQuickAction: (payload) => {
        const row: QuickAction = {
          id: newId(),
          createdAt: new Date().toISOString(),
          ...payload,
        };
        set((s) => ({
          quickActions: [row, ...s.quickActions].slice(0, MAX_QUICK_ACTIONS),
        }));
        return row;
      },
      removeQuickAction: (id) =>
        set((s) => ({
          quickActions: s.quickActions.filter((q) => q.id !== id),
        })),
      reorderQuickActions: (ids) =>
        set((s) => {
          const map = new Map(s.quickActions.map((q) => [q.id, q]));
          const next: QuickAction[] = [];
          for (const id of ids) {
            const q = map.get(id);
            if (q) {
              next.push(q);
              map.delete(id);
            }
          }
          return { quickActions: [...next, ...map.values()] };
        }),

      // ── Cmd+K history ─────────────────────────────────────────
      recordCommand: (input) => {
        const trimmed = input.trim();
        if (!trimmed) return;
        set((s) => ({
          commandHistory: [
            trimmed,
            ...s.commandHistory.filter((c) => c !== trimmed),
          ].slice(0, MAX_HISTORY),
        }));
      },
      clearCommandHistory: () => set({ commandHistory: [] }),

      // ── Welcome ───────────────────────────────────────────────
      setWelcome: (patch) =>
        set((s) => ({ welcome: { ...s.welcome, ...patch } })),
      resetWelcome: () => set({ welcome: DEFAULT_WELCOME }),

      // ── Reset ─────────────────────────────────────────────────
      reset: () =>
        set({
          sidebarOrder: DEFAULT_SIDEBAR,
          pinned: [],
          recent: [],
          landing: DEFAULT_LANDING,
          quickActions: DEFAULT_QUICK_ACTIONS,
          commandHistory: [],
          welcome: DEFAULT_WELCOME,
        }),
    }),
    { name: "vyne-personalization", version: 1 },
  ),
);

// ── Module-level helpers (non-React paths) ────────────────────────

export function recordVisit(record: Omit<RecentRecord, "visitedAt">) {
  usePersonalization.getState().recordVisit(record);
}

export function recordCommand(input: string) {
  usePersonalization.getState().recordCommand(input);
}
