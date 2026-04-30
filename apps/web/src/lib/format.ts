// Unified formatters so currency / number / time render the same way
// across every module. Existing pages can adopt these incrementally;
// new code should always use these helpers.

export function formatCurrency(value: number, opts: { compact?: boolean; currency?: string } = {}): string {
  const { compact = false, currency = "USD" } = opts;
  if (!Number.isFinite(value)) return "—";
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, opts: { compact?: boolean; decimals?: number } = {}): string {
  const { compact = false, decimals = 0 } = opts;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: compact && Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: decimals,
  }).format(value > 1 ? value / 100 : value);
}

export function formatDate(input: string | Date | null | undefined, opts: { withTime?: boolean } = {}): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(opts.withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** "2h ago", "3d ago", "in 2 weeks" — Intl.RelativeTimeFormat */
export function formatRelative(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR, WK = 7 * DAY, MO = 30 * DAY, YR = 365 * DAY;
  if (abs < MIN) return rtf.format(Math.round(diffMs / SEC), "second");
  if (abs < HR) return rtf.format(Math.round(diffMs / MIN), "minute");
  if (abs < DAY) return rtf.format(Math.round(diffMs / HR), "hour");
  if (abs < WK) return rtf.format(Math.round(diffMs / DAY), "day");
  if (abs < MO) return rtf.format(Math.round(diffMs / WK), "week");
  if (abs < YR) return rtf.format(Math.round(diffMs / MO), "month");
  return rtf.format(Math.round(diffMs / YR), "year");
}
