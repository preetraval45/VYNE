"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useProjectsStore } from "@/lib/stores/projects";
import { useContactsStore } from "@/lib/stores/contacts";
import { checkLimit, PLAN_LIMITS, type Plan } from "@/lib/planLimits";
import { useMounted } from "@/hooks/useMounted";

// Renders only when at least one resource is at >=80% of the plan
// allowance. Reads /api/stripe/status for the current plan; falls back
// to "free" when billing isn't configured. Click → routes to /settings
// billing tab.

export function PlanLimitBanner() {
  const mounted = useMounted();
  const projects = useProjectsStore((s) => s.projects);
  const contactsCount = useContactsStore((s) => s.contacts.length);
  const [plan, setPlan] = useState<Plan>("free");

  useEffect(() => {
    if (!mounted) return;
    void fetch("/api/stripe/status")
      .then((r) => r.json() as Promise<{ plan?: Plan }>)
      .then((b) => {
        if (b.plan) setPlan(b.plan);
      })
      .catch(() => {
        // ignore — defaults to free
      });
  }, [mounted]);

  if (!mounted) return null;

  const usage = {
    members: 1,
    projects: projects.length,
    aiQueriesThisMonth: 0,
    storageGb: 0,
  };

  const projCheck = checkLimit(plan, "projects", usage);
  const contactsCheck = checkLimit(plan, "members", { ...usage, members: contactsCount });
  // Pick the most-stressed signal worth surfacing (>=80% used).
  const candidates = [
    { label: "projects", check: projCheck },
    { label: "contacts", check: contactsCheck },
  ].filter((c) => c.check.approaching || !c.check.within);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.check.pct - a.check.pct);
  const top = candidates[0];
  const limits = PLAN_LIMITS[plan];

  return (
    <Link
      href="/settings?tab=billing"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--vyne-accent-ring, rgba(91,91,214,0.25))",
        background: "var(--vyne-accent-soft, rgba(91,91,214,0.06))",
        textDecoration: "none",
        marginBottom: 14,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 10,
          background: "var(--vyne-accent, #5B5BD6)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Zap size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {top.check.within
            ? `You're using ${top.check.pct}% of your ${limits.label} ${top.label} allowance`
            : `${limits.label} plan limit reached on ${top.label}`}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {top.check.used} / {Number.isFinite(top.check.limit) ? top.check.limit : "∞"}
          {top.check.suggested
            ? ` · upgrade to ${PLAN_LIMITS[top.check.suggested].label} for ${top.check.suggested === "enterprise" ? "custom" : `$${PLAN_LIMITS[top.check.suggested].pricePerMonthUsd}/mo`}`
            : ""}
        </div>
      </div>
      <span
        style={{
          alignSelf: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--vyne-accent-deep, #1d4ed8)",
          padding: "4px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.65)",
        }}
      >
        Upgrade →
      </span>
    </Link>
  );
}
