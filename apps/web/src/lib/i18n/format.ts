"use client";

import { useI18n } from "@/lib/stores/i18n";

/**
 * Locale-aware formatters. All read from `useI18n` so a single store
 * write swaps every dollar sign / date layout / weekday name across
 * the app.
 *
 * Each formatter is a pure function (callable from non-React code)
 * plus an optional `Intl.*` cache so repeated calls don't churn
 * formatter instances.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}::${JSON.stringify(options)}`;
  let f = numberFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, f);
  }
  return f;
}

function getDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}::${JSON.stringify(options)}`;
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, f);
  }
  return f;
}

function snapshot() {
  const s = useI18n.getState();
  return {
    locale: s.locale,
    currency: s.currency,
    timezone: s.resolvedTimezone(),
  };
}

/** Format a number with the user's locale. */
export function fmtNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return String(value);
  const { locale } = snapshot();
  return getNumberFormatter(locale, options).format(value);
}

/** Format a currency amount, defaulting to the user's chosen currency. */
export function fmtCurrency(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return String(value);
  const { locale, currency } = snapshot();
  return getNumberFormatter(locale, {
    style: "currency",
    currency: options.currency ?? currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Compact (1.2k / 3.4M) number formatter. */
export function fmtCompact(value: number): string {
  return fmtNumber(value, { notation: "compact", maximumFractionDigits: 1 });
}

/** Format a percent (input is 0..1, displays as 0–100%). */
export function fmtPercent(value: number, fractionDigits = 0): string {
  return fmtNumber(value, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Format an ISO / Date with the user's locale + timezone. */
export function fmtDate(
  iso: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const { locale, timezone } = snapshot();
  return getDateFormatter(locale, { timeZone: timezone, ...options }).format(
    date,
  );
}

/** Format datetime — short date + 24h time by default. */
export function fmtDateTime(
  iso: string | number | Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return fmtDate(iso, options);
}

/** Relative time ("3 hours ago", "in 2 days") in the user's locale. */
export function fmtRelative(
  iso: string | number | Date,
  reference: Date = new Date(),
): string {
  const target = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(target.getTime())) return "";
  const { locale } = snapshot();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = target.getTime() - reference.getTime();
  const abs = Math.abs(diff);
  const m = 60_000;
  const h = 3_600_000;
  const d = 86_400_000;
  if (abs < m) return rtf.format(Math.round(diff / 1000), "second");
  if (abs < h) return rtf.format(Math.round(diff / m), "minute");
  if (abs < d) return rtf.format(Math.round(diff / h), "hour");
  if (abs < 7 * d) return rtf.format(Math.round(diff / d), "day");
  if (abs < 30 * d) return rtf.format(Math.round(diff / (7 * d)), "week");
  if (abs < 365 * d) return rtf.format(Math.round(diff / (30 * d)), "month");
  return rtf.format(Math.round(diff / (365 * d)), "year");
}

/** Format weekday names for calendar headers — respects locale + first-day. */
export function fmtWeekdays(
  weekday: "short" | "long" | "narrow" = "short",
): string[] {
  const { locale } = snapshot();
  const first = useI18n.getState().firstDayOfWeek;
  const f = getDateFormatter(locale, { weekday });
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    // Use a known Sunday (1970-01-04) so weekday math is deterministic.
    const d = new Date(Date.UTC(1970, 0, 4 + ((i + first) % 7)));
    out.push(f.format(d));
  }
  return out;
}
