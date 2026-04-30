"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/useMounted";

const STORAGE_KEY = "vyne-tour-done-v1";

interface Step {
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to VYNE",
    body: "One workspace for projects, chat, CRM, ops, and AI. The sidebar on the left has every module.",
    tip: "On mobile, swipe from the left edge to open the module list.",
  },
  {
    title: "Press ⌘K (or Ctrl+K) anytime",
    body: "Jump to any page, run an action, or search every record. Everything you can click is one keystroke away.",
    tip: "Press ? to see all keyboard shortcuts.",
  },
  {
    title: "Talk to Vyne AI",
    body: "Ask questions about your workspace, or just say things like “create a deal for Acme worth $50k” — the AI will create the records for you.",
  },
];

/**
 * Three-step product tour shown once on first visit. Stored as a flag
 * in localStorage so it never re-appears unless the user clears
 * storage. Skippable at any step.
 */
export function OnboardingTour() {
  const mounted = useMounted();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mounted) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, [mounted]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open || !mounted) return null;
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,24,32,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          width: "min(440px, 100%)",
          borderRadius: 16,
          border: "1px solid var(--content-border)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: 24,
                height: 4,
                borderRadius: 2,
                background:
                  i === step
                    ? "var(--vyne-purple, #5B5BD6)"
                    : "var(--content-border)",
              }}
            />
          ))}
        </div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{cur.title}</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>
          {cur.body}
        </p>
        {cur.tip && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
            }}
          >
            💡 {cur.tip}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={close}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => (isLast ? close() : setStep(step + 1))}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-purple, #5B5BD6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
