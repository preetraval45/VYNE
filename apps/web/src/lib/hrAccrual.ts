// Tiny time-off accrual engine. Computes days accrued per year based
// on tenure, less days used. Pure function — no store, no I/O. The UI
// reads it on render so the projection updates as time passes.
//
// Policy (deliberately simple, override per-org later):
//   • 0–1 yr   → 10 vacation / 5 sick / 3 personal
//   • 1–3 yrs  → 15 / 5 / 3
//   • 3–5 yrs  → 20 / 5 / 3
//   • 5+ yrs   → 25 / 5 / 3

export interface AccrualPolicy {
  vacationByTenureYears: Array<{ untilYears: number; daysPerYear: number }>;
  sickPerYear: number;
  personalPerYear: number;
}

export const DEFAULT_POLICY: AccrualPolicy = {
  vacationByTenureYears: [
    { untilYears: 1, daysPerYear: 10 },
    { untilYears: 3, daysPerYear: 15 },
    { untilYears: 5, daysPerYear: 20 },
    { untilYears: Infinity, daysPerYear: 25 },
  ],
  sickPerYear: 5,
  personalPerYear: 3,
};

export interface AccrualSnapshot {
  tenureYears: number;
  vacationAnnual: number;
  vacationAccruedYTD: number;
  sickAccruedYTD: number;
  personalAccruedYTD: number;
  ytdFraction: number;
}

function parseJoined(joined: string): Date | null {
  // Accepts "Jan 2024", "2024-03-15", or full ISO strings.
  if (/^\d{4}-\d{2}-\d{2}/.test(joined)) {
    const d = new Date(joined);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const parts = joined.trim().split(/\s+/);
  if (parts.length === 2) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = months.findIndex((x) => x.toLowerCase() === parts[0].slice(0, 3).toLowerCase());
    const y = Number(parts[1]);
    if (m >= 0 && Number.isFinite(y)) return new Date(y, m, 1);
  }
  const d = new Date(joined);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function computeAccrual(
  joined: string,
  policy: AccrualPolicy = DEFAULT_POLICY,
): AccrualSnapshot {
  const j = parseJoined(joined) ?? new Date();
  const now = new Date();
  const tenureMs = Math.max(0, now.getTime() - j.getTime());
  const tenureYears = tenureMs / (365.25 * 86400000);

  const tier =
    policy.vacationByTenureYears.find((t) => tenureYears < t.untilYears) ??
    policy.vacationByTenureYears[policy.vacationByTenureYears.length - 1];
  const vacationAnnual = tier.daysPerYear;

  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const yearMs = new Date(now.getFullYear() + 1, 0, 1).getTime() - startOfYear;
  const ytdFraction = Math.min(1, (now.getTime() - startOfYear) / yearMs);

  return {
    tenureYears: Math.round(tenureYears * 10) / 10,
    vacationAnnual,
    vacationAccruedYTD: Math.round(vacationAnnual * ytdFraction * 10) / 10,
    sickAccruedYTD: Math.round(policy.sickPerYear * ytdFraction * 10) / 10,
    personalAccruedYTD: Math.round(policy.personalPerYear * ytdFraction * 10) / 10,
    ytdFraction,
  };
}
