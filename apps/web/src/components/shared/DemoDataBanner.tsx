"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import Link from "next/link";

/**
 * Sits at the top of a module that ships with seed fixtures so users
 * are never confused about what's real vs. sample. Dismissable per-
 * session (sessionStorage) so power users don't get nagged. The CTA
 * points at an import/connect flow — wire `ctaHref` to wherever that
 * lives for the module.
 */
export function DemoDataBanner({
  moduleName,
  ctaLabel = "Import yours",
  ctaHref,
  storageKey,
}: {
  moduleName: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Dismissal key. Defaults to `vyne-demo-banner-{moduleName}`. */
  storageKey?: string;
}) {
  const key = storageKey ?? `vyne-demo-banner-${moduleName.toLowerCase()}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(key) === "1";
  });

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-label={`${moduleName} is running on sample data`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--vyne-teal-border)",
        background: "var(--vyne-teal-soft)",
        color: "var(--text-primary)",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      <Info
        size={14}
        style={{ color: "var(--vyne-teal)", flexShrink: 0 }}
        aria-hidden="true"
      />
      <span>
        <strong style={{ fontWeight: 600 }}>{moduleName}</strong> is running on
        sample data so you can click around. Connect your own to make it real.
      </span>
      {ctaHref && (
        <Link
          href={ctaHref}
          style={{
            marginLeft: "auto",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--vyne-teal)",
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--content-bg)",
            border: "1px solid var(--vyne-teal-border)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {ctaLabel} →
        </Link>
      )}
      <button
        type="button"
        aria-label={`Dismiss ${moduleName} sample data notice`}
        onClick={() => {
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            // sessionStorage unavailable (private mode, SSR) — in-memory only
          }
          setDismissed(true);
        }}
        style={{
          marginLeft: ctaHref ? 6 : "auto",
          background: "transparent",
          border: "none",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          padding: 4,
          borderRadius: 6,
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
