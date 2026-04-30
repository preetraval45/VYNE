"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  StickyNote,
  Download as DownloadIcon,
} from "lucide-react";
import { VyneLogo } from "@/components/brand/VyneLogo";
import { useAuthStore } from "@/lib/stores/auth";
import { useMounted } from "@/hooks/useMounted";
import { QuickCreateIssueModal } from "@/components/layout/QuickCreateIssueModal";

function greetingFor(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Working late";
}

/**
 * Global unified top bar — renders at the top of every dashboard page.
 *
 *   Left:  V logo + dynamic greeting (Good morning, Preet 👋)
 *   Right: today's date · + New Issue · user avatar · divider ·
 *          Vyne AI pill · chat icon · notes icon · Get app pill
 *
 * Replaces the previous floating .global-topnav-rail and home-only
 * topbar — those are hidden via CSS so this is the single source of
 * top-of-page navigation across all viewports + all pages.
 *
 * Greeting + date are gated on `useMounted()` to avoid React hydration
 * #418 (server renders UTC, client renders local).
 */
export function UnifiedTopBar() {
  const user = useAuthStore((s) => s.user);
  const mounted = useMounted();
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  // Seed greeting from localStorage so the very first paint shows the
  // real greeting instead of "Welcome", eliminating the flash. Only
  // honored after `mounted` so server-render still produces stable HTML.
  const cached =
    typeof window !== "undefined"
      ? window.localStorage.getItem("vyne-last-greeting")
      : null;
  const firstName = mounted ? (user?.name ?? "there").split(" ")[0] : "there";
  const liveGreeting = mounted ? greetingFor(new Date().getHours()) : null;
  const greeting = liveGreeting ?? cached ?? "Welcome";

  // Persist the greeting on each tick so the next page-load has a
  // pre-warmed value before mount completes.
  useEffect(() => {
    if (liveGreeting && typeof window !== "undefined") {
      window.localStorage.setItem("vyne-last-greeting", liveGreeting);
    }
  }, [liveGreeting]);
  const todayLabel = mounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const userInitials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const iconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
    border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.28)",
    color: "var(--vyne-teal)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textDecoration: "none",
    flexShrink: 0,
  };

  return (
    <>
    <QuickCreateIssueModal
      open={issueModalOpen}
      onClose={() => setIssueModalOpen(false)}
    />
    <header
      className="vyne-unified-topbar"
      role="banner"
      aria-label="Top navigation"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 45,
        minHeight: 48,
        background: "var(--content-bg)",
        borderBottom: "1px solid var(--content-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "6px 16px",
        gap: 10,
        flexWrap: "nowrap",
        overflowX: "auto",
        flexShrink: 0,
      }}
      suppressHydrationWarning
    >
      {/* Left: logo + greeting (auto-margins push the rest right) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flexShrink: 0,
          marginRight: "auto",
        }}
      >
        <VyneLogo variant="mark" markSize={20} />
        <h1
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
          suppressHydrationWarning
        >
          {greeting}, {firstName} 👋
        </h1>
      </div>

      <span
        className="vyne-unified-date"
        style={{
          fontSize: 11.5,
          color: "var(--text-tertiary)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        suppressHydrationWarning
      >
        {todayLabel}
      </span>

      <button
        type="button"
        onClick={() => setIssueModalOpen(true)}
        aria-label="Create new issue"
        style={{
          background:
            "linear-gradient(135deg, var(--vyne-accent-light, #7c4dff) 0%, var(--vyne-accent, var(--vyne-purple)) 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 11.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          boxShadow:
            "0 4px 12px rgba(124, 77, 255, 0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        + New Issue
      </button>

      <div
        aria-label={user?.name ?? "Profile"}
        title={user?.name ?? "Profile"}
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "linear-gradient(135deg,var(--vyne-accent, #06B6D4),var(--vyne-accent-deep, #0891B2))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32)",
        }}
      >
        {userInitials}
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 22,
          background: "var(--content-border)",
          flexShrink: 0,
        }}
      />

      <Link
        href="/ai/chat"
        aria-label="Open Vyne AI"
        title="Vyne AI — copilot, BRDs, diagrams, sheets, slides"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 30,
          padding: "0 12px",
          borderRadius: 8,
          background:
            "linear-gradient(135deg, var(--teal-400) 0%, var(--teal-600) 100%)",
          border: "1px solid var(--teal-500)",
          color: "#fff",
          fontSize: 11.5,
          fontWeight: 600,
          textDecoration: "none",
          flexShrink: 0,
          boxShadow:
            "0 0 0 1px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18), 0 6px 16px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.20)",
        }}
      >
        <Sparkles size={12} strokeWidth={2.25} />
        Vyne AI
      </Link>

      <Link
        href="/chat"
        aria-label="Open messages"
        title="Messages"
        style={iconBtn}
      >
        <MessageSquare size={14} />
      </Link>

      <button
        type="button"
        onClick={() =>
          globalThis.dispatchEvent(new CustomEvent("vyne:open-notes"))
        }
        aria-label="Open quick notes"
        title="Quick notes"
        style={iconBtn}
      >
        <StickyNote size={14} />
      </button>

      <Link
        href="/download"
        aria-label="Download desktop and mobile apps"
        title="Get the desktop & mobile apps"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 30,
          padding: "0 12px",
          borderRadius: 8,
          background:
            "linear-gradient(135deg, var(--teal-500) 0%, var(--teal-700) 100%)",
          color: "#fff",
          fontSize: 11.5,
          fontWeight: 600,
          border: "1px solid var(--teal-500)",
          textDecoration: "none",
          flexShrink: 0,
          whiteSpace: "nowrap",
          boxShadow:
            "0 0 0 1px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10), 0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.28), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        <DownloadIcon size={12} strokeWidth={2.25} />
        Get app
      </Link>
    </header>
    </>
  );
}
