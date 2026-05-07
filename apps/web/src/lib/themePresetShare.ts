"use client";

import { useThemeStore, type ThemeBundle } from "@/lib/stores/theme";

/**
 * Theme preset share helpers (24.8).
 *
 *   const url = buildThemeShareUrl(bundle);   // → /theme/share?p=…
 *   await applyThemeFromUrl(window.location); // call on /theme/share mount
 *
 * The bundle is base64url-encoded JSON so the URL stays a single
 * shareable string. Saving as a named preset uses the local theme
 * store; sharing produces a URL that any teammate can paste to apply
 * the same colours / font / density / pattern in one click.
 *
 * Storage stays client-side — the share URL is the canonical form.
 * No server round-trip is required to round-trip a preset between
 * users.
 */

export interface ThemePreset {
  id: string;
  name: string;
  bundle: ThemeBundle;
  createdAt: string;
}

const PRESETS_KEY = "vyne-theme-presets";

function readPresets(): ThemePreset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]") as ThemePreset[];
  } catch {
    return [];
  }
}

function writePresets(list: ThemePreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota
  }
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `prs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function snapshot(): ThemeBundle {
  const s = useThemeStore.getState();
  return {
    theme: s.theme,
    accent: s.accent,
    customAccentHex: s.customAccentHex,
    customBgHex: s.customBgHex,
    density: s.density,
    font: s.font,
    sidebarPattern: s.sidebarPattern,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    moduleAccents: s.moduleAccents,
  };
}

/** Save the current theme as a named preset. Returns the new row. */
export function saveCurrentAsPreset(name: string): ThemePreset {
  const row: ThemePreset = {
    id: newId(),
    name: name.trim().slice(0, 60) || "Untitled preset",
    bundle: snapshot(),
    createdAt: new Date().toISOString(),
  };
  const next = [row, ...readPresets()].slice(0, 30);
  writePresets(next);
  return row;
}

export function listPresets(): ThemePreset[] {
  return readPresets();
}

export function applyPreset(id: string): boolean {
  const preset = readPresets().find((p) => p.id === id);
  if (!preset) return false;
  useThemeStore.getState().applyBundle(preset.bundle);
  return true;
}

export function removePreset(id: string): void {
  writePresets(readPresets().filter((p) => p.id !== id));
}

// ── Share URLs ────────────────────────────────────────────────────

function base64UrlEncode(input: string): string {
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  if (typeof window === "undefined") return "";
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(padded)));
}

/** Encode the current theme into a shareable URL fragment. */
export function buildThemeShareUrl(bundle?: ThemeBundle): string {
  if (typeof window === "undefined") return "";
  const b = bundle ?? snapshot();
  const blob = base64UrlEncode(JSON.stringify(b));
  return `${window.location.origin}/theme/share?p=${blob}`;
}

/** Read a `?p=…` blob off the current URL and apply it. Returns
 *  whether anything was applied. */
export async function applyThemeFromUrl(url: URL | Location | string): Promise<boolean> {
  try {
    const u =
      typeof url === "string"
        ? new URL(url)
        : "href" in url && typeof (url as Location).href === "string"
          ? new URL((url as Location).href)
          : (url as URL);
    const blob = u.searchParams.get("p");
    if (!blob) return false;
    const json = base64UrlDecode(blob);
    const bundle = JSON.parse(json) as ThemeBundle;
    useThemeStore.getState().applyBundle(bundle);
    return true;
  } catch {
    return false;
  }
}
