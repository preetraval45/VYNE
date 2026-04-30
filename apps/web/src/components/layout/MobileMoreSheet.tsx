"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronDown,
  Home,
  BarChart3,
  Contact,
  TrendingUp,
  MessageSquare,
  Calendar as CalendarIcon,
  Activity,
  FolderKanban,
  FileText,
  Package,
  DollarSign,
  Target,
  Users,
  Receipt,
  Megaphone,
  GitBranch,
  Brain,
  Zap,
  FileSpreadsheet,
  Map,
  Clock,
  Download as DownloadIcon,
  LifeBuoy,
  ListChecks,
  GraduationCap,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Sub {
  label: string;
  href: string;
}

interface ModuleItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  subs?: Sub[];
}

const MODULES: ModuleItem[] = [
  { icon: Home, label: "Home", href: "/home", color: "var(--vyne-accent, #06B6D4)" },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard", color: "var(--vyne-accent, #06B6D4)" },
  {
    icon: Contact,
    label: "Contacts",
    href: "/contacts",
    color: "#2C3E50",
    subs: [
      { label: "Accounts", href: "/contacts" },
      { label: "Contacts", href: "/contacts" },
      { label: "Import", href: "/contacts" },
    ],
  },
  {
    icon: TrendingUp,
    label: "Sales",
    href: "/sales",
    color: "#27AE60",
    subs: [
      { label: "Opportunities", href: "/sales" },
      { label: "Quotations", href: "/sales" },
      { label: "Sales Orders", href: "/sales" },
      { label: "Products", href: "/sales" },
      { label: "Customers", href: "/sales" },
      { label: "Reports", href: "/sales" },
    ],
  },
  {
    icon: MessageSquare,
    label: "Chat",
    href: "/chat",
    color: "#3498DB",
    subs: [
      { label: "Channels", href: "/chat" },
      { label: "Direct Messages", href: "/chat" },
      { label: "Threads", href: "/chat" },
    ],
  },
  {
    icon: CalendarIcon,
    label: "Calendar",
    href: "/calendar",
    color: "#6C47FF",
    subs: [
      { label: "Today", href: "/calendar" },
      { label: "Week view", href: "/calendar" },
      { label: "Schedule meeting", href: "/calendar" },
    ],
  },
  {
    icon: Activity,
    label: "Timeline",
    href: "/timeline",
    color: "#A78BFA",
    subs: [
      { label: "All events", href: "/timeline" },
      { label: "GitHub", href: "/timeline" },
      { label: "Stripe", href: "/timeline" },
      { label: "Sentry", href: "/timeline" },
    ],
  },
  {
    icon: FolderKanban,
    label: "Projects",
    href: "/projects",
    color: "#0891B2",
    subs: [
      { label: "Projects", href: "/projects" },
      { label: "Tasks", href: "/projects/tasks" },
      { label: "Sub Tasks", href: "/projects/subtasks" },
      { label: "Teams", href: "/projects/teams" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    icon: FileText,
    label: "Docs",
    href: "/docs",
    color: "#2ECC71",
    subs: [
      { label: "All Documents", href: "/docs" },
      { label: "Recent", href: "/docs" },
      { label: "Shared with Me", href: "/docs" },
    ],
  },
  {
    icon: Package,
    label: "Ops/ERP",
    href: "/ops",
    color: "#F39C12",
    subs: [
      { label: "Overview", href: "/ops" },
      { label: "Inventory", href: "/ops" },
      { label: "Orders", href: "/ops" },
      { label: "Suppliers", href: "/ops" },
    ],
  },
  {
    icon: DollarSign,
    label: "Finance",
    href: "/finance",
    color: "#1ABC9C",
    subs: [
      { label: "P&L Statement", href: "/finance" },
      { label: "Journal Entries", href: "/finance" },
      { label: "Chart of Accounts", href: "/finance" },
      { label: "Invoices", href: "/finance" },
    ],
  },
  {
    icon: Target,
    label: "CRM",
    href: "/crm",
    color: "#E67E22",
    subs: [
      { label: "Pipeline", href: "/crm" },
      { label: "Contacts", href: "/crm" },
      { label: "Deals", href: "/crm" },
      { label: "Activities", href: "/crm" },
    ],
  },
  {
    icon: Users,
    label: "HR",
    href: "/hr",
    color: "#3498DB",
    subs: [
      { label: "Employees", href: "/hr" },
      { label: "Leave", href: "/hr" },
      { label: "Payroll", href: "/hr" },
      { label: "Org Chart", href: "/hr" },
    ],
  },
  {
    icon: Receipt,
    label: "Expenses",
    href: "/expenses",
    color: "#95A5A6",
    subs: [
      { label: "My Expenses", href: "/expenses" },
      { label: "Approvals", href: "/expenses" },
      { label: "Reports", href: "/expenses" },
    ],
  },
  {
    icon: Megaphone,
    label: "Marketing",
    href: "/marketing",
    color: "#E91E63",
    subs: [
      { label: "Campaigns", href: "/marketing" },
      { label: "Email Marketing", href: "/marketing" },
      { label: "Social Media", href: "/marketing" },
      { label: "Landing Pages", href: "/marketing" },
      { label: "Analytics", href: "/marketing" },
    ],
  },
  {
    icon: BarChart3,
    label: "Reporting",
    href: "/reporting",
    color: "#00ACC1",
    subs: [
      { label: "Dashboard", href: "/reporting" },
      { label: "Sales Reports", href: "/reporting" },
      { label: "Financial Reports", href: "/reporting" },
      { label: "Operations Reports", href: "/reporting" },
      { label: "HR Reports", href: "/reporting" },
      { label: "Custom Reports", href: "/reporting" },
    ],
  },
  {
    icon: GitBranch,
    label: "Code",
    href: "/code",
    color: "#8E44AD",
    subs: [
      { label: "Deployments", href: "/code" },
      { label: "Pull Requests", href: "/code" },
      { label: "Repositories", href: "/code" },
    ],
  },
  {
    icon: Activity,
    label: "Observe",
    href: "/observe",
    color: "var(--vyne-accent, #06B6D4)",
    subs: [
      { label: "Overview", href: "/observe" },
      { label: "Metrics", href: "/observe" },
      { label: "Logs", href: "/observe" },
      { label: "Alerts", href: "/observe" },
      { label: "Traces", href: "/observe" },
    ],
  },
  {
    icon: Brain,
    label: "Vyne AI",
    href: "/ai/chat",
    color: "var(--vyne-accent, #06B6D4)",
    subs: [
      { label: "Chat", href: "/ai/chat" },
      { label: "Insights", href: "/ai" },
      { label: "Agent Runs", href: "/ai" },
    ],
  },
  {
    icon: Zap,
    label: "Automations",
    href: "/automations",
    color: "#F1C40F",
    subs: [
      { label: "All Rules", href: "/automations" },
      { label: "Run History", href: "/automations" },
      { label: "Templates", href: "/automations" },
    ],
  },
  {
    icon: FileSpreadsheet,
    label: "Invoicing",
    href: "/invoicing",
    color: "#2ECC71",
    subs: [
      { label: "Customers", href: "/invoicing" },
      { label: "Invoices", href: "/invoicing" },
      { label: "Credit Notes", href: "/invoicing" },
      { label: "Payments", href: "/invoicing" },
      { label: "Vendors", href: "/invoicing" },
      { label: "Bills", href: "/invoicing" },
      { label: "Refunds", href: "/invoicing" },
    ],
  },
  { icon: Map, label: "Roadmap", href: "/roadmap", color: "#1ABC9C" },
  { icon: Clock, label: "Timesheet", href: "/timesheet", color: "#0E9F6E" },
  { icon: Activity, label: "Activity", href: "/activity", color: "#F59E0B" },
  { icon: DownloadIcon, label: "Download", href: "/download", color: "var(--vyne-accent, #06B6D4)" },
  { icon: LifeBuoy, label: "Help", href: "/help", color: "#2563EB" },
  { icon: ListChecks, label: "Playbooks", href: "/playbooks", color: "var(--vyne-accent, #06B6D4)" },
  { icon: GraduationCap, label: "Training", href: "/training", color: "var(--vyne-accent-light, #22D3EE)" },
  { icon: ShieldAlert, label: "Runbooks", href: "/runbooks", color: "#DC2626" },
  { icon: Settings, label: "Settings", href: "/settings", color: "#7F8C8D" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet that opens when the user taps "More" in the bottom nav.
 *
 * Renders all modules in a 4-column grid. Tiles with sub-pages show a
 * chevron — tapping the tile expands a full-width row beneath it
 * listing every sub-page as a tappable pill (mirrors the sidebar's
 * hierarchy). Only one expansion is open at a time. Tiles without subs
 * navigate directly. Backdrop tap, Esc, or any nav action closes.
 */
export function MobileMoreSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
          zIndex: 80,
          animation: "fadeIn 0.18s ease-out both",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="All modules"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 85,
          maxHeight: "85vh",
          background: "var(--content-bg)",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: "0 -16px 48px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          animation: "slideUpSheet 0.24s var(--ease-out-quart) both",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}
          aria-hidden="true"
        >
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: "var(--content-border)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px 6px",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            All modules
          </h2>
          <button
            type="button"
            className="tap-44"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Module grid (4 cols × N rows, scrolls). Expanded sub-rows
            span the full grid width via grid-column: 1 / -1. */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 14px 16px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {MODULES.map((m) => {
              const Icon = m.icon;
              const hasSubs = !!m.subs && m.subs.length > 0;
              const isExpanded = expanded === m.label;
              return (
                <Fragment key={`${m.href}-${m.label}`}>
                  <button
                    type="button"
                    className="tap-44"
                    onClick={() => {
                      if (hasSubs) {
                        setExpanded(isExpanded ? null : m.label);
                      } else {
                        go(m.href);
                      }
                    }}
                    aria-expanded={hasSubs ? isExpanded : undefined}
                    aria-label={
                      hasSubs ? `${m.label}: show sub-pages` : m.label
                    }
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 6,
                      padding: "12px 6px",
                      borderRadius: 12,
                      background: isExpanded
                        ? `${m.color}1A`
                        : "var(--content-bg-secondary)",
                      border: `1px solid ${
                        isExpanded ? m.color : "var(--content-border)"
                      }`,
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      minHeight: 76,
                      textAlign: "center",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${m.color}1A`,
                        color: m.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        textAlign: "center",
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        maxWidth: "100%",
                      }}
                    >
                      {m.label}
                    </span>
                    {hasSubs && (
                      <ChevronDown
                        size={12}
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          color: "var(--text-tertiary)",
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.18s",
                        }}
                      />
                    )}
                  </button>

                  {hasSubs && isExpanded && m.subs && (
                    <div
                      role="group"
                      aria-label={`${m.label} sub-pages`}
                      style={{
                        gridColumn: "1 / -1",
                        background: "var(--content-bg-secondary)",
                        border: "1px solid var(--content-border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => go(m.href)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          background: m.color,
                          color: "#fff",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Open {m.label}
                      </button>
                      {m.subs.map((sub) => (
                        <button
                          key={`${sub.label}-${sub.href}`}
                          type="button"
                          onClick={() => go(sub.href)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "var(--content-bg)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--content-border)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
