"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  body: string;
  cta?: string;
  route?: string;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to VYNE",
    body: "VYNE replaces Slack, Jira, Notion, QuickBooks, and Salesforce with one AI-native workspace. This quick tour will show you the most important surfaces so you can get productive fast.",
    tip: "You can skip at any time and re-open this from Settings → General.",
    cta: "Start tour",
  },
  {
    title: "Keyboard shortcuts run the app",
    body: "Press ? anywhere to see every shortcut. A few worth memorising now: ⌘K opens the command palette, F toggles focus mode, G+H jumps to Home, C+I creates a new issue.",
    cta: "Next",
  },
  {
    title: "Chat, but wired to your business",
    body: "Slash commands in chat execute real actions — try /approve-order, /stock, /invoice. Results render inline and trigger audit-log entries.",
    route: "/chat",
    cta: "Open chat",
  },
  {
    title: "Projects + sprints",
    body: "Kanban, sprints, roadmap — all connected. Assign issues, track sprint progress, and pin the list to the sidebar with the star icon.",
    route: "/projects",
    cta: "See projects",
  },
  {
    title: "Docs with real-time collab",
    body: "Start typing — collaborators appear live, AI can finish your sentence (press Tab), and every version is diffable + restorable.",
    route: "/docs",
    cta: "Open docs",
  },
  {
    title: "AI that connects everything",
    body: 'When a deploy breaks, VYNE calculates revenue impact ("47 orders stuck, $12,400 at risk") and suggests a fix — because chat, code, orders, and finance all live here.',
    route: "/ai",
    cta: "Meet the AI",
  },
  {
    title: "You're all set",
    body: "That's the tour. Everything you saw works in demo mode — add real env vars when you deploy to wire billing, email, S3, and Claude.",
    tip: "Need this tour again? Settings → General → Replay product tour.",
    cta: "Close",
  },
];

const STORAGE_KEY = "vyne-tour-v1";

function loadSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return true;
  }
}

export function ProductTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Open on first visit or when explicitly requested
    const seen = loadSeen();
    if (!seen) {
      // Show on next tick to avoid layout flash
      const id = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(id);
    }

    function openHandler() {
      setStep(0);
      setOpen(true);
    }
    globalThis.addEventListener("vyne:open-tour", openHandler as EventListener);
    return () =>
      globalThis.removeEventListener(
        "vyne:open-tour",
        openHandler as EventListener,
      );
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // ignore
    }
  }

  function next() {
    const current = TOUR_STEPS[step];
    if (current.route) {
      router.push(current.route);
    }
    if (step >= TOUR_STEPS.length - 1) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!open) return null;

  const current = TOUR_STEPS[step];
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  return (
    <div
      role="dialog"
      aria-label="Product tour"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 400,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* Progress bar */}
        <div
          aria-hidden="true"
          style={{
            height: 3,
            background: "var(--content-secondary)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))",
              transition: "width 0.25s ease",
            }}
          />
        </div>

        <div style={{ padding: 24, position: "relative" }}>
          <button
            type="button"
            aria-label="Close tour"
            onClick={close}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
              color: "var(--vyne-accent, var(--vyne-purple))",
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            <Sparkles size={11} />
            Step {step + 1} of {TOUR_STEPS.length}
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              margin: "0 0 10px",
              lineHeight: 1.25,
            }}
          >
            {current.title}
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              margin: "0 0 18px",
            }}
          >
            {current.body}
          </p>

          {current.tip && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginBottom: 18,
              }}
            >
              💡 {current.tip}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            )}
            {step < TOUR_STEPS.length - 1 && (
              <button
                type="button"
                onClick={close}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)",
              }}
            >
              {current.cta ?? "Next"}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fires a global event the ProductTour listens for. */
export function openProductTour() {
  globalThis.dispatchEvent(new Event("vyne:open-tour"));
}
