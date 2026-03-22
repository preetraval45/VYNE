import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "purple"
  | "blue"
  | "teal"
  | "red"
  | "orange"
  | "green"
  | "indigo";

export const ACCENT_COLORS: Record<
  AccentColor,
  { primary: string; light: string; dark: string; label: string }
> = {
  purple: {
    primary: "#6C47FF",
    light: "#8B6BFF",
    dark: "#5235CC",
    label: "Purple",
  },
  blue: {
    primary: "#3B82F6",
    light: "#60A5FA",
    dark: "#2563EB",
    label: "Blue",
  },
  teal: {
    primary: "#14B8A6",
    light: "#2DD4BF",
    dark: "#0D9488",
    label: "Teal",
  },
  red: { primary: "#EF4444", light: "#F87171", dark: "#DC2626", label: "Red" },
  orange: {
    primary: "#F97316",
    light: "#FB923C",
    dark: "#EA580C",
    label: "Orange",
  },
  green: {
    primary: "#22C55E",
    light: "#4ADE80",
    dark: "#16A34A",
    label: "Green",
  },
  indigo: {
    primary: "#6366F1",
    light: "#818CF8",
    dark: "#4F46E5",
    label: "Indigo",
  },
};

interface ThemeStore {
  theme: ThemeMode;
  accent: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "system",
      accent: "purple",

      setTheme: (theme: ThemeMode) => set({ theme }),
      setAccent: (accent: AccentColor) => set({ accent }),

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
      partialize: (state) => ({ theme: state.theme, accent: state.accent }),
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
