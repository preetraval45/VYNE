// Plan limits: per-tier ceilings the UI uses to gate features and to
// surface "you're approaching the limit" hints. Values intentionally
// generous so demo accounts don't hit them; real product would tune
// these against actual usage data.
//
// Used by the Sidebar to show a small "Free · 8/10 projects" label
// and by feature handlers (e.g. createProject) to show a soft cap.

export type Plan = "free" | "starter" | "business" | "enterprise";

export interface PlanLimits {
  members: number;
  projects: number;
  aiQueriesPerMonth: number;
  storageGb: number;
  pricePerMonthUsd: number;
  label: string;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    members: 3,
    projects: 5,
    aiQueriesPerMonth: 200,
    storageGb: 1,
    pricePerMonthUsd: 0,
    label: "Free",
  },
  starter: {
    members: 10,
    projects: 25,
    aiQueriesPerMonth: 2000,
    storageGb: 10,
    pricePerMonthUsd: 12,
    label: "Starter",
  },
  business: {
    members: 50,
    projects: 200,
    aiQueriesPerMonth: 20000,
    storageGb: 100,
    pricePerMonthUsd: 24,
    label: "Business",
  },
  enterprise: {
    members: Number.POSITIVE_INFINITY,
    projects: Number.POSITIVE_INFINITY,
    aiQueriesPerMonth: Number.POSITIVE_INFINITY,
    storageGb: Number.POSITIVE_INFINITY,
    pricePerMonthUsd: 0,
    label: "Enterprise",
  },
};

export interface UsageSnapshot {
  members: number;
  projects: number;
  aiQueriesThisMonth: number;
  storageGb: number;
}

export interface LimitCheck {
  /** True if usage is within the plan's allowance for the given key. */
  within: boolean;
  /** True when usage is at >=80% of the limit but still under it. */
  approaching: boolean;
  /** Percent of limit consumed (clamped 0..100). */
  pct: number;
  used: number;
  limit: number;
  /** Suggested upgrade tier when over the limit; null when on top tier. */
  suggested: Plan | null;
}

const NEXT_TIER: Record<Plan, Plan | null> = {
  free: "starter",
  starter: "business",
  business: "enterprise",
  enterprise: null,
};

export function checkLimit(
  plan: Plan,
  key: keyof UsageSnapshot,
  usage: UsageSnapshot,
): LimitCheck {
  const limits = PLAN_LIMITS[plan];
  const used = usage[key];
  const limitKey: keyof PlanLimits =
    key === "aiQueriesThisMonth" ? "aiQueriesPerMonth" : (key as keyof PlanLimits);
  const limit = limits[limitKey] as number;
  const pct = limit === Number.POSITIVE_INFINITY ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const within = used < limit;
  const approaching = pct >= 80 && within;
  return {
    within,
    approaching,
    pct,
    used,
    limit,
    suggested: within ? null : NEXT_TIER[plan],
  };
}
