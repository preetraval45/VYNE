// PH-E — Day-10 auto-downgrade cron.
//
// Runs on a Vercel Cron schedule (configure in vercel.json: 0 6 * * *
// = 6am daily). For every Subscription that's been at status="past_due"
// for >= 10 days, flip plan="free" and status="canceled". Stripe's own
// retry schedule pings the customer first, and the PH-E dunning emails
// (first/retry/final) warn them; this is the final automated step.
//
// Idempotent — re-running on the same day is a no-op because the
// criterion already-flipped rows no longer match `status="past_due"`.
//
// Security: gated by CRON_SECRET shared with Vercel Cron via the
// `Authorization: Bearer <secret>` header. Without the env var the
// endpoint refuses to run, so accidental browser hits or unauth'd
// pokes can't trigger mass downgrades.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNGRADE_AFTER_DAYS = 10;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runDowngrade();
}

// Vercel Cron sends GET; allow POST as a manual-trigger backdoor for
// ops engineers running the same job from a script.
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runDowngrade();
}

async function runDowngrade(): Promise<NextResponse> {
  const cutoff = new Date(Date.now() - DOWNGRADE_AFTER_DAYS * 86400_000);
  try {
    const stale = await prisma.subscription.findMany({
      where: {
        status: "past_due",
        updatedAt: { lte: cutoff },
      },
      select: {
        orgId: true,
        plan: true,
        stripeSubscriptionId: true,
        updatedAt: true,
      },
    });

    if (stale.length === 0) {
      return NextResponse.json({ ok: true, downgraded: 0 });
    }

    // Batch update — every row goes to the free tier with status
    // canceled. `stripeSubscriptionId` is preserved so customer history
    // is still navigable in Stripe + the audit log can replay.
    await prisma.subscription.updateMany({
      where: {
        orgId: { in: stale.map((s) => s.orgId) },
        status: "past_due",
      },
      data: {
        plan: "free",
        status: "canceled",
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({
      ok: true,
      downgraded: stale.length,
      orgIds: stale.map((s) => s.orgId),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron error" },
      { status: 500 },
    );
  }
}
