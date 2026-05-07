"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * i18n preferences — the user's chosen language, currency, and
 * timezone. All formatters in `lib/i18n/format.ts` read these
 * defaults; pages can still override per-call.
 *
 * Stored separately from `useA11y` so language changes don't bust
 * the a11y persistence migration.
 */

export type LocaleId =
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pt-BR"
  | "ja-JP"
  | "zh-CN"
  | "ar-SA"
  | "he-IL"
  | "hi-IN";

export const LOCALES: Array<{ id: LocaleId; label: string; rtl?: boolean }> = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "es-ES", label: "Español" },
  { id: "fr-FR", label: "Français" },
  { id: "de-DE", label: "Deutsch" },
  { id: "it-IT", label: "Italiano" },
  { id: "pt-BR", label: "Português (BR)" },
  { id: "ja-JP", label: "日本語" },
  { id: "zh-CN", label: "中文 (简体)" },
  { id: "ar-SA", label: "العربية", rtl: true },
  { id: "he-IL", label: "עברית", rtl: true },
  { id: "hi-IN", label: "हिन्दी" },
];

export interface I18nPrefs {
  /** ISO BCP-47 locale tag. Drives every Intl.* formatter. */
  locale: LocaleId;
  /** ISO 4217 currency code used by `Intl.NumberFormat`. */
  currency: string;
  /** IANA timezone id. "auto" = use the browser's resolved timezone. */
  timezone: string | "auto";
  /** First day of the calendar week. 0 = Sunday, 1 = Monday. */
  firstDayOfWeek: 0 | 1;
}

interface I18nStore extends I18nPrefs {
  set: (patch: Partial<I18nPrefs>) => void;
  reset: () => void;
  /** Resolve "auto" to the browser's actual timezone. */
  resolvedTimezone: () => string;
  isRtl: () => boolean;
}

const DEFAULT: I18nPrefs = {
  locale: "en-US",
  currency: "USD",
  timezone: "auto",
  firstDayOfWeek: 0,
};

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set({ ...DEFAULT }),
      resolvedTimezone: () => {
        const tz = get().timezone;
        if (tz !== "auto") return tz;
        if (typeof Intl !== "undefined") {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return "UTC";
      },
      isRtl: () => {
        const id = get().locale;
        const meta = LOCALES.find((l) => l.id === id);
        return Boolean(meta?.rtl);
      },
    }),
    { name: "vyne-i18n", version: 1 },
  ),
);
