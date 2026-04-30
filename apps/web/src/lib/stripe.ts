// Stripe SDK singleton + plan price-id map. The price ids live in env
// vars (STRIPE_PRICE_ID_STARTER / _BUSINESS / _ENTERPRISE) so the same
// code runs in test mode or live mode by swapping the env values.
//
// Existing checkout route at /api/stripe/checkout uses these same
// names + REST API directly. This module is for Node-runtime routes
// (webhook, portal, status) that need the full SDK.

import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!SECRET) return null;
  if (_stripe) return _stripe;
  _stripe = new Stripe(SECRET, {
    // Pin to whichever apiVersion the installed SDK ships as default.
    typescript: true,
  });
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(SECRET);
}

export type PlanKey = "free" | "starter" | "business" | "enterprise";

export const PLAN_PRICES: Record<Exclude<PlanKey, "free">, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER,
  business: process.env.STRIPE_PRICE_ID_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  business: "Business",
  enterprise: "Enterprise",
};

export const PLAN_PRICE_USD: Record<PlanKey, number> = {
  free: 0,
  starter: 12,
  business: 24,
  enterprise: 0, // contact sales
};

export function planFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  if (priceId === PLAN_PRICES.starter) return "starter";
  if (priceId === PLAN_PRICES.business) return "business";
  if (priceId === PLAN_PRICES.enterprise) return "enterprise";
  return "free";
}
