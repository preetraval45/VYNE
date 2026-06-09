"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Sparkles,
  MessageSquare,
  StickyNote,
  Download as DownloadIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { useMounted } from "@/hooks/useMounted";
import { QuickCreateIssueModal } from "@/components/layout/QuickCreateIssueModal";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearchInput } from "@/components/layout/GlobalSearchInput";

// Page title + emoji keyed by the first path segment, so the topbar shows the
// current module on the left (like the reference UI) instead of a greeting.
// Emojis match the home module grid — zero extra icon imports.
const PAGE_META: Record<string, { title: string; emoji: string }> = {
  home: { title: "Home", emoji: "🏠" },
  dashboard: { title: "My Dashboard", emoji: "📊" },
  contacts: { title: "Accounts & Contacts", emoji: "📇" },
  sales: { title: "Sales", emoji: "📈" },
  projects: { title: "Project Management", emoji: "📋" },
  chat: { title: "Chat", emoji: "💬" },
  calendar: { title: "Calendar", emoji: "📅" },
  crm: { title: "CRM", emoji: "🎯" },
  finance: { title: "Finance", emoji: "💰" },
  ops: { title: "Operations", emoji: "📦" },
  hr: { title: "HR", emoji: "👥" },
  invoicing: { title: "Invoicing", emoji: "📑" },
  vendors: { title: "Vendors", emoji: "🏢" },
  expenses: { title: "Expenses", emoji: "🧾" },
  docs: { title: "Docs", emoji: "📄" },
  code: { title: "Code", emoji: "⌨️" },
  observe: { title: "Observe", emoji: "📡" },
  ai: { title: "Vyne AI", emoji: "🧠" },
  marketing: { title: "Marketing", emoji: "📣" },
  reporting: { title: "Reporting", emoji: "📊" },
  automations: { title: "Automations", emoji: "⚡" },
  roadmap: { title: "Roadmap", emoji: "🗺️" },
  settings: { title: "Settings", emoji: "⚙️" },
  admin: { title: "Admin", emoji: "🛡️" },
  "field-service": { title: "Field Service", emoji: "🛠️" },
};

function pageMetaFor(pathname: string | null): {
  title: string;
  emoji: string;
} {
  const seg = (pathname ?? "").split("/").filter(Boolean)[0];
  return (seg && PAGE_META[seg]) || { title: "VYNE", emoji: "▦" };
}

// A few `?view=` keys aren't a simple Title-Case of the slug; the rest fall
// through to capitalize. Powers the "Module › Section" breadcrumb.
const SECTION_LABELS: Record<string, string> = {
  pl: "P&L Statement",
  orgchart: "Org Chart",
  creditNotes: "Credit Notes",
  mine: "My Expenses",
  table: "Deals Table",
  accounts: "Accounts",
};

function sectionLabelFor(view: string | null): string | null {
  if (!view) return null;
  if (SECTION_LABELS[view]) return SECTION_LABELS[view];
  // camelCase → spaced, then capitalize each word.
  const spaced = view.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Global unified top bar — renders at the top of every dashboard page.
 *
 *   Left:   current page icon + title (e.g. "📈 Sales")
 *   Center: global search bar
 *   Right:  Vyne AI · + New · chat · alerts · notes · Get app ·
 *           avatar + name + role
 *
 * Single source of top-of-page navigation across all viewports + pages.
 */
export function UnifiedTopBar() {
  const user = useAuthStore((s) => s.user);
  const mounted = useMounted();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const page = pageMetaFor(pathname);
  const sectionLabel = sectionLabelFor(searchParams.get("view"));
  const displayName = mounted ? (user?.name ?? "User") : "User";
  const roleLabel = mounted ? (user?.role ?? "Member") : "Member";

  const userInitials =
    (user?.name ?? "")
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
          gap: 12,
          padding: "6px 16px",
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
        suppressHydrationWarning
      >
        {/* Left: current page icon + title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              flexShrink: 0,
            }}
          >
            {page.emoji}
          </span>
          <h1
            className="vyne-unified-greeting"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {page.title}
          </h1>
          {/* Sub-section breadcrumb (Module › Section) from ?view= so deep
              sub-pages keep the user oriented in the topbar, not just in-page. */}
          {sectionLabel && (
            <span
              className="vyne-unified-section"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              <span aria-hidden="true" style={{ opacity: 0.5 }}>
                ›
              </span>
              {sectionLabel}
            </span>
          )}
        </div>

        {/* Center: global search */}
        <div
          className="vyne-unified-search"
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <GlobalSearchInput />
        </div>

        {/* Right: action cluster + avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <Link
            href="/ai/chat"
            aria-label="Open Vyne AI"
            title="Vyne AI — copilot, BRDs, diagrams, sheets, slides"
            className="vyne-unified-vyne-ai"
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

          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            aria-label="Create new task"
            className="vyne-unified-newissue"
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
            <span className="vyne-unified-newissue-label">+ New Task</span>
          </button>

          <Link
            href="/chat"
            aria-label="Open messages"
            title="Messages"
            className="vyne-unified-chat"
            style={iconBtn}
          >
            <MessageSquare size={14} />
          </Link>

          <NotificationBell />

          <button
            type="button"
            onClick={() =>
              globalThis.dispatchEvent(new CustomEvent("vyne:open-notes"))
            }
            aria-label="Open quick notes"
            title="Quick notes"
            className="vyne-unified-notes"
            style={iconBtn}
          >
            <StickyNote size={14} />
          </button>

          <Link
            href="/download"
            aria-label="Download desktop and mobile apps"
            title="Get the desktop & mobile apps"
            className="vyne-unified-getapp"
            style={{
              // Secondary utility action — ghost/outline so the primary CTAs
              // (Vyne AI, + New Task) clearly read as the prominent ones.
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 30,
              padding: "0 12px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 11.5,
              fontWeight: 600,
              border: "1px solid var(--content-border)",
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <DownloadIcon size={12} strokeWidth={2.25} />
            Get app
          </Link>

          <div
            aria-hidden="true"
            className="vyne-unified-divider"
            style={{
              width: 1,
              height: 24,
              background: "var(--content-border)",
              flexShrink: 0,
            }}
          />

          {/* Avatar + name + role */}
          <Link
            href="/settings"
            aria-label={`${displayName} — account settings`}
            title={`${displayName} · ${roleLabel}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              className="vyne-unified-avatar"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg,var(--vyne-accent, #06B6D4),var(--vyne-accent-deep, #0891B2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
                boxShadow:
                  "0 2px 6px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32)",
              }}
            >
              {userInitials}
            </div>
            <span
              className="vyne-unified-usermeta"
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.15,
                minWidth: 0,
              }}
              suppressHydrationWarning
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 140,
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 140,
                }}
              >
                {roleLabel}
              </span>
            </span>
          </Link>
        </div>
      </header>
    </>
  );
}
