// PH-E — Plan tier gating for /api/* routes.
//
// Pattern:
//   const guard = await requirePlan(req, ["business", "enterprise"]);
//   if (guard instanceof Response) return guard;
//   // ... continue with paid-tier work
//
// Returns 402 Payment Required when the caller's org isn't on a plan
// in the allowed list. Demo + free callers can opt-into a soft preview
// (configured via `softPreview: true`) — useful for AI chat where we
// want free users to try the feature, just not unbounded.
//
// Plan tier ordering (top to bottom = most → least access):
//   - enterprise: everything
//   - business: 90% of features, 10 seats
//   - starter: basic feature set, 3 seats
//   - free: read-only / trial-only
//
// Subscription row is created at signup with plan="free" / status="trialing"
// and rotates via the Stripe webhook handler.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PlanKey } from "@/lib/stripe";
import { resolveTenant, type TenantContext } from "@/lib/auth/tenantGuard";

export interface PlanGuardResult {
  ctx: TenantContext;
  plan: PlanKey;
  status: string;
  delinquent: boolean;
}

/** Looks up the active subscription for an org. Returns `null` when
 *  the org has no Subscription row (treat as free). */
async function getSubscription(
  orgId: string,
): Promise<{ plan: PlanKey; status: string } | null> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
      select: { plan: true, status: true },
    });
    if (!sub) return null;
    const plan = (sub.plan as PlanKey) ?? "free";
    return { plan, status: sub.status };
  } catch {
    // DB unreachable → assume free (fail safe — block paid features).
    return null;
  }
}

/**
 * Enforces a minimum plan tier. Returns the tenant context + plan on
 * success, or a 402 Response the route must return.
 *
 * Demo callers always pass — the showcase needs to demonstrate the
 * full feature set without a fake subscription.
 */
export async function requirePlan(
  req: Request,
  allowed: PlanKey[],
): Promise<PlanGuardResult | Response> {
  const ctx = await resolveTenant(req);
  if (!ctx) {
    return NextResponse.json(
      { error: "Sign in to access this feature" },
      { status: 401 },
    );
  }
  if (ctx.demo) {
    // Demo path bypasses plan gating so the marketing showcase always
    // looks fully-loaded. Real billing applies after signup.
    return {
      ctx,
      plan: "enterprise",
      status: "active",
      delinquent: false,
    };
  }

  const sub = await getSubscription(ctx.orgId);
  const plan: PlanKey = sub?.plan ?? "free";
  const status = sub?.status ?? "inactive";
  const delinquent = status === "past_due" || status === "incomplete";

  if (!allowed.includes(plan)) {
    return NextResponse.json(
      {
        error: `Upgrade required. This feature is available on the ${allowed.join(
          " or ",
        )} plan.`,
        currentPlan: plan,
        requiredPlans: allowed,
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  if (delinquent) {
    return NextResponse.json(
      {
        error:
          "Your subscription is past due. Please update your payment method.",
        currentPlan: plan,
        status,
        portalUrl: "/settings?tab=billing",
      },
      { status: 402 },
    );
  }

  return { ctx, plan, status, delinquent };
}

/** Same as `requirePlan` but allows free callers through with a flag
 *  in the result so the route can soft-rate-limit them (e.g. /api/ai/chat
 *  could let free users send N messages/month before returning 402). */
export async function preferPlan(
  req: Request,
  paidPlans: PlanKey[],
): Promise<PlanGuardResult | Response> {
  const ctx = await resolveTenant(req);
  if (!ctx) {
    return NextResponse.json(
      { error: "Sign in to access this feature" },
      { status: 401 },
    );
  }
  if (ctx.demo) {
    return { ctx, plan: "enterprise", status: "active", delinquent: false };
  }
  const sub = await getSubscription(ctx.orgId);
  const plan: PlanKey = sub?.plan ?? "free";
  const status = sub?.status ?? "inactive";
  const delinquent = status === "past_due" || status === "incomplete";
  return { ctx, plan, status, delinquent };
}

/** Light tag for client-side render decisions — does this plan include
 *  the feature? Mirrors the server gate so the UI can hide upgrade-
 *  required buttons without a round-trip. */
export function planIncludes(plan: PlanKey, required: PlanKey[]): boolean {
  return required.includes(plan);
}
