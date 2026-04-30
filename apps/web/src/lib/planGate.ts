"use client";

import toast from "react-hot-toast";

// Shared plan-limit gate for "create" forms. Caller hits this before
// the actual create. Returns true when the create should proceed,
// false when the user has been redirected to billing.
//
// Why a free-tier check only? Because today our pricing tiers all
// have generous ceilings; the realistic friction point is going from
// free → starter. Once Stripe is live for real, expand to read the
// per-resource ceilings from PLAN_LIMITS.

export type GateResource =
  | "deals"
  | "projects"
  | "contacts"
  | "products"
  | "invoices"
  | "quotes"
  | "orders";

const FREE_LIMIT: Record<GateResource, number> = {
  deals: 5,
  projects: 5,
  contacts: 25,
  products: 10,
  invoices: 10,
  quotes: 10,
  orders: 10,
};

export async function checkCreateAllowed(
  resource: GateResource,
  currentCount: number,
): Promise<boolean> {
  // Soft-fail to "allowed" if we can't determine plan — better UX
  // than blocking the form on a network hiccup.
  let plan = "free";
  try {
    const res = await fetch("/api/stripe/status");
    if (res.ok) {
      const data = (await res.json()) as { plan?: string };
      if (data.plan) plan = data.plan;
    }
  } catch {
    return true;
  }

  if (plan !== "free") return true;
  const cap = FREE_LIMIT[resource];
  if (currentCount < cap) return true;

  toast.error(
    `Free plan limited to ${cap} ${resource}. Upgrade to add more.`,
    { duration: 6000 },
  );
  if (typeof window !== "undefined") {
    window.location.href = "/settings?tab=billing";
  }
  return false;
}
