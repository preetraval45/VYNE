"use client";

import { useEffect, useCallback } from "react";
import { useTheme } from "@/lib/stores/theme";

/**
 * Reads the theme preference from Zustand and applies data-theme="light"|"dark"
 * on <html>. When mode is 'system', it listens for OS preference changes.
 */
export function ThemeApplier() {
  const theme = useTheme();

  const applyTheme = useCallback((resolved: "light" | "dark") => {
    document.documentElement.dataset.theme = resolved;
  }, []);

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

    // Apply immediately
    resolve();

    // Listen for OS-level theme changes
    mq.addEventListener("change", resolve);
    return () => mq.removeEventListener("change", resolve);
  }, [theme, applyTheme]);

  return null;
}
