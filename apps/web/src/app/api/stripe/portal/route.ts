import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/api/security";
import { requireRealTenant } from "@/lib/auth/tenantGuard";

// POST /api/stripe/portal — creates a Stripe Customer Portal session
// for the org's existing customer record. The Portal lets the user
// update payment method, switch plan, view invoices, cancel.
//
// PH-E: tenant-scoped. orgId is read from the verified session cookie,
// never from the request body — preventing cross-tenant portal probes.
// Demo accounts can't open the portal (no real Stripe customer).
//
// 503 if Stripe isn't configured. 400 if the org has no Customer yet.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await requireRealTenant(req);
  if (ctx instanceof Response) return ctx;

  const rl = await rateLimit({
    key: "stripe-portal",
    limit: 10,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing disabled" }, { status: 503 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { orgId: ctx.orgId },
  });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription on file. Start a plan first." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/settings?tab=billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 500 },
    );
  }
}
