"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary CTA — typically the "create new" path. */
  primary?: { label: string; href?: string; onClick?: () => void };
  /** Optional secondary CTA — defaults to "Create with AI" → /ai/chat. */
  aiPrompt?: string;
  hideAi?: boolean;
}

/**
 * Standard empty-state card. Used wherever a list/table renders zero
 * items. The secondary CTA pre-fills `/ai/chat` with a suggested
 * prompt so users can try the AI tool-calling layer to populate
 * the empty module instantly.
 */
export function EmptyState({ icon, title, description, primary, aiPrompt, hideAi }: Props) {
  const aiHref = aiPrompt
    ? `/ai/chat?prompt=${encodeURIComponent(aiPrompt)}`
    : "/ai/chat";

  return (
    <div
      role="status"
      style={{
        textAlign: "center",
        padding: "48px 24px",
        border: "1px dashed var(--content-border)",
        borderRadius: 14,
        background: "var(--content-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "var(--content-bg)",
            color: "var(--vyne-purple, #5B5BD6)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--content-border)",
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-secondary)",
            maxWidth: 360,
          }}
        >
          {description}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {primary?.href && (
          <Link
            href={primary.href}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--vyne-purple, #5B5BD6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {primary.label}
          </Link>
        )}
        {primary?.onClick && !primary.href && (
          <button
            type="button"
            onClick={primary.onClick}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--vyne-purple, #5B5BD6)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {primary.label}
          </button>
        )}
        {!hideAi && (
          <Link
            href={aiHref}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={14} /> Create with AI
          </Link>
        )}
      </div>
    </div>
  );
}
