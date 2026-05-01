"use client";

import { useEffect, useCallback } from "react";
import { useTheme, useThemeStore, ACCENT_COLORS } from "@/lib/stores/theme";

/**
 * Reads theme + accent preferences from Zustand and applies:
 * - data-theme="light"|"dark" on <html>
 * - --vyne-accent / --vyne-purple / --vyne-teal token family on <html>
 *
 * "Accent" is a single source of truth — all the brand tokens are derived
 * from it so when the user picks a colour in Settings the entire UI
 * (highlights, focus rings, FAB, sidebar accent dot, status pills,
 * link colour, gradient avatars) recolours instantly.
 *
 * When mode is 'system', listens for OS preference changes.
 */
export function ThemeApplier() {
  const theme = useTheme();
  const accent = useThemeStore((s) => s.accent);
  const customAccentHex = useThemeStore((s) => s.customAccentHex);
  const customBgHex = useThemeStore((s) => s.customBgHex);
  const density = useThemeStore((s) => s.density);

  const applyTheme = useCallback((resolved: "light" | "dark") => {
    document.documentElement.dataset.theme = resolved;
  }, []);

  // Apply custom workspace background. We rebind the surface token
  // family so app shell, sidebar, cards, and inputs all shift together.
  // Elevated / border variants are derived by lightening or darkening
  // the chosen background depending on perceived luminance.
  useEffect(() => {
    const root = document.documentElement;
    if (!customBgHex || !/^#?[0-9a-f]{6}$/i.test(customBgHex)) {
      // Clear overrides so the default :root and [data-theme] tokens win.
      for (const v of [
        "--bg",
        "--content-bg",
        "--content-elevated",
        "--content-border",
        "--sidebar-bg",
        "--input-bg",
      ]) {
        root.style.removeProperty(v);
      }
      return;
    }
    const bg = customBgHex.startsWith("#") ? customBgHex : `#${customBgHex}`;
    const rgb = hexToRgb(bg);
    if (!rgb) return;
    // Perceived luminance — anything ≥ 140 is "light-ish"; on light bgs
    // we darken for elevation, on dark bgs we lighten.
    const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    const isLight = lum >= 140;
    const elevated = isLight ? mixHex(bg, "#000000", 0.04) : mixHex(bg, "#FFFFFF", 0.06);
    const border = isLight ? mixHex(bg, "#000000", 0.10) : mixHex(bg, "#FFFFFF", 0.12);
    const sidebar = isLight ? mixHex(bg, "#000000", 0.02) : mixHex(bg, "#FFFFFF", 0.03);
    const input = isLight ? mixHex(bg, "#000000", 0.03) : mixHex(bg, "#FFFFFF", 0.05);

    root.style.setProperty("--bg", bg);
    root.style.setProperty("--content-bg", bg);
    root.style.setProperty("--content-elevated", elevated);
    root.style.setProperty("--content-border", border);
    root.style.setProperty("--sidebar-bg", sidebar);
    root.style.setProperty("--input-bg", input);
    document.body.style.background = bg;
  }, [customBgHex]);

  // Apply density token family. Component CSS reads these so a single
  // toggle scales padding, row heights, and font sizes coherently.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = density;
    const tokens =
      density === "compact"
        ? {
            "--density-row-h": "32px",
            "--density-pad-card": "10px 12px",
            "--density-pad-row": "6px 10px",
            "--density-gap": "6px",
            "--density-font": "12.5px",
          }
        : density === "spacious"
          ? {
              "--density-row-h": "52px",
              "--density-pad-card": "20px 22px",
              "--density-pad-row": "14px 18px",
              "--density-gap": "14px",
              "--density-font": "14.5px",
            }
          : {
              "--density-row-h": "40px",
              "--density-pad-card": "14px 16px",
              "--density-pad-row": "10px 14px",
              "--density-gap": "10px",
              "--density-font": "13.5px",
            };
    for (const [k, v] of Object.entries(tokens)) {
      root.style.setProperty(k, v);
    }
  }, [density]);

  // Apply accent color as CSS variables. If the user has set a custom
  // hex via the picker tool we derive light/dark by lightening/darkening
  // the primary so every brand surface still recolours coherently.
  useEffect(() => {
    const preset = ACCENT_COLORS[accent];
    let primary: string;
    let light: string;
    let dark: string;

    if (customAccentHex && /^#?[0-9a-f]{6}$/i.test(customAccentHex)) {
      primary = customAccentHex.startsWith("#") ? customAccentHex : `#${customAccentHex}`;
      light = mixHex(primary, "#FFFFFF", 0.25);
      dark = mixHex(primary, "#000000", 0.25);
    } else if (preset) {
      primary = preset.primary;
      light = preset.light;
      dark = preset.dark;
    } else {
      return;
    }

    const rgb = hexToRgb(primary);
    const rgbStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "6, 182, 212";

    const colors = { primary, light, dark };

    const root = document.documentElement;

    // Primary triad (legacy "purple" name kept so existing code still
    // resolves; "accent" is the new canonical name).
    root.style.setProperty("--vyne-purple", colors.primary);
    root.style.setProperty("--vyne-purple-light", colors.light);
    root.style.setProperty("--vyne-purple-dark", colors.dark);
    root.style.setProperty("--vyne-accent", colors.primary);
    root.style.setProperty("--vyne-accent-light", colors.light);
    root.style.setProperty("--vyne-accent-dark", colors.dark);
    root.style.setProperty("--vyne-accent-rgb", rgbStr);

    // Tints / rings derived from the accent so brand surfaces (chips,
    // chat bubbles, citation pills, focus halos, deal stage badges)
    // recolour automatically.
    root.style.setProperty("--vyne-accent-soft", `rgba(${rgbStr}, 0.10)`);
    root.style.setProperty("--vyne-accent-ring", `rgba(${rgbStr}, 0.25)`);
    root.style.setProperty("--vyne-accent-deep", colors.dark);

    // Older "teal-*" names — many pages still reference these. Re-bind
    // them to the new accent so the picker works everywhere without a
    // per-page sweep.
    root.style.setProperty("--vyne-teal", colors.primary);
    root.style.setProperty("--vyne-teal-light", colors.light);
    root.style.setProperty("--vyne-teal-dark", colors.dark);
    root.style.setProperty("--vyne-teal-soft", `rgba(${rgbStr}, 0.10)`);
    root.style.setProperty("--vyne-teal-ring", `rgba(${rgbStr}, 0.25)`);
    root.style.setProperty("--vyne-teal-deep", colors.dark);
    root.style.setProperty("--teal-400", colors.light);
    root.style.setProperty("--teal-500", colors.primary);
    root.style.setProperty("--teal-600", colors.dark);
    root.style.setProperty("--teal-700", colors.dark);
    root.style.setProperty("--teal-800", colors.dark);

    // Sidebar accent dot + active rail glow.
    root.style.setProperty("--sidebar-accent", colors.primary);
    root.style.setProperty("--sidebar-hover", `rgba(${rgbStr}, 0.10)`);

    // Input focus ring + alert/highlight cards.
    root.style.setProperty("--input-focus-border", colors.primary);
    root.style.setProperty(
      "--input-focus-shadow",
      `0 0 0 3px rgba(${rgbStr}, 0.18)`,
    );
    root.style.setProperty(
      "--alert-purple-bg",
      `rgba(${rgbStr}, 0.08)`,
    );
    root.style.setProperty(
      "--alert-purple-border",
      `rgba(${rgbStr}, 0.28)`,
    );
    root.style.setProperty("--alert-purple-text", colors.dark);
  }, [accent, customAccentHex]);

  // Apply theme mode
  useEffect(() => {
    if (theme === "light" || theme === "dark") {
      applyTheme(theme);
      return;
    }

    // theme === 'system' — resolve from OS preference
    const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");

    function resolve() {
      applyTheme(mq.matches ? "dark" : "light");
    }

    resolve();

    mq.addEventListener("change", resolve);
    return () => mq.removeEventListener("change", resolve);
  }, [theme, applyTheme]);

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Linear blend in sRGB. amt=0 → a, amt=1 → b. Good enough for picking
 *  light/dark variants from a user-chosen primary without dragging in
 *  an HSL conversion. */
function mixHex(a: string, b: string, amt: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const r = Math.round(ra.r + (rb.r - ra.r) * amt);
  const g = Math.round(ra.g + (rb.g - ra.g) * amt);
  const bch = Math.round(ra.b + (rb.b - ra.b) * amt);
  return `#${[r, g, bch].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
