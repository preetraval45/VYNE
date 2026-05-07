"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, FileText, Play } from "lucide-react";

export interface EmptyStateTemplate {
  /** Stable id used for analytics. */
  id: string;
  /** Card label. */
  label: string;
  /** One-line teaser shown under the label. */
  description?: string;
  /** Click handler — typically prefills the store with sample rows. */
  onApply: () => void;
  /** Optional explicit emoji / icon. Defaults to FileText. */
  icon?: ReactNode;
}

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary CTA — typically the "create new" path. */
  primary?: { label: string; href?: string; onClick?: () => void };
  /** Optional secondary CTA — defaults to "Create with AI" → /ai/chat. */
  aiPrompt?: string;
  hideAi?: boolean;
  /** Phase 15.4 — one-click templates the user can apply to populate
   *  the empty list with sample / starter rows. Renders as a chip row
   *  below the CTAs. */
  templates?: EmptyStateTemplate[];
  /** Optional 30-second demo URL (video file or YouTube). Renders as
   *  a "Watch a 30s demo" pill alongside the AI CTA. */
  demoVideoUrl?: string;
}

/**
 * Standard empty-state card. Used wherever a list/table renders zero
 * items. The secondary CTA pre-fills `/ai/chat` with a suggested
 * prompt so users can try the AI tool-calling layer to populate
 * the empty module instantly.
 */
export function EmptyState({
  icon,
  title,
  description,
  primary,
  aiPrompt,
  hideAi,
  templates,
  demoVideoUrl,
}: Props) {
  const aiHref = aiPrompt
    ? `/ai/chat?prompt=${encodeURIComponent(aiPrompt)}`
    : "/ai/chat";

  return (
    <div
      role="status"
      className="vyne-empty"
      style={{
        border: "1px dashed var(--content-border)",
        borderRadius: 14,
        background: "var(--content-secondary)",
      }}
    >
      {icon && (
        <div data-empty-icon aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 data-empty-title style={{ margin: 0 }}>{title}</h3>
      {description && (
        <p data-empty-body style={{ margin: 0 }}>
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
        {demoVideoUrl && (
          <a
            href={demoVideoUrl}
            target="_blank"
            rel="noreferrer"
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
            <Play size={13} /> Watch 30s demo
          </a>
        )}
      </div>
      {templates && templates.length > 0 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px dashed var(--content-border)",
            width: "100%",
            maxWidth: 560,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Or start with a template
          </div>
          <div
            role="list"
            aria-label="Templates"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
            }}
          >
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                role="listitem"
                onClick={tpl.onApply}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor =
                    "var(--vyne-accent, var(--vyne-purple))")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor =
                    "var(--content-border)")
                }
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "var(--content-secondary)",
                    color: "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {tpl.icon ?? <FileText size={12} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tpl.label}
                  </div>
                  {tpl.description && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tpl.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
