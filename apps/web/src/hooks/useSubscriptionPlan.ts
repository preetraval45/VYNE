"use client";

// Subscription plan hook — reads /api/stripe/status once per tab + caches
// the result so every gate (export size, AI calls, seats) shares the same
// answer without each component re-fetching.

import { useEffect, useState } from "react";

export type PlanKey = "free" | "starter" | "business" | "enterprise";

export interface PlanStatus {
  plan: PlanKey;
  planLabel: string;
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number | null;
  /** True until the first /api/stripe/status response lands. */
  loading: boolean;
}

interface ApiResponse {
  plan?: PlanKey;
  planLabel?: string;
  status?: string;
  currentPeriodEnd?: string | null;
  hasCustomer?: boolean;
}

let cached: PlanStatus | null = null;
const subscribers = new Set<(s: PlanStatus) => void>();

function notify(next: PlanStatus) {
  cached = next;
  for (const fn of subscribers) fn(next);
}

async function refresh() {
  try {
    const res = await fetch("/api/stripe/status?orgId=demo", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("status fetch failed");
    const data = (await res.json()) as ApiResponse;
    const status = data.status ?? "inactive";
    const isTrialing = status === "trialing";
    const periodEnd = data.currentPeriodEnd ?? null;
    let daysLeft: number | null = null;
    if (isTrialing && periodEnd) {
      const ms = new Date(periodEnd).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(ms / 86400000));
    }
    notify({
      plan: (data.plan ?? "free") as PlanKey,
      planLabel: data.planLabel ?? "Free",
      status,
      currentPeriodEnd: periodEnd,
      trialEndsAt: isTrialing ? periodEnd : null,
      isTrialing,
      daysLeftInTrial: daysLeft,
      loading: false,
    });
  } catch {
    notify({
      plan: "free",
      planLabel: "Free",
      status: "inactive",
      currentPeriodEnd: null,
      trialEndsAt: null,
      isTrialing: false,
      daysLeftInTrial: null,
      loading: false,
    });
  }
}

const INITIAL: PlanStatus = {
  plan: "free",
  planLabel: "Free",
  status: "inactive",
  currentPeriodEnd: null,
  trialEndsAt: null,
  isTrialing: false,
  daysLeftInTrial: null,
  loading: true,
};

export function useSubscriptionPlan(): PlanStatus {
  const [s, setS] = useState<PlanStatus>(cached ?? INITIAL);
  useEffect(() => {
    subscribers.add(setS);
    if (!cached) void refresh();
    return () => {
      subscribers.delete(setS);
    };
  }, []);
  return s;
}

/** Module-level peek at the cached status. Server actions / non-React
 * code can use this without subscribing. Returns null when not yet
 * loaded; callers should fall back to "free" gating in that case. */
export function peekPlan(): PlanStatus | null {
  return cached;
}

/** Force a re-fetch — call after a successful Stripe Checkout return. */
export function refreshPlanStatus() {
  return refresh();
}

/** Per-plan row caps for bulk export (UI_UPGRADE_PLAN.md 3.4). */
export const EXPORT_ROW_LIMIT: Record<PlanKey, number> = {
  free: 1000,
  starter: 25_000,
  business: 250_000,
  enterprise: Number.POSITIVE_INFINITY,
};
