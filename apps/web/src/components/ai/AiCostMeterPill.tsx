"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Coins, ChevronDown, X } from "lucide-react";
import { useAiCostMeter } from "@/lib/stores/aiCostMeter";

/**
 * AiCostMeterPill — compact "today / MTD" cost pill that lives in the
 * AI chat header. Click → popover with breakdown by model + the last
 * 10 calls.
 *
 * Reads from `useAiCostMeter`. Renders nothing when no calls have
 * been recorded yet (no point in a $0.00 pill on first paint).
 */

function fmtUsd(n: number): string {
  if (n < 0.01 && n > 0) return "<$0.01";
  return n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export function AiCostMeterPill() {
  // Select the raw events array only. Deriving today/month totals must
  // happen in useMemo, NOT inside the selector — totalsToday()/
  // totalsThisMonth() allocate a fresh {tokens,usd} object each call,
  // which makes Zustand's snapshot always "change" and triggers an
  // infinite render loop (React error #185). See feedback_zustand_selectors.
  const events = useAiCostMeter((s) => s.events);
  const clear = useAiCostMeter((s) => s.clear);
  const { today, month } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dayStart = todayStart.getTime();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monStart = monthStart.getTime();
    let dayTokens = 0,
      dayUsd = 0,
      monTokens = 0,
      monUsd = 0;
    for (const e of events) {
      const t = new Date(e.ts).getTime();
      const tok = e.inputTokens + e.outputTokens;
      if (t >= dayStart) {
        dayTokens += tok;
        dayUsd += e.costUsd;
      }
      if (t >= monStart) {
        monTokens += tok;
        monUsd += e.costUsd;
      }
    }
    return {
      today: { tokens: dayTokens, usd: dayUsd },
      month: { tokens: monTokens, usd: monUsd },
    };
  }, [events]);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (events.length === 0) return null;

  // Per-model breakdown for the popover.
  const byModel = new Map<
    string,
    { tokens: number; usd: number; calls: number }
  >();
  for (const e of events) {
    const cur = byModel.get(e.model) ?? { tokens: 0, usd: 0, calls: 0 };
    cur.tokens += e.inputTokens + e.outputTokens;
    cur.usd += e.costUsd;
    cur.calls += 1;
    byModel.set(e.model, cur);
  }
  const breakdown = Array.from(byModel.entries()).sort(
    (a, b) => b[1].usd - a[1].usd,
  );

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={`AI cost · today ${fmtUsd(today.usd)} · this month ${fmtUsd(month.usd)}`}
        title={`Today: ${fmtUsd(today.usd)} · MTD: ${fmtUsd(month.usd)}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 999,
          border: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          color: "var(--text-secondary)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Coins
          size={11}
          style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}
        />
        {fmtUsd(today.usd)} today
        <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>
          · {fmtUsd(month.usd)} MTD
        </span>
        <ChevronDown size={10} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="AI usage breakdown"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 320,
            maxHeight: 380,
            overflow: "auto",
            zIndex: 70,
            padding: 12,
            borderRadius: 10,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>
              AI usage
            </strong>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={{
                width: 22,
                height: 22,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </header>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Tile label="Today" tokens={today.tokens} usd={today.usd} />
            <Tile label="This month" tokens={month.tokens} usd={month.usd} />
          </div>
          <header
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            By model
          </header>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {breakdown.map(([model, v]) => (
              <li
                key={model}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  borderBottom: "1px dashed var(--content-border)",
                  fontSize: 11.5,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {model}
                </span>
                <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>
                  {fmtTokens(v.tokens)}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    marginLeft: 12,
                    minWidth: 56,
                    textAlign: "right",
                  }}
                >
                  {fmtUsd(v.usd)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              clear();
              setOpen(false);
            }}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  tokens,
  usd,
}: {
  label: string;
  tokens: number;
  usd: number;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {fmtUsd(usd)}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginTop: 2,
        }}
      >
        {label} · {fmtTokens(tokens)}
      </div>
    </div>
  );
}
