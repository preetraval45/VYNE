"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Vyne AI compound-memory store ───────────────────────────────
//
// Every Q&A the user has with Vyne AI, every morning brief it
// delivers, and the weekly compass intention are persisted locally
// so the product gets *more valuable the longer you use it* (the
// founder memo this was shaped from). Server-side persistence comes
// later; this keeps it functional without backend changes.

export interface Session {
  id: string;
  /** ISO string */
  createdAt: string;
  /** Owner — every record is filtered by current user before display. */
  userId?: string;
  /** The user's question / night prompt */
  question: string;
  /** Vyne AI's reply */
  answer: string;
  /** Optional list of [kind:id] citations returned by the route */
  citations?: Array<{ kind: string; id: string; label: string }>;
}

export interface MorningBrief {
  id: string;
  /** ISO string pinned to the LOCAL date, 07:00 */
  createdAt: string;
  userId?: string;
  summary: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
}

export interface Compass {
  /** Start of the ISO week the intention covers (Sunday 00:00 local) */
  weekStart: string;
  intention: string;
}

export interface MemoryFact {
  id: string;
  text: string;
  /** ISO string */
  createdAt: string;
  userId?: string;
}

export type AiModel = "haiku" | "sonnet" | "opus";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Owner — only this user sees this conversation in the sidebar. */
  userId?: string;
  /** First user message — used as the title preview. */
  title: string;
  pinned?: boolean;
  messages: ConversationMessage[];
  /** Per-conversation context the AI treats as ground truth for THIS
   *  thread only ("we're testing iOS, not Android"). Merged with the
   *  global memory facts when the request hits the streaming endpoint. */
  scopedMemory?: string[];
}

interface AiMemoryStore {
  sessions: Session[];
  briefs: MorningBrief[];
  compass: Compass | null;
  /** Persistent user-stated facts that survive conversations
   *  ("we use Postgres, not MySQL", "Sarah is the design lead"). */
  facts: MemoryFact[];
  /** Preferred Vyne AI model. */
  preferredModel: AiModel;
  /** Multi-turn conversations — newest first. */
  conversations: Conversation[];
  /** Currently-loaded conversation; null = fresh chat. */
  activeConversationId: string | null;
  /** Day-string (YYYY-MM-DD) of the last chat or brief */
  lastActiveDate: string | null;
  /** Currently-signed-in user id. Set by /ai/chat from the auth store
   *  on mount; every write tags the new record so reads can filter. */
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;

  addSession: (s: Omit<Session, "id" | "createdAt">) => Session;
  addBrief: (b: Omit<MorningBrief, "id" | "createdAt">) => MorningBrief;
  setCompass: (intention: string) => void;
  addFact: (text: string) => MemoryFact | null;
  removeFact: (id: string) => void;
  setPreferredModel: (m: AiModel) => void;

  /** Conversation CRUD */
  createConversation: (firstUserMessage?: string) => Conversation;
  setActiveConversation: (id: string | null) => void;
  appendMessage: (
    conversationId: string,
    msg: Omit<ConversationMessage, "id">,
  ) => ConversationMessage;
  updateLastAssistantMessage: (
    conversationId: string,
    patch: Partial<ConversationMessage>,
  ) => void;
  togglePinConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;

  clearAll: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const dayKey = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const startOfWeek = (d = new Date()) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - c.getDay()); // Sunday anchor
  return c.toISOString();
};

export const useAiMemoryStore = create<AiMemoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      briefs: [],
      compass: null,
      facts: [],
      preferredModel: "sonnet" as AiModel,
      conversations: [],
      activeConversationId: null,
      lastActiveDate: null,
      currentUserId: null,

      setCurrentUserId: (id) => set(() => ({ currentUserId: id })),

      addSession: (s) => {
        const session: Session = {
          ...s,
          id: newId(),
          createdAt: new Date().toISOString(),
          userId: get().currentUserId ?? undefined,
        };
        set((state) => ({
          // keep newest first, cap at 500 to avoid localStorage bloat
          sessions: [session, ...state.sessions].slice(0, 500),
          lastActiveDate: dayKey(session.createdAt),
        }));
        return session;
      },

      addBrief: (b) => {
        const brief: MorningBrief = {
          ...b,
          id: newId(),
          createdAt: new Date().toISOString(),
          userId: get().currentUserId ?? undefined,
        };
        set((state) => ({
          briefs: [brief, ...state.briefs].slice(0, 90),
          lastActiveDate: dayKey(brief.createdAt),
        }));
        return brief;
      },

      setCompass: (intention) =>
        set(() => ({
          compass: { weekStart: startOfWeek(), intention },
        })),

      addFact: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        const fact: MemoryFact = {
          id: newId(),
          text: trimmed,
          createdAt: new Date().toISOString(),
          userId: get().currentUserId ?? undefined,
        };
        set((state) => ({
          // newest first, cap at 50 to keep system prompt size sane
          facts: [fact, ...state.facts].slice(0, 50),
        }));
        return fact;
      },

      removeFact: (id) =>
        set((state) => ({
          facts: state.facts.filter((f) => f.id !== id),
        })),

      setPreferredModel: (m) => set(() => ({ preferredModel: m })),

      createConversation: (firstUserMessage) => {
        const now = new Date().toISOString();
        const conv: Conversation = {
          id: newId(),
          createdAt: now,
          updatedAt: now,
          userId: get().currentUserId ?? undefined,
          title: (firstUserMessage ?? "New conversation")
            .trim()
            .slice(0, 80),
          messages: [],
        };
        set((state) => ({
          conversations: [conv, ...state.conversations].slice(0, 200),
          activeConversationId: conv.id,
        }));
        return conv;
      },

      setActiveConversation: (id) =>
        set(() => ({ activeConversationId: id })),

      appendMessage: (conversationId, msg) => {
        const message: ConversationMessage = {
          ...msg,
          id: newId(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  // Keep first user message as the title if not yet set
                  title:
                    c.title === "New conversation" && msg.role === "user"
                      ? msg.content.slice(0, 80)
                      : c.title,
                  messages: [...c.messages, message],
                }
              : c,
          ),
        }));
        return message;
      },

      updateLastAssistantMessage: (conversationId, patch) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const idx = (() => {
              for (let i = c.messages.length - 1; i >= 0; i--) {
                if (c.messages[i].role === "assistant") return i;
              }
              return -1;
            })();
            if (idx < 0) return c;
            const next = [...c.messages];
            next[idx] = { ...next[idx], ...patch };
            return { ...c, updatedAt: new Date().toISOString(), messages: next };
          }),
        })),

      togglePinConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c,
          ),
        })),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id
              ? null
              : state.activeConversationId,
        })),

      renameConversation: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? { ...c, title: title.trim().slice(0, 120) || c.title }
              : c,
          ),
        })),

      clearAll: () =>
        set(() => ({
          sessions: [],
          briefs: [],
          compass: null,
          facts: [],
          conversations: [],
          activeConversationId: null,
          lastActiveDate: null,
        })),
    }),
    {
      name: "vyne-ai-memory",
      version: 4,
      // Migrate from v3 → v4: drop everything that wasn't tagged with a
      // userId (it could belong to anyone on this device). Fresh start
      // per user is the safer default.
      migrate: (state, fromVersion) => {
        if (fromVersion < 4) {
          return {
            ...(state as object),
            conversations: [],
            sessions: [],
            briefs: [],
            facts: [],
            activeConversationId: null,
            currentUserId: null,
          } as unknown as AiMemoryStore;
        }
        return state as AiMemoryStore;
      },
    },
  ),
);

// ─── Helpers ─────────────────────────────────────────────────────

/** Unique day-keys touched in the sessions+briefs history. */
function activeDays(state: { sessions: Session[]; briefs: MorningBrief[] }): string[] {
  const s = new Set<string>();
  for (const x of state.sessions) s.add(dayKey(x.createdAt));
  for (const x of state.briefs) s.add(dayKey(x.createdAt));
  return Array.from(s).sort().reverse(); // newest first
}

/**
 * Current streak with grace: if the most recent active day is today
 * or yesterday, count backward allowing a single-day gap per 7 days.
 */
export function computeStreak(state: {
  sessions: Session[];
  briefs: MorningBrief[];
}): { current: number; longest: number; graceUsed: boolean } {
  const days = activeDays(state);
  if (days.length === 0) return { current: 0, longest: 0, graceUsed: false };

  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());

  if (days[0] !== today && days[0] !== yesterday) {
    // broken — just compute longest
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]).getTime();
      const cur = new Date(days[i]).getTime();
      const gap = Math.round((prev - cur) / 86400000);
      if (gap === 1) run++;
      else {
        longest = Math.max(longest, run);
        run = 1;
      }
    }
    longest = Math.max(longest, run);
    return { current: 0, longest, graceUsed: false };
  }

  let current = 1;
  let graceUsed = false;
  let cursor = new Date(days[0]).getTime();
  for (let i = 1; i < days.length; i++) {
    const t = new Date(days[i]).getTime();
    const gap = Math.round((cursor - t) / 86400000);
    if (gap === 1) {
      current++;
      cursor = t;
    } else if (gap === 2 && !graceUsed) {
      // use grace: missed 1 day
      graceUsed = true;
      current++;
      cursor = t;
    } else {
      break;
    }
  }
  return { current, longest: Math.max(current, current), graceUsed };
}

export function isCompassFresh(compass: Compass | null): boolean {
  if (!compass) return false;
  return compass.weekStart === startOfWeek();
}
