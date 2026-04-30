"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Wand2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

const STORAGE_KEY = "vyne-ai-onboarding-dismissed";

interface Card {
  icon: typeof Wand2;
  title: string;
  body: string;
  cta: string;
  href: string;
  accent: string;
}

const CARDS: Card[] = [
  {
    icon: Wand2,
    title: "Vyne AI is your copilot",
    body:
      "Ask about your projects, deals, contacts, or anything else. Streaming answers cite real records like [task:VYNE-50] and link to live data.",
    cta: "Try it",
    href: "/ai/chat",
    accent: "var(--vyne-accent, #06B6D4)",
  },
  {
    icon: ImageIcon,
    title: "Generate images & diagrams",
    body:
      "Tap the 📷 Image quick-action to make pictures from text, or ask 'generate a flowchart of order checkout' for live Mermaid diagrams.",
    cta: "Open Vyne AI",
    href: "/ai/chat",
    accent: "#A855F7",
  },
  {
    icon: FileText,
    title: "BRDs, TRDs, sheets, slides",
    body:
      "Quick-action chips run an interview to gather context, then produce an editable artifact. Each one comes with copy, download, and PDF export.",
    cta: "Make a BRD",
    href: "/ai/chat",
    accent: "#0891B2",
  },
];

/**
 * 3-card onboarding banner. Renders once for new users on /home,
 * dismisses persistently. Carousel with prev/next + dot indicators.
 */
export function AiOnboardingCards() {
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "1");
  }, []);

  function dismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }

  if (dismissed) return null;
  const card = CARDS[idx];
  const Icon = card.icon;

  return (
    <div
      role="region"
      aria-label="Vyne AI onboarding"
      style={{
        position: "relative",
        display: "flex",
        gap: 16,
        padding: "16px 18px",
        marginBottom: 16,
        borderRadius: 14,
        border: `1px solid ${card.accent}55`,
        background: `linear-gradient(135deg, ${card.accent}1A 0%, var(--content-bg) 60%)`,
        animation: "fadeIn 0.2s ease-out",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: card.accent,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 8px 22px ${card.accent}55`,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: card.accent,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Sparkles size={11} /> New · {idx + 1}/{CARDS.length}
          </span>
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {card.title}
        </h3>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          {card.body}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          aria-label="Previous"
          style={navBtn(idx === 0)}
        >
          <ChevronLeft size={14} />
        </button>
        <Link
          href={card.href}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            background: card.accent,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
          onClick={() => dismiss()}
        >
          {card.cta}
        </Link>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(CARDS.length - 1, i + 1))}
          disabled={idx === CARDS.length - 1}
          aria-label="Next"
          style={navBtn(idx === CARDS.length - 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss onboarding"
        title="Dismiss"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
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
        <X size={12} />
      </button>
    </div>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: "1px solid var(--content-border)",
    background: "var(--content-secondary)",
    color: "var(--text-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
