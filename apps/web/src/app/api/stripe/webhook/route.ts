import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, planFromPriceId } from "@/lib/stripe";

// Stripe webhook handler. Processes subscription lifecycle events:
//   checkout.session.completed         — first-time signup
//   customer.subscription.created      — same as above for direct API
//   customer.subscription.updated      — plan change / status change
//   customer.subscription.deleted      — canceled at period end / now
//   invoice.payment_failed             — surface in UI as past_due
//
// Set STRIPE_WEBHOOK_SECRET in Vercel and configure the webhook URL
// (https://vyne.vercel.app/api/stripe/webhook) in Stripe dashboard
// with these 5 events selected.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId =
          (session.metadata?.orgId as string | undefined) ??
          (session.subscription as Stripe.Subscription | null)?.metadata?.orgId ??
          "demo";
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as Stripe.Customer | null)?.id ?? null;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id ?? null;
        if (subId && customerId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(orgId, sub);
        } else if (customerId) {
          await prisma.subscription.upsert({
            where: { orgId },
            create: { orgId, stripeCustomerId: customerId, plan: "free", status: "inactive" },
            update: { stripeCustomerId: customerId },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = (sub.metadata?.orgId as string | undefined) ?? "demo";
        await upsertFromSubscription(orgId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = (sub.metadata?.orgId as string | undefined) ?? "demo";
        await prisma.subscription.upsert({
          where: { orgId },
          create: { orgId, plan: "free", status: "canceled" },
          update: {
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId =
          typeof (inv as unknown as { subscription?: string | Stripe.Subscription }).subscription === "string"
            ? ((inv as unknown as { subscription: string }).subscription)
            : null;
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "past_due" },
          });
        }
        break;
      }
      default:
        // Ignore unrelated events.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler error" },
      { status: 500 },
    );
  }
}

async function upsertFromSubscription(orgId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    item?.current_period_end ??
    null;

  await prisma.subscription.upsert({
    where: { orgId },
    create: {
      orgId,
      plan,
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    },
    update: {
      plan,
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    },
  });
}
