"use client";

// 14-day trial banner (UI_UPGRADE_PLAN.md 3.5). Reads /api/stripe/status
// via the shared `useSubscriptionPlan` hook; renders a slim banner under
// the topbar when the user is in a trial. Color shifts amber → red as
// the trial deadline approaches; clicking opens /settings?tab=billing.
// Dismissable per-day via localStorage so a user who wants to ignore
// the nag for a few hours can; it returns the next morning.

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

const STORAGE_KEY = "vyne-trial-banner-dismissed";

function dismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (!v) return false;
  return v === new Date().toISOString().slice(0, 10);
}

export function TrialBanner() {
  const status = useSubscriptionPlan();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(dismissedToday());
  }, []);

  if (status.loading) return null;
  if (!status.isTrialing) return null;
  if (dismissed) return null;
  const daysLeft = status.daysLeftInTrial ?? 0;

  // Color band: > 7d normal accent; 3–7d amber; <3d red.
  const tone =
    daysLeft <= 3
      ? { bg: "var(--accent-error-soft)", border: "var(--accent-error)" }
      : daysLeft <= 7
        ? { bg: "rgba(245, 158, 11, 0.10)", border: "rgba(245, 158, 11, 0.5)" }
        : {
            bg: "var(--vyne-accent-soft, var(--vyne-purple-soft))",
            border: "var(--vyne-accent, var(--vyne-purple))",
          };

  const headline =
    daysLeft === 0
      ? "Trial expires today"
      : daysLeft === 1
        ? "Trial expires tomorrow"
        : `${daysLeft} days left in trial`;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: tone.bg,
        borderBottom: `1px solid ${tone.border}`,
        fontSize: 13,
        color: "var(--text-primary)",
        position: "relative",
      }}
    >
      <Sparkles size={14} aria-hidden="true" />
      <strong style={{ fontWeight: 500 }}>{headline}</strong>
      <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        Upgrade to keep AI, RAG, and bulk export beyond 1k rows.
      </span>
      <Link
        href="/settings?tab=billing"
        style={{
          marginLeft: "auto",
          padding: "4px 12px",
          border: `1px solid ${tone.border}`,
          borderRadius: 6,
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          fontSize: 12,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Upgrade
      </Link>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              STORAGE_KEY,
              new Date().toISOString().slice(0, 10),
            );
          }
        }}
        aria-label="Dismiss trial banner for today"
        style={{
          width: 24,
          height: 24,
          border: "none",
          background: "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
