import type { Deal, Stage, Source } from "@/lib/fixtures/crm";

/**
 * Deterministic, explainable lead scoring (0–100) — the "Einstein/Breeze"-style
 * signal HubSpot/Salesforce surface, computed locally from real deal signals so
 * it works with no AI key. Combines stage progression, recency of activity,
 * lead source quality, and deal size. Returns the score, a tier, and the
 * human-readable reasons so the UI can explain *why* a lead is hot.
 */

export type LeadTier = "hot" | "warm" | "cold";

export interface LeadScore {
  score: number; // 0–100
  tier: LeadTier;
  reasons: string[];
}

const STAGE_SCORE: Record<Stage, number> = {
  Lead: 12,
  Qualified: 35,
  Proposal: 58,
  Negotiation: 80,
  Won: 100,
  Lost: 0,
};

const SOURCE_SCORE: Record<Source, number> = {
  referral: 100,
  inbound: 85,
  website: 60,
  outbound: 45,
};

const SOURCE_LABEL: Record<Source, string> = {
  referral: "Referral",
  inbound: "Inbound",
  website: "Website",
  outbound: "Outbound",
};

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86400000);
}

// Recency → 0–100. Fresh activity is the single strongest "is this alive" signal.
function freshnessScore(days: number): number {
  if (days <= 1) return 100;
  if (days <= 3) return 85;
  if (days <= 7) return 60;
  if (days <= 14) return 38;
  if (days <= 30) return 20;
  return 8;
}

// Deal size → 0–100 on a gentle log-ish curve (size matters, but less than fit).
function valueScore(value: number): number {
  if (value >= 100_000) return 100;
  if (value >= 50_000) return 82;
  if (value >= 20_000) return 64;
  if (value >= 10_000) return 50;
  if (value >= 5_000) return 38;
  return 25;
}

const WEIGHTS = { stage: 0.42, freshness: 0.3, source: 0.12, value: 0.16 };

export function scoreDeal(deal: Deal): LeadScore {
  // Terminal stages short-circuit.
  if (deal.stage === "Lost") {
    return { score: 0, tier: "cold", reasons: ["Marked Lost"] };
  }
  if (deal.stage === "Won") {
    return { score: 100, tier: "hot", reasons: ["Closed Won"] };
  }

  const days = daysSince(deal.lastActivity);
  const stage = STAGE_SCORE[deal.stage] ?? 10;
  const fresh = freshnessScore(days);
  const source = SOURCE_SCORE[deal.source] ?? 50;
  const value = valueScore(deal.value);

  const score = Math.round(
    stage * WEIGHTS.stage +
      fresh * WEIGHTS.freshness +
      source * WEIGHTS.source +
      value * WEIGHTS.value,
  );

  const tier: LeadTier = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  // Build the top reasons (most decision-relevant first).
  const reasons: string[] = [];
  if (deal.stage === "Negotiation" || deal.stage === "Proposal") {
    reasons.push(`Advanced stage (${deal.stage})`);
  } else if (deal.stage === "Qualified") {
    reasons.push("Qualified");
  } else {
    reasons.push("Early stage");
  }
  if (days <= 3) reasons.push("Active in last 3 days");
  else if (days >= 14)
    reasons.push(`Stale — ${Math.round(days)}d since activity`);
  if (deal.source === "referral" || deal.source === "inbound") {
    reasons.push(`${SOURCE_LABEL[deal.source]} lead`);
  }
  if (deal.value >= 50_000)
    reasons.push(`High value ($${Math.round(deal.value / 1000)}k)`);

  return { score, tier, reasons: reasons.slice(0, 4) };
}

export function tierColor(tier: LeadTier): {
  fg: string;
  bg: string;
  label: string;
} {
  switch (tier) {
    case "hot":
      return { fg: "#B91C1C", bg: "rgba(220,38,38,0.10)", label: "Hot" };
    case "warm":
      return { fg: "#C2410C", bg: "rgba(217,119,6,0.10)", label: "Warm" };
    default:
      return {
        fg: "var(--text-tertiary)",
        bg: "var(--content-secondary)",
        label: "Cold",
      };
  }
}
