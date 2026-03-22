"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  FolderKanban,
  FileText,
  Map,
  GitBranch,
  Activity,
  Package,
  DollarSign,
  Target,
  Users,
  Receipt,
  Brain,
  Zap,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Menu,
  FileSpreadsheet,
  Wrench,
  Contact,
  TrendingUp,
  ShoppingCart,
  Factory,
  Megaphone,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { useUIStore } from "@/lib/stores/ui";
import {
  useTheme,
  useThemeStore,
  ACCENT_COLORS,
  type AccentColor,
} from "@/lib/stores/theme";

// ── Vyne logo (exact SVG from prototype) ──────────────────────────
function VyneLogo({ size = 20 }: Readonly<{ size?: number }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="18" cy="21" r="12" fill="#6C47FF" opacity="0.12" />
      <line
        x1="6"
        y1="8"
        x2="18"
        y2="28"
        stroke="#8B68FF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="30"
        y1="8"
        x2="18"
        y2="28"
        stroke="#6C47FF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="8"
        x2="30"
        y2="8"
        stroke="#6C47FF"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.25"
      />
      <circle cx="12" cy="18" r="1.8" fill="#6C47FF" opacity="0.45" />
      <circle cx="24" cy="18" r="1.8" fill="#6C47FF" opacity="0.45" />
      <circle cx="6" cy="8" r="3.3" fill="#8B68FF" />
      <circle cx="30" cy="8" r="3.3" fill="#8B68FF" />
      <circle cx="18" cy="28" r="5.2" fill="#6C47FF" />
      <circle cx="6" cy="8" r="1.3" fill="white" opacity="0.7" />
      <circle cx="30" cy="8" r="1.3" fill="white" opacity="0.7" />
      <circle cx="18" cy="28" r="2" fill="white" opacity="0.65" />
    </svg>
  );
}

// ── Navigation item definition ────────────────────────────────────
interface SubItem {
  label: string;
  href: string;
}

interface NavItemDef {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  badge?: number;
  subs?: SubItem[];
}

const NAV_ITEMS: NavItemDef[] = [
  { icon: Home, label: "Home", href: "/home", color: "#E74C3C" },
  {
    icon: Contact,
    label: "Accounts/Contacts",
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
    icon: ShoppingCart,
    label: "Purchase",
    href: "/purchase",
    color: "#8E44AD",
    subs: [
      { label: "Purchase Orders", href: "/purchase" },
      { label: "Vendors", href: "/purchase" },
      { label: "Products", href: "/purchase" },
      { label: "Receipts", href: "/purchase" },
      { label: "Bills", href: "/purchase" },
      { label: "Reports", href: "/purchase" },
    ],
  },
  {
    icon: Factory,
    label: "Manufacturing",
    href: "/manufacturing",
    color: "#D35400",
    subs: [
      { label: "Bill of Materials", href: "/manufacturing" },
      { label: "Manufacturing Orders", href: "/manufacturing" },
      { label: "Work Centers", href: "/manufacturing" },
      { label: "Operations", href: "/manufacturing" },
      { label: "Quality Control", href: "/manufacturing" },
      { label: "Reports", href: "/manufacturing" },
    ],
  },
  {
    icon: MessageSquare,
    label: "Chat",
    href: "/chat",
    color: "#3498DB",
    badge: 3,
    subs: [
      { label: "Channels", href: "/chat" },
      { label: "Direct Messages", href: "/chat" },
      { label: "Threads", href: "/chat" },
    ],
  },
  {
    icon: FolderKanban,
    label: "Projects",
    href: "/projects",
    color: "#9B59B6",
    badge: 2,
    subs: [
      { label: "All Projects", href: "/projects" },
      { label: "Issues", href: "/projects" },
      { label: "Sprints", href: "/projects" },
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
    label: "Ops / ERP",
    href: "/ops",
    color: "#F39C12",
    subs: [
      { label: "Overview", href: "/ops" },
      { label: "Inventory", href: "/ops" },
      { label: "Orders", href: "/ops" },
      { label: "Suppliers", href: "/ops" },
      { label: "Manufacturing", href: "/ops" },
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
    label: "Code / DevOps",
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
    color: "#E74C3C",
    badge: 1,
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
    label: "AI Assistant",
    href: "/ai",
    color: "#6C47FF",
    subs: [
      { label: "Insights", href: "/ai" },
      { label: "Ask AI", href: "/ai" },
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
  {
    icon: Wrench,
    label: "Maintenance",
    href: "/maintenance",
    color: "#E67E22",
    subs: [
      { label: "Equipment", href: "/maintenance" },
      { label: "Requests", href: "/maintenance" },
      { label: "Preventive", href: "/maintenance" },
      { label: "Work Orders", href: "/maintenance" },
      { label: "Parts & Inventory", href: "/maintenance" },
    ],
  },
  { icon: Map, label: "Roadmap", href: "/roadmap", color: "#1ABC9C" },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
    color: "#7F8C8D",
    subs: [
      { label: "General", href: "/settings" },
      { label: "Members", href: "/settings" },
      { label: "Notifications", href: "/settings" },
      { label: "ERP Config", href: "/settings" },
      { label: "Billing", href: "/settings" },
    ],
  },
  { icon: Shield, label: "Admin", href: "/admin", color: "#2C3E50" },
];

// ── Helper: compute nav row background ────────────────────────────
function getNavRowBg(active: boolean, hovered: boolean): string {
  if (active) return "rgba(108,71,255,0.08)";
  if (hovered) return "rgba(108,71,255,0.04)";
  return "transparent";
}

// ── Single nav row with expandable sub-items ─────────────────────
interface NavRowProps {
  readonly item: NavItemDef;
  readonly active: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onNavigate: (href: string) => void;
}

function NavRow({ item, active, expanded, onToggle, onNavigate }: NavRowProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const hasSubs = item.subs && item.subs.length > 0;

  return (
    <div>
      <button
        role="menuitem"
        aria-current={active ? "page" : undefined}
        aria-expanded={hasSubs ? expanded : undefined}
        onClick={() => {
          if (hasSubs) {
            onToggle();
          } else {
            onNavigate(item.href);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: active ? 600 : 450,
          color: "var(--text-primary)",
          background: getNavRowBg(active, hovered),
          border: "none",
          borderLeft: active
            ? "3px solid var(--vyne-purple)"
            : "3px solid transparent",
          transition: "all 0.15s ease",
          textAlign: "left",
          userSelect: "none",
          position: "relative",
        }}
      >
        {/* Colored icon circle */}
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: `rgba(${hexToRgb(item.color)}, 0.12)`,
            color: item.color,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} />
        </span>

        {/* Label */}
        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>

        {/* Badge */}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            aria-label={`${item.badge} notification${item.badge === 1 ? "" : "s"}`}
            style={{
              background: "var(--vyne-purple)",
              color: "#fff",
              borderRadius: 10,
              padding: "1px 6px",
              fontSize: 10,
              fontWeight: 600,
              minWidth: 18,
              textAlign: "center",
              lineHeight: "16px",
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Chevron arrow — rotates when expanded */}
        <ChevronRight
          size={14}
          style={{
            color: "var(--text-tertiary)",
            flexShrink: 0,
            opacity: hovered || active ? 0.8 : 0.4,
            transition: "all 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "none",
          }}
        />
      </button>

      {/* Sub-items dropdown */}
      {hasSubs && expanded && (
        <div
          style={{
            overflow: "hidden",
            borderLeft: "3px solid transparent",
          }}
        >
          {item.subs!.map((sub) => (
            <button
              key={sub.label}
              onClick={() => onNavigate(sub.href)}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(108,71,255,0.04)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 16px 7px 50px",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                textAlign: "left",
                transition: "all 0.12s ease",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--text-tertiary)",
                  flexShrink: 0,
                }}
              />
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color Picker Component ─────────────────────────────────────────
function AccentPicker({ onClose }: Readonly<{ onClose: () => void }>) {
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        marginBottom: 8,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "var(--shadow-lg)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 8,
        }}
      >
        Accent Color
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
          const c = ACCENT_COLORS[key];
          const isActive = accent === key;
          return (
            <button
              key={key}
              title={c.label}
              onClick={() => {
                setAccent(key);
                onClose();
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c.primary,
                border: isActive
                  ? "3px solid var(--text-primary)"
                  : "3px solid transparent",
                cursor: "pointer",
                outline: isActive ? `2px solid ${c.primary}` : "none",
                outlineOffset: 2,
                transition: "all 0.15s",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Helper: convert hex to rgb string ─────────────────────────────
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0,0,0";
  return `${Number.parseInt(result[1], 16)},${Number.parseInt(result[2], 16)},${Number.parseInt(result[3], 16)}`;
}

// ── Main Sidebar ──────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleCommandPalette } = useUIStore();
  const theme = useTheme();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);

  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const go = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const userName = user?.name ?? "Preet Raval";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="sidebar-nav"
      aria-label="Main navigation"
      style={{
        width: 240,
        minWidth: 240,
        background: "var(--content-bg)",
        borderRight: "1px solid var(--content-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* ── Top gradient bar ──────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          height: 3,
          background: "linear-gradient(90deg, #6C47FF, #8B68FF, #B794FF)",
          flexShrink: 0,
        }}
      />

      {/* ── Header: Logo + VYNE + hamburger ───────── */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--content-border)",
          flexShrink: 0,
        }}
      >
        <VyneLogo size={20} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.04em",
            flex: 1,
          }}
        >
          VYNE
        </span>
        <button
          onClick={toggleCommandPalette}
          aria-label="Open menu"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-tertiary)")
          }
        >
          <Menu size={18} />
        </button>
      </div>

      {/* ── Scrollable nav items ──────────────────── */}
      <div
        className="sidebar-scroll"
        role="menu"
        aria-label="Navigation menu"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavRow
            key={item.label}
            item={item}
            active={isActive(item.href)}
            expanded={expandedItems.has(item.label)}
            onToggle={() => toggleExpand(item.label)}
            onNavigate={go}
          />
        ))}
      </div>

      {/* ── User footer ──────────────────────────── */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Avatar */}
        <button
          aria-label="User menu"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6C47FF, #9B59B6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            flexShrink: 0,
            cursor: "pointer",
            border: "none",
            padding: 0,
          }}
        >
          {userInitials}
        </button>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userName}
          </div>
        </div>

        {/* Settings gear */}
        <button
          onClick={() => go("/settings")}
          aria-label="Open settings"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-tertiary)")
          }
        >
          <Settings size={16} />
        </button>

        {/* Theme toggle */}
        {(() => {
          const themeLabels: Record<string, string> = {
            light: "Switch to dark mode",
            dark: "Switch to light mode",
            system: "Switch to light mode",
          };
          const themeTitles: Record<string, string> = {
            light: "Dark mode",
            dark: "Light mode",
            system: "System",
          };
          const moonIcon = (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          );
          const sunIcon = (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          );
          const monitorIcon = (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          );
          const themeIcons: Record<string, React.ReactNode> = {
            light: moonIcon,
            dark: sunIcon,
            system: monitorIcon,
          };
          return (
            <button
              onClick={toggleTheme}
              aria-label={themeLabels[theme] ?? "Toggle theme"}
              title={themeTitles[theme] ?? "Theme"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  "var(--vyne-purple)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)")
              }
            >
              {themeIcons[theme] ?? moonIcon}
            </button>
          );
        })()}

        {/* Color picker button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            aria-label="Change accent color"
            title="Accent color"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "var(--vyne-purple)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)")
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="var(--vyne-purple)"
                stroke="none"
              />
            </svg>
          </button>
          {showColorPicker && (
            <AccentPicker onClose={() => setShowColorPicker(false)} />
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={() => logout()}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--status-danger)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-tertiary)")
          }
        >
          <LogOut size={16} />
        </button>

        {/* User dropdown menu */}
        {menuOpen && (
          <>
            {/* Backdrop to close menu */}
            <button
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99,
                background: "transparent",
                border: "none",
                cursor: "default",
              }}
            />
            <div
              role="menu"
              style={{
                position: "absolute",
                bottom: "100%",
                left: 12,
                right: 12,
                marginBottom: 4,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
                padding: "4px 0",
                boxShadow: "var(--shadow-lg)",
                zIndex: 100,
              }}
            >
              <button
                role="menuitem"
                onClick={() => {
                  go("/settings");
                  setMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(108,71,255,0.06)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                <Settings size={13} /> Workspace settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  color: "var(--status-danger)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(239,68,68,0.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
