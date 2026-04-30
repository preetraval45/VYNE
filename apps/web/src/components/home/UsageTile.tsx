"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";

// Simple per-day usage tile that pulls counters maintained client-side
// in localStorage by other features (AI calls, image gens, recap calls).
// Not a server-side billing dashboard — that needs Stripe metering plus
// per-user attribution, which is its own session.

const KEY = "vyne-usage-counters";
const PROJECTION_DAYS = 30;

interface Counters {
  date: string; // YYYY-MM-DD
  aiAsk: number;
  aiTools: number;
  aiImage: number;
  aiImprove: number;
  aiReceipt: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCounters(): Counters {
  if (typeof window === "undefined") {
    return { date: todayKey(), aiAsk: 0, aiTools: 0, aiImage: 0, aiImprove: 0, aiReceipt: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Counters;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    // ignore
  }
  return { date: todayKey(), aiAsk: 0, aiTools: 0, aiImage: 0, aiImprove: 0, aiReceipt: 0 };
}

/**
 * Increment a counter from any caller. Wraps fetch sites to keep this
 * useful even before a real metering pipeline. Re-resets at UTC midnight.
 */
export function bumpUsage(kind: keyof Omit<Counters, "date">): void {
  if (typeof window === "undefined") return;
  const c = readCounters();
  c[kind] = (c[kind] ?? 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // ignore
  }
}

export function UsageTile() {
  const mounted = useMounted();
  const [c, setC] = useState<Counters | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setC(readCounters());
    const id = setInterval(() => setC(readCounters()), 5000);
    return () => clearInterval(id);
  }, [mounted]);

  if (!mounted || !c) return null;
  const total = c.aiAsk + c.aiTools + c.aiImage + c.aiImprove + c.aiReceipt;
  if (total === 0) return null;

  // Rough free-tier ceiling for Gemini AI Studio: ~1500 calls/day.
  // Pure heuristic — replace with real provider headers when you wire
  // a metering pipeline.
  const ceiling = 1500;
  const pct = Math.min(100, Math.round((total / ceiling) * 100));
  const projected = Math.min(ceiling * PROJECTION_DAYS, total * PROJECTION_DAYS);

  return (
    <Link
      href="/observe"
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
          AI usage today · {total} call{total === 1 ? "" : "s"}
        </div>
        <div
          style={{
            marginTop: 6,
            height: 4,
            borderRadius: 4,
            background: "var(--content-secondary)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: pct > 80 ? "var(--status-warning, #d97706)" : "var(--vyne-accent, #5B5BD6)",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {c.aiAsk} ask · {c.aiTools} tools · {c.aiImage} images · {c.aiImprove} improve · {c.aiReceipt} OCR
          {total > 0 ? ` · projected ${projected.toLocaleString()}/mo` : ""}
        </div>
      </div>
    </Link>
  );
}
