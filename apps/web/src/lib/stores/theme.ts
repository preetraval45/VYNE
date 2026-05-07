import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable" | "spacious";
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

/** Font family option. The `stack` is what we actually write to
 *  `--font-app` so the user's choice cascades through every page.
 *  `googleHref` is set on Google-hosted families that aren't already
 *  bundled or @imported in globals.css; ThemeApplier will inject a
 *  <link rel="stylesheet"> on demand. */
export type FontKey =
  | "geist"
  | "inter"
  | "ibm-plex"
  | "space-grotesk"
  | "system"
  | "jetbrains";

export const FONT_OPTIONS: Record<
  FontKey,
  { label: string; stack: string; googleHref?: string; mono?: boolean }
> = {
  geist: {
    label: "Geist",
    stack:
      "var(--font-geist-sans), 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  inter: {
    label: "Inter",
    stack:
      "'Inter', var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  "ibm-plex": {
    label: "IBM Plex Sans",
    stack:
      "'IBM Plex Sans', var(--font-geist-sans), 'Inter', ui-sans-serif, system-ui, sans-serif",
    googleHref:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  },
  "space-grotesk": {
    label: "Space Grotesk",
    stack:
      "'Space Grotesk', var(--font-geist-sans), 'Inter', ui-sans-serif, system-ui, sans-serif",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
  system: {
    label: "System",
    stack:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  jetbrains: {
    label: "JetBrains Mono",
    stack:
      "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
    googleHref:
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
    mono: true,
  },
};

/** Decorative pattern behind the sidebar. `none` is the default; the rest
 *  are applied as a CSS class via `data-sidebar-pattern` on <html>. */
export type SidebarPattern = "none" | "dots" | "lines" | "noise" | "gradient";

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

/** Per-module accent override (Phase 10.6). When a moduleAccent entry
 *  is present for the current route's first segment, ThemeApplier
 *  rebinds `--vyne-accent-*` on each route change. */
export type ModuleId =
  | "crm"
  | "sales"
  | "finance"
  | "invoicing"
  | "projects"
  | "ops"
  | "manufacturing"
  | "purchase"
  | "hr"
  | "marketing"
  | "maintenance"
  | "ai"
  | "chat"
  | "code"
  | "observe"
  | "docs"
  | "contacts"
  | "automations"
  | "expenses";

export const MODULE_LABELS: Record<ModuleId, string> = {
  crm: "CRM",
  sales: "Sales",
  finance: "Finance",
  invoicing: "Invoicing",
  projects: "Projects",
  ops: "Operations",
  manufacturing: "Manufacturing",
  purchase: "Purchase",
  hr: "HR",
  marketing: "Marketing",
  maintenance: "Maintenance",
  ai: "AI",
  chat: "Chat",
  code: "Code",
  observe: "Observability",
  docs: "Documents",
  contacts: "Contacts",
  automations: "Automations",
  expenses: "Expenses",
};

interface ThemeStore {
  theme: ThemeMode;
  accent: AccentColor;
  /** Optional user-picked hex (#rrggbb). When present overrides the
   *  preset accent so the picker tool can express any colour. */
  customAccentHex: string | null;
  /** Optional user-picked workspace background hex (#rrggbb). When set
   *  ThemeApplier rebinds the surface family (--bg / --content-bg /
   *  --content-elevated / --sidebar-bg) so the entire chrome shifts. */
  customBgHex: string | null;
  /** Row height + padding scale. ThemeApplier maps this to `data-density`
   *  and a token family on `<html>`. */
  density: Density;
  /** App font family. Writes to --font-app on <html>. */
  font: FontKey;
  /** Decorative pattern behind the sidebar. Writes data-sidebar-pattern
   *  on <html>; CSS in globals.css matches and applies background-image. */
  sidebarPattern: SidebarPattern;
  /** Tenant brand logomark — data: URL or remote URL. Sidebar reads it
   *  via VyneLogo to stamp the workspace mark. (Phase 10.5) */
  logoUrl: string | null;
  /** Tenant favicon — data: URL or remote URL. ThemeApplier injects a
   *  <link rel="icon"> at app root. (Phase 10.5) */
  faviconUrl: string | null;
  /** Per-module accent override map. ThemeApplier rebinds the accent
   *  token family on every route change. (Phase 10.6) */
  moduleAccents: Partial<Record<ModuleId, string>>;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setCustomAccent: (hex: string | null) => void;
  setCustomBg: (hex: string | null) => void;
  setDensity: (density: Density) => void;
  setFont: (font: FontKey) => void;
  setSidebarPattern: (pattern: SidebarPattern) => void;
  setLogoUrl: (url: string | null) => void;
  setFaviconUrl: (url: string | null) => void;
  setModuleAccent: (id: ModuleId, hex: string | null) => void;
  /** Applies a partial theme bundle (used by import-from-JSON / preset
   *  buttons). Only fields present on the input are touched; unknown
   *  keys are ignored. */
  applyBundle: (bundle: Partial<ThemeBundle>) => void;
  toggleTheme: () => void;
}

/** Shape used by the export / import / preset feature so a workspace
 *  theme is a single portable JSON object. */
export interface ThemeBundle {
  theme: ThemeMode;
  accent: AccentColor;
  customAccentHex: string | null;
  customBgHex: string | null;
  density: Density;
  font: FontKey;
  sidebarPattern: SidebarPattern;
  logoUrl: string | null;
  faviconUrl: string | null;
  moduleAccents: Partial<Record<ModuleId, string>>;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      accent: "purple",
      customAccentHex: null,
      customBgHex: null,
      density: "comfortable",
      font: "geist",
      sidebarPattern: "none",
      logoUrl: null,
      faviconUrl: null,
      moduleAccents: {},

      setTheme: (theme: ThemeMode) => set({ theme }),
      // Picking a preset clears any custom hex so the preset wins.
      setAccent: (accent: AccentColor) =>
        set({ accent, customAccentHex: null }),
      setCustomAccent: (hex: string | null) => set({ customAccentHex: hex }),
      setCustomBg: (hex: string | null) => set({ customBgHex: hex }),
      setDensity: (density: Density) => set({ density }),
      setFont: (font: FontKey) => set({ font }),
      setSidebarPattern: (pattern: SidebarPattern) =>
        set({ sidebarPattern: pattern }),
      setLogoUrl: (url: string | null) => set({ logoUrl: url }),
      setFaviconUrl: (url: string | null) => set({ faviconUrl: url }),
      setModuleAccent: (id, hex) =>
        set((state) => {
          const next = { ...state.moduleAccents };
          if (hex === null || hex === "") delete next[id];
          else next[id] = hex;
          return { moduleAccents: next };
        }),
      applyBundle: (bundle) =>
        set((state) => ({
          theme: bundle.theme ?? state.theme,
          accent: bundle.accent ?? state.accent,
          customAccentHex:
            bundle.customAccentHex !== undefined
              ? bundle.customAccentHex
              : state.customAccentHex,
          customBgHex:
            bundle.customBgHex !== undefined
              ? bundle.customBgHex
              : state.customBgHex,
          density: bundle.density ?? state.density,
          font: bundle.font ?? state.font,
          sidebarPattern: bundle.sidebarPattern ?? state.sidebarPattern,
          logoUrl:
            bundle.logoUrl !== undefined ? bundle.logoUrl : state.logoUrl,
          faviconUrl:
            bundle.faviconUrl !== undefined
              ? bundle.faviconUrl
              : state.faviconUrl,
          moduleAccents: bundle.moduleAccents ?? state.moduleAccents,
        })),

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
      version: 7,
      migrate: (persistedState) => {
        const prev = (persistedState ?? {}) as Partial<{
          theme: ThemeMode;
          accent: AccentColor;
          customAccentHex: string | null;
          customBgHex: string | null;
          density: Density;
          font: FontKey;
          sidebarPattern: SidebarPattern;
          logoUrl: string | null;
          faviconUrl: string | null;
          moduleAccents: Partial<Record<ModuleId, string>>;
        }>;
        return {
          theme: prev.theme ?? "dark",
          accent: (prev.accent ?? "purple") as AccentColor,
          customAccentHex: prev.customAccentHex ?? null,
          customBgHex: prev.customBgHex ?? null,
          density: (prev.density ?? "comfortable") as Density,
          font: (prev.font ?? "geist") as FontKey,
          sidebarPattern: (prev.sidebarPattern ?? "none") as SidebarPattern,
          logoUrl: prev.logoUrl ?? null,
          faviconUrl: prev.faviconUrl ?? null,
          moduleAccents: prev.moduleAccents ?? {},
        };
      },
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        customAccentHex: state.customAccentHex,
        customBgHex: state.customBgHex,
        density: state.density,
        font: state.font,
        sidebarPattern: state.sidebarPattern,
        logoUrl: state.logoUrl,
        faviconUrl: state.faviconUrl,
        moduleAccents: state.moduleAccents,
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
