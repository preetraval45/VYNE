import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "system",

      setTheme: (theme: ThemeMode) => set({ theme }),

      toggleTheme: () =>
        set((state) => {
          // Cycle: light -> dark -> system -> light
          if (state.theme === "light") return { theme: "dark" };
          if (state.theme === "dark") return { theme: "system" };
          return { theme: "light" };
        }),
    }),
    {
      name: "vyne-theme",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);

// ── Selector hooks ───────────────────────────────────────────────────

/** Returns the raw theme preference: 'light' | 'dark' | 'system' */
export const useTheme = () => useThemeStore((s) => s.theme);

/**
 * Returns true when the resolved theme is dark.
 * NOTE: This only reads the store value. For 'system' mode, the actual
 * resolved value is computed inside ThemeApplier via matchMedia.
 * Components that just need to know "is it dark right now?" should read
 * the data-theme attribute instead, or use the resolved value from ThemeApplier.
 */
export const useIsDark = () =>
  useThemeStore((s) => {
    if (s.theme === "dark") return true;
    if (s.theme === "light") return false;
    // For 'system', we check the browser preference (client-side only)
    if (
      typeof globalThis !== "undefined" &&
      typeof globalThis.matchMedia === "function"
    ) {
      return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
