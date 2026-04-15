"use client";

import { useEffect } from "react";

const STORAGE_KEY = "vyne-growth-settings";
const STYLE_ID = "vyne-tenant-css";

interface GrowthShape {
  customCss?: string;
}

/**
 * Loads tenant-specific custom CSS from Settings → Growth and injects it
 * into a managed <style> tag. Re-runs whenever localStorage changes, so
 * editing in one tab updates every other tab live.
 */
export function TenantCssInjector(): null {
  useEffect(() => {
    function apply() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as GrowthShape) : {};
        const css = parsed.customCss ?? "";
        let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!tag) {
          tag = document.createElement("style");
          tag.id = STYLE_ID;
          document.head.appendChild(tag);
        }
        tag.textContent = css;
      } catch {
        // ignore — bad JSON shouldn't break the page
      }
    }

    apply();

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) apply();
    }
    function onCustom() {
      apply();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("vyne:tenant-css-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vyne:tenant-css-changed", onCustom);
    };
  }, []);

  return null;
}
