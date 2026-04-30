"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useCRMStore } from "@/lib/stores/crm";
import { useProjectsStore } from "@/lib/stores/projects";
import { useInvoicingStore } from "@/lib/stores/invoicing";

// Today-at-a-glance card. Counts records created/updated today across
// CRM, projects, and invoicing. Renders nothing when there's no
// activity so the home page stays clean.

const DAY_MS = 86400000;

export function TodayActivityCard() {
  const mounted = useMounted();
  const deals = useCRMStore((s) => s.deals);
  const tasks = useProjectsStore((s) => s.tasks);
  const invoices = useInvoicingStore((s) => s.invoices);
  const [now, setNow] = useState<number>(() => Date.now());

  // Re-pin "now" on a 60s tick so the card refreshes around midnight.
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [mounted]);

  if (!mounted) return null;

  const since = now - DAY_MS;

  const dealsToday = deals.filter((d) => {
    const ts = new Date(d.lastActivity ?? 0).getTime();
    return Number.isFinite(ts) && ts >= since;
  }).length;

  const tasksToday = tasks.filter((t) => {
    const created = new Date(t.createdAt ?? 0).getTime();
    const updated = new Date(t.updatedAt ?? 0).getTime();
    return (
      (Number.isFinite(created) && created >= since) ||
      (Number.isFinite(updated) && updated >= since)
    );
  }).length;

  const invoicesToday = invoices.filter((i) => {
    const ts = new Date(i.date).getTime();
    return Number.isFinite(ts) && ts >= since;
  }).length;

  const total = dealsToday + tasksToday + invoicesToday;
  if (total === 0) return null;

  return (
    <Link
      href="/activity"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
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
          background: "var(--vyne-accent-soft, var(--content-secondary))",
          color: "var(--vyne-accent, #5B5BD6)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Activity size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Today&apos;s activity · {total} update{total === 1 ? "" : "s"}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {[
            dealsToday > 0 ? `${dealsToday} deal${dealsToday === 1 ? "" : "s"} touched` : null,
            tasksToday > 0 ? `${tasksToday} task${tasksToday === 1 ? "" : "s"} updated` : null,
            invoicesToday > 0 ? `${invoicesToday} invoice${invoicesToday === 1 ? "" : "s"}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span
        style={{
          alignSelf: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          padding: "4px 10px",
          borderRadius: 999,
          background: "var(--content-secondary)",
        }}
      >
        See all →
      </span>
    </Link>
  );
}
