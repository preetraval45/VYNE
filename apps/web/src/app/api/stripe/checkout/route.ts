import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface CheckoutRequest {
  /** "starter" | "business" | "enterprise" */
  plan: string;
  /** Number of seats */
  seats?: number;
  /** Where Stripe should redirect after success/cancel */
  successUrl?: string;
  cancelUrl?: string;
  /** Optional pre-fill */
  customerEmail?: string;
}

interface CheckoutResponse {
  url: string;
  sessionId: string;
}

/**
 * Stripe Checkout session creator. Uses Stripe's REST API directly so we
 * don't need to install the SDK on Vercel Edge.
 *
 * Env required (set in Vercel project):
 *   STRIPE_SECRET_KEY                — sk_live_… or sk_test_…
 *   STRIPE_PRICE_ID_STARTER          — price_… for the $12 plan
 *   STRIPE_PRICE_ID_BUSINESS         — price_… for the $24 plan
 *   STRIPE_PRICE_ID_ENTERPRISE       — price_… (optional)
 *
 * Without STRIPE_SECRET_KEY this route returns 503 with a setup hint and
 * the pricing page falls back to "Join waitlist" as before.
 *
 * Plans map to Stripe prices via the price IDs above. To add per-seat
 * billing, configure the Stripe price as a "metered" or "tiered" type
 * and the quantity below will flow through.
 */
const PLAN_TO_PRICE_ENV: Record<string, string> = {
  starter: "STRIPE_PRICE_ID_STARTER",
  business: "STRIPE_PRICE_ID_BUSINESS",
  enterprise: "STRIPE_PRICE_ID_ENTERPRISE",
};

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error:
          "Stripe not configured. Set STRIPE_SECRET_KEY + per-plan STRIPE_PRICE_ID_* env vars in Vercel to enable paid signups. Pricing page falls back to waitlist mode.",
      },
      { status: 503 },
    );
  }

  let payload: CheckoutRequest;
  try {
    payload = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const plan = payload.plan?.toLowerCase();
  if (!plan || !(plan in PLAN_TO_PRICE_ENV)) {
    return NextResponse.json(
      { error: `unknown plan; choose one of ${Object.keys(PLAN_TO_PRICE_ENV).join(", ")}` },
      { status: 400 },
    );
  }
  const priceId = process.env[PLAN_TO_PRICE_ENV[plan]];
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Plan "${plan}" is not configured. Set ${PLAN_TO_PRICE_ENV[plan]} in Vercel env.`,
      },
      { status: 503 },
    );
  }

  const seats = Math.max(1, Math.min(500, payload.seats ?? 1));
  const origin = new URL(req.url).origin;
  const successUrl =
    payload.successUrl ??
    `${origin}/home?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = payload.cancelUrl ?? `${origin}/?checkout=cancel`;

  // Stripe Checkout requires application/x-www-form-urlencoded
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("payment_method_types[]", "card");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", String(seats));
  form.set("allow_promotion_codes", "true");
  form.set("billing_address_collection", "auto");
  form.set("success_url", successUrl);
  form.set("cancel_url", cancelUrl);
  if (payload.customerEmail) {
    form.set("customer_email", payload.customerEmail);
  }
  form.set("metadata[plan]", plan);
  form.set("metadata[seats]", String(seats));
  form.set("subscription_data[metadata][plan]", plan);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `stripe error ${res.status}: ${txt.slice(0, 240)}` },
        { status: 502 },
      );
    }
    const body = (await res.json()) as { id: string; url: string };
    return NextResponse.json<CheckoutResponse>({
      sessionId: body.id,
      url: body.url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stripe call failed" },
      { status: 502 },
    );
  }
}
