"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  X,
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

interface ModuleItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
}

const MODULES: ModuleItem[] = [
  { icon: Home, label: "Home", href: "/home", color: "#06B6D4" },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard", color: "#06B6D4" },
  { icon: Contact, label: "Contacts", href: "/contacts", color: "#2C3E50" },
  { icon: TrendingUp, label: "Sales", href: "/sales", color: "#27AE60" },
  { icon: MessageSquare, label: "Chat", href: "/chat", color: "#3498DB" },
  { icon: CalendarIcon, label: "Calendar", href: "/calendar", color: "#6C47FF" },
  { icon: Activity, label: "Timeline", href: "/timeline", color: "#A78BFA" },
  { icon: FolderKanban, label: "Projects", href: "/projects", color: "#0891B2" },
  { icon: FileText, label: "Docs", href: "/docs", color: "#2ECC71" },
  { icon: Package, label: "Ops/ERP", href: "/ops", color: "#F39C12" },
  { icon: DollarSign, label: "Finance", href: "/finance", color: "#1ABC9C" },
  { icon: Target, label: "CRM", href: "/crm", color: "#E67E22" },
  { icon: Users, label: "HR", href: "/hr", color: "#3498DB" },
  { icon: Receipt, label: "Expenses", href: "/expenses", color: "#95A5A6" },
  { icon: Megaphone, label: "Marketing", href: "/marketing", color: "#E91E63" },
  { icon: BarChart3, label: "Reporting", href: "/reporting", color: "#00ACC1" },
  { icon: GitBranch, label: "Code", href: "/code", color: "#8E44AD" },
  { icon: Activity, label: "Observe", href: "/observe", color: "#06B6D4" },
  { icon: Brain, label: "Vyne AI", href: "/ai/chat", color: "#06B6D4" },
  { icon: Zap, label: "Automations", href: "/automations", color: "#F1C40F" },
  { icon: FileSpreadsheet, label: "Invoicing", href: "/invoicing", color: "#2ECC71" },
  { icon: Map, label: "Roadmap", href: "/roadmap", color: "#1ABC9C" },
  { icon: Clock, label: "Timesheet", href: "/timesheet", color: "#0E9F6E" },
  { icon: Activity, label: "Activity", href: "/activity", color: "#F59E0B" },
  { icon: DownloadIcon, label: "Download", href: "/download", color: "#06B6D4" },
  { icon: LifeBuoy, label: "Help", href: "/help", color: "#2563EB" },
  { icon: ListChecks, label: "Playbooks", href: "/playbooks", color: "#06B6D4" },
  { icon: GraduationCap, label: "Training", href: "/training", color: "#22D3EE" },
  { icon: ShieldAlert, label: "Runbooks", href: "/runbooks", color: "#DC2626" },
  { icon: Settings, label: "Settings", href: "/settings", color: "#7F8C8D" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet that slides up when the user taps the "More" tab in the
 * mobile bottom nav. Renders all modules in a 4-column grid so the user
 * can reach any page without the sliding sidebar drawer.
 *
 * Auto-closes on Esc, backdrop tap, or route navigation (handled by the
 * parent <MobileBottomNav> via pathname effect).
 */
export function MobileMoreSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
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
          // Sit above the bottom nav (z-70) and backdrop (z-80).
          zIndex: 85,
          maxHeight: "82vh",
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
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
          }}
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

        {/* Module grid (4 columns × N rows, scrolls) */}
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
              return (
                <Link
                  key={`${m.href}-${m.label}`}
                  href={m.href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 6,
                    padding: "12px 6px",
                    borderRadius: 12,
                    background: "var(--content-bg-secondary)",
                    border: "1px solid var(--content-border)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    minHeight: 76,
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
                </Link>
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
