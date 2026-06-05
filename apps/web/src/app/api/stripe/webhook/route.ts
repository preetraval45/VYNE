import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, planFromPriceId, PLAN_LABELS } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import {
  renderDunningEmail,
  type DunningStage,
} from "@/lib/email/templates/dunning";

// Stripe webhook handler. Processes subscription lifecycle events:
//   checkout.session.completed         — first-time signup
//   customer.subscription.created      — same as above for direct API
//   customer.subscription.updated      — plan change / status change
//   customer.subscription.deleted      — canceled at period end / now
//   invoice.paid                       — clear past_due flag (PH-E)
//   invoice.payment_failed             — surface in UI as past_due + dunning email
//   invoice.payment_action_required    — email user to complete 3DS / SCA challenge
//
// Set STRIPE_WEBHOOK_SECRET in Vercel and configure the webhook URL
// (https://vyne.vercel.app/api/stripe/webhook) in Stripe dashboard
// with these 7 events selected.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId =
          (session.metadata?.orgId as string | undefined) ??
          (session.subscription as Stripe.Subscription | null)?.metadata
            ?.orgId ??
          "demo";
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : ((session.customer as Stripe.Customer | null)?.id ?? null);
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : ((session.subscription as Stripe.Subscription | null)?.id ??
              null);
        if (subId && customerId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(orgId, sub);
        } else if (customerId) {
          await prisma.subscription.upsert({
            where: { orgId },
            create: {
              orgId,
              stripeCustomerId: customerId,
              plan: "free",
              status: "inactive",
            },
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
      case "invoice.paid": {
        // PH-E — clear past_due on successful invoice payment. Stripe
        // sends this event for both first-charge and renewal success.
        const inv = event.data.object as Stripe.Invoice;
        const subId = extractSubId(inv);
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "active" },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = extractSubId(inv);
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "past_due" },
          });
        }
        // PH-E — dunning email. Stage is derived from Stripe's
        // attempt_count: 1st failure → "first", 2-3 → "retry", 4+ → "final".
        await sendDunningEmail(inv, "payment_failed").catch((err) => {
          console.warn("[stripe.webhook] dunning email failed:", err);
        });
        break;
      }
      case "invoice.payment_action_required": {
        // PH-E — 3DS / SCA challenge. We don't want to mark past_due
        // (the payment is in flight), but we DO want to ping the
        // customer so they complete authentication in the Portal.
        const inv = event.data.object as Stripe.Invoice;
        await sendDunningEmail(inv, "action_required").catch((err) => {
          console.warn("[stripe.webhook] action-required email failed:", err);
        });
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

function extractSubId(inv: Stripe.Invoice): string | null {
  const wrapped = inv as unknown as {
    subscription?: string | Stripe.Subscription | null;
  };
  if (typeof wrapped.subscription === "string") return wrapped.subscription;
  if (wrapped.subscription && typeof wrapped.subscription === "object") {
    return (wrapped.subscription as Stripe.Subscription).id ?? null;
  }
  return null;
}

async function sendDunningEmail(
  inv: Stripe.Invoice,
  kind: "payment_failed" | "action_required",
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  const recipient =
    inv.customer_email ??
    (inv.customer && typeof inv.customer === "object"
      ? ((inv.customer as Stripe.Customer).email ?? null)
      : null);
  if (!recipient) return;

  const subId = extractSubId(inv);
  let plan = "Vyne";
  let portalUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`
    : "https://vyne.vercel.app/settings?tab=billing";

  // Best-effort: resolve plan label by reading the Subscription row,
  // and build a one-click Customer Portal session URL so the dunning
  // email lands the user directly in the card-update flow.
  if (subId) {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subId },
        select: { plan: true, stripeCustomerId: true },
      });
      if (sub?.plan) {
        const k = sub.plan as keyof typeof PLAN_LABELS;
        if (PLAN_LABELS[k]) plan = PLAN_LABELS[k];
      }
      if (sub?.stripeCustomerId) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: sub.stripeCustomerId,
          return_url: portalUrl,
        });
        portalUrl = portalSession.url;
      }
    } catch {
      // ignore — fall back to /settings link
    }
  }

  let stage: DunningStage = "first";
  if (kind === "payment_failed") {
    const attempts =
      (inv as unknown as { attempt_count?: number }).attempt_count ?? 1;
    if (attempts >= 4) stage = "final";
    else if (attempts >= 2) stage = "retry";
    else stage = "first";
  } else {
    // payment_action_required is a one-shot "you need to complete 3DS"
    // — re-using the dunning template with "first" stage copy.
    stage = "first";
  }

  const amountDue =
    typeof inv.amount_due === "number"
      ? formatMoney(inv.amount_due, inv.currency)
      : undefined;

  const { subject, html } = renderDunningEmail({
    recipientName: inv.customer_name ?? undefined,
    stage,
    portalUrl,
    planLabel: plan,
    amountDue,
  });
  await sendEmail({
    to: recipient,
    subject,
    html,
    category: kind === "action_required" ? "billing-action" : "billing-dunning",
  });
}

function formatMoney(amountMinor: number, currency: string | null): string {
  const c = (currency ?? "usd").toUpperCase();
  // Most currencies have 2 decimal subunits; the few zero-decimal ones
  // (JPY, KRW, etc.) need different formatting, but the dunning email
  // accepts a free-form amount so a small overshoot is acceptable.
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
  }).format(major);
}

async function upsertFromSubscription(orgId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // PH-F — Stripe SDK has bounced `current_period_end` between the
  // Subscription root and the SubscriptionItem across versions; check
  // both via an unknown cast so we don't have to pin a specific shape.
  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number } | undefined)
      ?.current_period_end ??
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
