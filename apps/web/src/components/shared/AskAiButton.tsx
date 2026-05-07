"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

export interface AskAiSuggestion {
  /** One-line button label as it appears in the dropdown. */
  label: string;
  /** Pre-filled prompt sent to /ai/chat?prompt=… when tapped. */
  prompt: string;
}

export interface AskAiButtonProps {
  /** Module / page noun shown in the trigger label. e.g. "deals" → "Ask AI about deals" */
  noun?: string;
  /** Suggestion list — typically 3-5 page-relevant prompts. When present
   *  the button renders as a dropdown; without them it links straight
   *  to /ai/chat with no preamble. */
  suggestions?: AskAiSuggestion[];
  /** Optional pre-fill that fires when the bare trigger is clicked
   *  (no dropdown). Ignored when `suggestions` is set. */
  defaultPrompt?: string;
  /** Visual variant: full button (`primary`) or icon-only (`icon`). */
  variant?: "primary" | "icon";
  /** Extra style override for the trigger. */
  style?: CSSProperties;
}

/**
 * AskAiButton — universal "Ask AI" affordance for any page.
 *
 * Drops next to the page header / detail panel. When `suggestions`
 * is provided it renders a dropdown of pre-filled prompts; tapping
 * any of them deep-links to `/ai/chat?prompt=…` so the user lands
 * on the AI workspace with the question already typed and the
 * assistant streaming a grounded answer.
 *
 *   <AskAiButton
 *     noun="deals"
 *     suggestions={[
 *       { label: "Stalled deals?", prompt: "Show me deals idle > 14 days" },
 *       { label: "Forecast Q1", prompt: "What's my weighted forecast for Q1?" },
 *     ]}
 *   />
 */
export function AskAiButton({
  noun,
  suggestions,
  defaultPrompt,
  variant = "primary",
  style,
}: AskAiButtonProps) {
  const label = noun ? `Ask AI about ${noun}` : "Ask Vyne AI";
  const fallbackHref = defaultPrompt
    ? `/ai/chat?prompt=${encodeURIComponent(defaultPrompt)}`
    : "/ai/chat";

  // No suggestions → render a plain link button (single click).
  if (!suggestions || suggestions.length === 0) {
    return (
      <Link
        href={fallbackHref}
        title={label}
        aria-label={label}
        style={
          variant === "icon"
            ? {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, var(--teal-400) 0%, var(--teal-600) 100%)",
                color: "#fff",
                textDecoration: "none",
                boxShadow:
                  "0 0 0 1px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18), 0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.28)",
                ...style,
              }
            : {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, var(--teal-400) 0%, var(--teal-600) 100%)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow:
                  "0 0 0 1px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18), 0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.28)",
                ...style,
              }
        }
      >
        <Sparkles size={variant === "icon" ? 14 : 12} />
        {variant !== "icon" && label}
      </Link>
    );
  }

  // With suggestions → details/summary dropdown (no JS state needed).
  return (
    <details
      style={{ position: "relative", ...style }}
      data-vyne-ai-button
    >
      <summary
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 12px",
          borderRadius: 8,
          background:
            "linear-gradient(135deg, var(--teal-400) 0%, var(--teal-600) 100%)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          listStyle: "none",
          whiteSpace: "nowrap",
          boxShadow:
            "0 0 0 1px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18), 0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.28)",
        }}
      >
        <Sparkles size={12} /> {label}
      </summary>

      <div
        role="menu"
        aria-label={label}
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          minWidth: 260,
          maxWidth: "calc(100vw - 24px)",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
          padding: 6,
          zIndex: 50,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            padding: "6px 10px 4px",
          }}
        >
          Suggested questions
        </div>
        {suggestions.map((s) => (
          <Link
            key={s.label}
            role="menuitem"
            href={`/ai/chat?prompt=${encodeURIComponent(s.prompt)}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 7,
              fontSize: 12.5,
              color: "var(--text-primary)",
              textDecoration: "none",
              transition: "background 0.12s",
            }}
          >
            <Sparkles size={12} style={{ color: "var(--vyne-accent, #06B6D4)", flexShrink: 0 }} />
            <span>{s.label}</span>
          </Link>
        ))}
        <div
          style={{
            borderTop: "1px solid var(--content-border)",
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <Link
            href="/ai/chat"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            <Sparkles size={11} /> Open AI workspace…
          </Link>
        </div>
      </div>
    </details>
  );
}
