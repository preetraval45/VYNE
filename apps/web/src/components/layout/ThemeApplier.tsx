"use client";

import { useEffect, useCallback } from "react";
import { useTheme, useThemeStore, ACCENT_COLORS } from "@/lib/stores/theme";

/**
 * Reads theme + accent preferences from Zustand and applies:
 * - data-theme="light"|"dark" on <html>
 * - --vyne-purple, --vyne-purple-light, --vyne-purple-dark CSS variables
 * When mode is 'system', listens for OS preference changes.
 */
export function ThemeApplier() {
  const theme = useTheme();
  const accent = useThemeStore((s) => s.accent);

  const applyTheme = useCallback((resolved: "light" | "dark") => {
    document.documentElement.dataset.theme = resolved;
  }, []);

  // Apply accent color as CSS variables
  useEffect(() => {
    const colors = ACCENT_COLORS[accent];
    if (!colors) return;
    document.documentElement.style.setProperty("--vyne-purple", colors.primary);
    document.documentElement.style.setProperty(
      "--vyne-purple-light",
      colors.light,
    );
    document.documentElement.style.setProperty(
      "--vyne-purple-dark",
      colors.dark,
    );
  }, [accent]);

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
