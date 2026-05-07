"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Accessibility preferences. Each field maps to a single CSS variable
 * or `data-*` attribute on `<html>` so the rest of the codebase can
 * read prefs without subscribing to the store.
 *
 * Toggles:
 *   - highContrast      → `data-contrast="high"`  (CSS bumps borders / text colour to AAA)
 *   - textScale         → `--text-scale`          (1.0 / 1.25 / 1.5)
 *   - reduceMotion      → `data-motion="reduce"`  (CSS disables transitions / animations)
 *   - underlineLinks    → `data-link-style="underline"`
 *   - direction         → `dir="ltr" | "rtl"` on `<html>`
 *
 * Wired by `<A11yApplier />` which mounts in the dashboard layout.
 */

export type TextScale = 1 | 1.25 | 1.5;
export type Direction = "ltr" | "rtl" | "auto";

export interface A11yPrefs {
  highContrast: boolean;
  textScale: TextScale;
  reduceMotion: boolean;
  underlineLinks: boolean;
  direction: Direction;
}

interface A11yStore extends A11yPrefs {
  set: (patch: Partial<A11yPrefs>) => void;
  reset: () => void;
}

const DEFAULT: A11yPrefs = {
  highContrast: false,
  textScale: 1,
  reduceMotion: false,
  underlineLinks: false,
  direction: "auto",
};

export const useA11y = create<A11yStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set({ ...DEFAULT }),
    }),
    { name: "vyne-a11y", version: 1 },
  ),
);
