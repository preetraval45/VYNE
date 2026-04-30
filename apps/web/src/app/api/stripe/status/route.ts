import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeConfigured, PLAN_PRICES, PLAN_LABELS, PLAN_PRICE_USD, type PlanKey } from "@/lib/stripe";

// GET /api/stripe/status — returns the org's current plan + status,
// pulling from Postgres (which the webhook keeps in sync). The UI
// reads this on /settings page to render the right tier badge + the
// Manage / Upgrade buttons.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") ?? "demo";

  let plan: PlanKey = "free";
  let status: string = "inactive";
  let cancelAtPeriodEnd = false;
  let currentPeriodEnd: string | null = null;
  let hasCustomer = false;

  try {
    const sub = await prisma.subscription.findUnique({ where: { orgId } });
    if (sub) {
      plan = sub.plan as PlanKey;
      status = sub.status;
      cancelAtPeriodEnd = sub.cancelAtPeriodEnd;
      currentPeriodEnd = sub.currentPeriodEnd?.toISOString() ?? null;
      hasCustomer = Boolean(sub.stripeCustomerId);
    }
  } catch {
    // DB unreachable — return defaults.
  }

  return NextResponse.json({
    plan,
    planLabel: PLAN_LABELS[plan],
    priceUsd: PLAN_PRICE_USD[plan],
    status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    hasCustomer,
    billingConfigured: stripeConfigured(),
    plansAvailable: {
      starter: Boolean(PLAN_PRICES.starter),
      business: Boolean(PLAN_PRICES.business),
      enterprise: Boolean(PLAN_PRICES.enterprise),
    },
  });
}
