"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Local-only voting state for /roadmap features. Records which feature
// ids the user has up-voted; the FeatureCard adds this delta on top of
// the fixture's base `votes` count.

interface RoadmapVotesState {
  voted: Record<string, boolean>;
  toggleVote: (featureId: string) => void;
  hasVoted: (featureId: string) => boolean;
  voteDelta: (featureId: string) => number;
}

export const useRoadmapVotesStore = create<RoadmapVotesState>()(
  persist(
    (set, get) => ({
      voted: {},
      toggleVote: (id) =>
        set((s) => {
          const next = { ...s.voted };
          if (next[id]) delete next[id];
          else next[id] = true;
          return { voted: next };
        }),
      hasVoted: (id) => Boolean(get().voted[id]),
      voteDelta: (id) => (get().voted[id] ? 1 : 0),
    }),
    { name: "vyne-roadmap-votes" },
  ),
);
