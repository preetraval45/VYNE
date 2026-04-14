import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Snippet {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  category: "chat" | "docs" | "email" | "other";
  updatedAt: string;
}

interface SnippetsStore {
  snippets: Snippet[];

  create: (data: Omit<Snippet, "id" | "updatedAt">) => Snippet;
  update: (id: string, patch: Partial<Omit<Snippet, "id">>) => void;
  remove: (id: string) => void;
  findByShortcut: (shortcut: string) => Snippet | undefined;
}

const SEED: Snippet[] = [
  {
    id: "s-eta",
    shortcut: "/eta",
    title: "ETA reminder",
    body: "Thanks for the ping — I'll have an update for you by EOD. If anything shifts I'll post in this thread.",
    category: "chat",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s-onboard",
    shortcut: "/onboard",
    title: "Welcome new member",
    body: "Welcome to the team! 🎉 A few links to get you started:\n• Start here: /docs/onboarding\n• Ask me or the #help channel if you get stuck.",
    category: "chat",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s-po",
    shortcut: "/po",
    title: "PO follow-up",
    body: "Quick follow-up on PO-{{number}} — we're waiting on confirmation from your side to release the next batch. Let me know if anything blocks this.",
    category: "email",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s-meeting",
    shortcut: "/mtg",
    title: "Meeting notes template",
    body: "## {{Date}} — {{Topic}}\n\n**Attendees:** \n**Decisions:** \n**Action items:** \n  - [ ] \n",
    category: "docs",
    updatedAt: new Date().toISOString(),
  },
];

export const useSnippetsStore = create<SnippetsStore>()(
  persist(
    (set, get) => ({
      snippets: SEED,

      create: (data) => {
        const snippet: Snippet = {
          ...data,
          id: `s-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ snippets: [snippet, ...state.snippets] }));
        return snippet;
      },

      update: (id, patch) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id
              ? { ...s, ...patch, updatedAt: new Date().toISOString() }
              : s,
          ),
        })),

      remove: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),

      findByShortcut: (shortcut) =>
        get().snippets.find(
          (s) => s.shortcut.toLowerCase() === shortcut.toLowerCase(),
        ),
    }),
    {
      name: "vyne-snippets",
      partialize: (state) => ({ snippets: state.snippets }),
    },
  ),
);
