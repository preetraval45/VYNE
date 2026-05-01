"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, FileWarning, ArrowRight, CheckCircle2 } from "lucide-react";
import { useFinanceStore } from "@/lib/stores/finance";
import type { ERPJournalEntry } from "@/lib/api/client";
import { InlineEmptyState } from "@/components/shared/InlineEmptyState";

interface Flag {
  id: string;
  severity: "warn" | "info";
  title: string;
  body: string;
}

const ROUND_NUMBER_THRESHOLD = 1000;

function buildFlags(entries: ERPJournalEntry[]): Flag[] {
  const flags: Flag[] = [];

  // 1) Drafts older than 7d — close-blockers.
  const now = Date.now();
  const oldDrafts = entries.filter((e) => {
    if (e.status !== "draft") return false;
    return now - new Date(e.postingDate).getTime() > 7 * 86400000;
  });
  if (oldDrafts.length > 0) {
    const total = oldDrafts.reduce((s, e) => s + (e.totalDebits ?? 0), 0);
    flags.push({
      id: "old-drafts",
      severity: "warn",
      title: `${oldDrafts.length} draft entr${oldDrafts.length === 1 ? "y" : "ies"} aged 7d+`,
      body: `$${total.toLocaleString()} sitting unposted. Review and post or void to unblock close.`,
    });
  }

  // 2) Round-number entries (often placeholders).
  const roundEntries = entries.filter((e) => {
    const amt = e.totalDebits ?? 0;
    return amt >= ROUND_NUMBER_THRESHOLD && amt % 1000 === 0;
  });
  if (roundEntries.length >= 3) {
    flags.push({
      id: "round-numbers",
      severity: "info",
      title: `${roundEntries.length} round-number entries detected`,
      body: "Round amounts are often placeholders or manual estimates — verify they match supporting docs.",
    });
  }

  // 3) Duplicate descriptions on the same day = potential double-post.
  const seen = new Map<string, ERPJournalEntry[]>();
  for (const e of entries) {
    const key = `${e.postingDate.slice(0, 10)}::${(e.description ?? "").trim().toLowerCase()}`;
    const list = seen.get(key) ?? [];
    list.push(e);
    seen.set(key, list);
  }
  const dupes = Array.from(seen.values()).filter((g) => g.length >= 2 && g[0].description);
  if (dupes.length > 0) {
    flags.push({
      id: "dupes",
      severity: "warn",
      title: `${dupes.length} possible duplicate entr${dupes.length === 1 ? "y" : "ies"}`,
      body: "Same description posted twice on the same day — confirm these aren't double-counts.",
    });
  }

  return flags.slice(0, 4);
}

export function CloseAssistantCard() {
  const entries = useFinanceStore((s) => s.journalEntries);
  const flags = useMemo(() => buildFlags(entries), [entries]);

  // Nothing posted yet → leave the page clean (the journal tab handles its
  // own empty state). When entries exist but nothing's flagged, show a calm
  // "ready to close" message so the AI assistant card still earns space.
  if (entries.length === 0) return null;

  if (flags.length === 0) {
    return (
      <section
        aria-label="AI close assistant"
        style={{
          margin: "0 0 14px",
          borderRadius: 12,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <InlineEmptyState
          icon={<CheckCircle2 size={14} style={{ color: "#0F9D58" }} />}
          title="Books are clean"
          body="No drafts aging, no round-number placeholders, no same-day duplicate posts. You're ready to close."
        />
      </section>
    );
  }

  return (
    <section
      aria-label="AI close assistant"
      style={{
        margin: "0 0 14px",
        padding: 14,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.07), rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.05))",
        border: "1px solid rgba(108,71,255,0.16)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(108,71,255,0.14)",
              color: "var(--vyne-accent, var(--vyne-purple))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              AI close assistant
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                }}
              >
                AI
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
              {flags.length} flag{flags.length === 1 ? "" : "s"} blocking month-end close.
            </div>
          </div>
        </div>
        <Link
          href="/ai?prompt=Walk%20me%20through%20month-end%20close%20and%20flag%20anything%20suspicious%20in%20the%20journal."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: "#fff",
            background: "var(--vyne-accent, var(--vyne-purple))",
            textDecoration: "none",
          }}
        >
          Run close review <ArrowRight size={11} />
        </Link>
      </header>

      <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
        {flags.map((f) => {
          const Icon = f.severity === "warn" ? AlertCircle : FileWarning;
          const color = f.severity === "warn" ? "#B91C1C" : "#1E40AF";
          return (
            <li
              key={f.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 9,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {f.body}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
