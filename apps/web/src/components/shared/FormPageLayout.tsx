"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export interface FormPageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  /** Right side of hero — typically nothing, sometimes a "Delete" link on edit */
  headerActions?: ReactNode;
  /** Main form body (left column on wide screens) */
  children: ReactNode;
  /** Optional right column — tips, preview, quick-links */
  aside?: ReactNode;
  /** Sticky footer — Cancel + Save buttons, etc. */
  footer: ReactNode;
  /** Whether the form has unsaved changes (for beforeunload + back-guard) */
  dirty?: boolean;
  /** Where the Back button should navigate */
  backHref: string;
  /** Max width of the form column */
  maxWidth?: number;
}

export function FormPageLayout({
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  children,
  aside,
  footer,
  dirty = false,
  backHref,
  maxWidth = 720,
}: FormPageLayoutProps) {
  const router = useRouter();

  // Warn on browser close/reload if dirty
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Escape key → back (with confirm if dirty)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      // don't steal Escape from inputs mid-edit
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        (target as HTMLInputElement).blur?.();
        return;
      }
      if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
      router.push(backHref);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dirty, router, backHref]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--content-bg-secondary)" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--content-bg)",
          borderBottom: "1px solid var(--content-border)",
          padding: "16px 28px",
        }}
      >
        {/* Breadcrumbs row */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 10,
            }}
          >
            <Link
              href={backHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              <ArrowLeft size={13} />
              Back
            </Link>
            <span style={{ width: 1, height: 12, background: "var(--content-border)", margin: "0 6px" }} />
            {breadcrumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {c.href ? (
                  <Link href={c.href} style={{ color: "var(--text-secondary)" }}>
                    {c.label}
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                  letterSpacing: "-0.005em",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{headerActions}</div>}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "28px" }}
      >
        <div
          className={cn("mx-auto", aside ? "form-page-grid" : "")}
          style={{
            maxWidth: aside ? 1100 : maxWidth,
            display: aside ? "grid" : "block",
            gridTemplateColumns: aside ? `minmax(0, ${maxWidth}px) minmax(260px, 320px)` : undefined,
            gap: aside ? 28 : undefined,
            alignItems: "start",
          }}
        >
          {/* Main form column */}
          <div>{children}</div>

          {/* Right-side aside (hidden on narrow screens via CSS) */}
          {aside && (
            <aside
              style={{
                position: "sticky",
                top: 24,
                alignSelf: "start",
              }}
              className="hide-mobile"
            >
              {aside}
            </aside>
          )}
        </div>
      </div>

      {/* ── Sticky footer ──────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 20,
          background: "var(--content-bg)",
          borderTop: "1px solid var(--content-border)",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        {footer}
      </div>
    </div>
  );
}

/* ─── Reusable form primitives used by form pages ──────────────── */

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: 24,
        marginBottom: 16,
      }}
    >
      {(title || description) && (
        <header style={{ marginBottom: 18 }}>
          {title && (
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h2>
          )}
          {description && (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-tertiary)",
                marginTop: 2,
                letterSpacing: "-0.005em",
              }}
            >
              {description}
            </p>
          )}
        </header>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </section>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 6,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--status-danger)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error ? (
        <p
          role="alert"
          style={{
            fontSize: 12,
            color: "var(--status-danger)",
            marginTop: 6,
            letterSpacing: "-0.005em",
          }}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginTop: 6,
            letterSpacing: "-0.005em",
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Standard footer buttons: Cancel + primary submit */
export function FormFooterButtons({
  onCancel,
  primaryLabel,
  primaryForm,
  primaryDisabled = false,
  primaryLoading = false,
  danger = false,
}: {
  onCancel: () => void;
  primaryLabel: string;
  /** `form` attribute so the submit button can live outside the <form> element */
  primaryForm?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  danger?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: "9px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: "var(--content-secondary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--content-border)",
          cursor: "pointer",
          letterSpacing: "-0.005em",
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        form={primaryForm}
        disabled={primaryDisabled || primaryLoading}
        style={{
          padding: "9px 18px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
          background: danger
            ? "var(--status-danger)"
            : "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
          border: "none",
          cursor: primaryDisabled || primaryLoading ? "not-allowed" : "pointer",
          opacity: primaryDisabled || primaryLoading ? 0.6 : 1,
          boxShadow: danger ? "none" : "0 2px 8px rgba(108,71,255,0.3)",
          letterSpacing: "-0.005em",
          minWidth: 100,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {primaryLoading ? "Saving…" : primaryLabel}
      </button>
    </>
  );
}
