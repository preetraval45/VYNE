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
  | "indigo"
  | "pink"
  | "yellow"
  | "violet"
  | "lime"
  | "rose"
  | "amber"
  | "sky";

export const ACCENT_COLORS: Record<
  AccentColor,
  { primary: string; light: string; dark: string; label: string }
> = {
  purple: { primary: "#06B6D4", light: "#22D3EE", dark: "#0E7490", label: "Cyan" },
  blue:   { primary: "#3B82F6", light: "#60A5FA", dark: "#2563EB", label: "Blue" },
  teal:   { primary: "#14B8A6", light: "#2DD4BF", dark: "#0D9488", label: "Teal" },
  red:    { primary: "#EF4444", light: "#F87171", dark: "#DC2626", label: "Red" },
  orange: { primary: "#F97316", light: "#FB923C", dark: "#EA580C", label: "Orange" },
  green:  { primary: "#22C55E", light: "#4ADE80", dark: "#16A34A", label: "Green" },
  indigo: { primary: "#6366F1", light: "#818CF8", dark: "#4338CA", label: "Indigo" },
  pink:   { primary: "#EC4899", light: "#F472B6", dark: "#BE185D", label: "Pink" },
  yellow: { primary: "#EAB308", light: "#FACC15", dark: "#A16207", label: "Yellow" },
  violet: { primary: "#8B5CF6", light: "#A78BFA", dark: "#6D28D9", label: "Violet" },
  lime:   { primary: "#84CC16", light: "#A3E635", dark: "#65A30D", label: "Lime" },
  rose:   { primary: "#F43F5E", light: "#FB7185", dark: "#BE123C", label: "Rose" },
  amber:  { primary: "#F59E0B", light: "#FBBF24", dark: "#B45309", label: "Amber" },
  sky:    { primary: "#0EA5E9", light: "#38BDF8", dark: "#0369A1", label: "Sky" },
};

interface ThemeStore {
  theme: ThemeMode;
  accent: AccentColor;
  /** Optional user-picked hex (#rrggbb). When present overrides the
   *  preset accent so the picker tool can express any colour. */
  customAccentHex: string | null;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setCustomAccent: (hex: string | null) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      accent: "purple",
      customAccentHex: null,

      setTheme: (theme: ThemeMode) => set({ theme }),
      // Picking a preset clears any custom hex so the preset wins.
      setAccent: (accent: AccentColor) =>
        set({ accent, customAccentHex: null }),
      setCustomAccent: (hex: string | null) => set({ customAccentHex: hex }),

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
      version: 3,
      migrate: (persistedState) => {
        const prev = (persistedState ?? {}) as Partial<{
          theme: ThemeMode;
          accent: AccentColor;
          customAccentHex: string | null;
        }>;
        return {
          theme: prev.theme ?? "dark",
          accent: (prev.accent ?? "purple") as AccentColor,
          customAccentHex: prev.customAccentHex ?? null,
        };
      },
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        customAccentHex: state.customAccentHex,
      }),
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
