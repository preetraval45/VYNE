"use client";

import { useState, useCallback, useEffect } from "react";
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
  GraduationCap,
  LifeBuoy,
  ShieldAlert,
  ListChecks,
  Star,
  StarOff,
  Clock,
  X as XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { useUIStore } from "@/lib/stores/ui";
import { usePinsStore } from "@/lib/stores/pins";
import {
  useTheme,
  useThemeStore,
  ACCENT_COLORS,
  type AccentColor,
} from "@/lib/stores/theme";

// ── Vyne logo — modern pill mark ──────────────────────────────────
function VyneLogo({ size = 28 }: Readonly<{ size?: number }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Rich multi-stop background */}
      <rect width="32" height="32" rx="9" fill="url(#vyne-grad)" />
      {/* Soft glow bloom behind V for depth */}
      <path
        d="M7.5 9 Q11.5 17.5 16 23 Q20.5 17.5 24.5 9"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Main V — curved elegant strokes */}
      <path
        d="M7.5 9 Q11.5 17.5 16 23 Q20.5 17.5 24.5 9"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Accent dot */}
      <circle cx="16" cy="24.5" r="1.5" fill="white" opacity="0.72" />
      <defs>
        <linearGradient id="vyne-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="0.48" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
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
  /** Module ID from vyne-modules config. Undefined = always shown. */
  moduleId?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { icon: Home, label: "Home", href: "/home", color: "#E74C3C" },
  { icon: BarChart3, label: "My Dashboard", href: "/dashboard", color: "#6C47FF" },
  {
    icon: Contact,
    label: "Accounts/Contacts",
    href: "/contacts",
    color: "#2C3E50",
    moduleId: "crm",
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
    moduleId: "sales",
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
    moduleId: "purchase",
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
    moduleId: "manufacturing",
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
    moduleId: "chat",
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
    moduleId: "projects",
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
    moduleId: "docs",
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
    moduleId: "erp",
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
    moduleId: "finance",
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
    moduleId: "crm",
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
    moduleId: "hr",
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
    moduleId: "marketing",
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
    moduleId: "observe",
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
    moduleId: "ai",
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
    moduleId: "invoicing",
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
    moduleId: "maintenance",
    subs: [
      { label: "Equipment", href: "/maintenance" },
      { label: "Requests", href: "/maintenance" },
      { label: "Preventive", href: "/maintenance" },
      { label: "Work Orders", href: "/maintenance" },
      { label: "Parts & Inventory", href: "/maintenance" },
    ],
  },
  { icon: Map, label: "Roadmap", href: "/roadmap", color: "#1ABC9C" },
  { icon: Clock, label: "Timesheet", href: "/timesheet", color: "#0E9F6E" },
  { icon: Activity, label: "Activity", href: "/activity", color: "#F59E0B" },
  { icon: LifeBuoy, label: "Help centre", href: "/help", color: "#2563EB" },
  { icon: ListChecks, label: "CS playbooks", href: "/playbooks", color: "#6C47FF" },
  { icon: GraduationCap, label: "Training", href: "/training", color: "#8B6BFF" },
  { icon: ShieldAlert, label: "DR runbooks", href: "/runbooks", color: "#DC2626" },
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
        type="button"
        aria-current={active ? "page" : undefined}
        aria-expanded={hasSubs ? (expanded ? "true" : "false") : undefined}
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
          gap: 9,
          padding: "8px 12px 8px 14px",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: active ? 600 : 450,
          color: active ? "var(--vyne-purple)" : "var(--text-primary)",
          background: active
            ? "rgba(108,71,255,0.09)"
            : hovered ? "rgba(108,71,255,0.04)" : "transparent",
          border: "none",
          borderLeft: active
            ? "2.5px solid var(--vyne-purple)"
            : "2.5px solid transparent",
          borderRadius: "0 8px 8px 0",
          marginRight: 6,
          transition: "all 0.12s ease",
          textAlign: "left",
          userSelect: "none",
          position: "relative",
        }}
      >
        {/* Colored icon tile */}
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: active
              ? `rgba(${hexToRgb(item.color)}, 0.18)`
              : `rgba(${hexToRgb(item.color)}, 0.10)`,
            color: item.color,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.12s",
          }}
        >
          <Icon size={13} />
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
        <div style={{ paddingBottom: 2 }}>
          {item.subs!.map((sub) => (
            <button
              key={sub.label}
              type="button"
              onClick={() => onNavigate(sub.href)}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(108,71,255,0.05)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px 6px 52px",
                cursor: "pointer",
                fontSize: 11.5,
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                textAlign: "left",
                transition: "all 0.12s ease",
                borderRadius: "0 8px 8px 0",
                marginRight: 6,
              }}
            >
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "var(--text-tertiary)",
                  flexShrink: 0,
                  opacity: 0.5,
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

// ── Emoji Status Line ─────────────────────────────────────────────
const STATUS_EMOJIS = ["😊", "🚀", "🔥", "💻", "🎯", "🏠", "🎧", "🤔", "☕", "🌴", "🔴", "📵"];
const STATUS_PRESETS = [
  { emoji: "💻", text: "Coding" },
  { emoji: "🎧", text: "In a meeting" },
  { emoji: "☕", text: "On a break" },
  { emoji: "🏠", text: "Working remotely" },
  { emoji: "🌴", text: "On vacation" },
  { emoji: "🔴", text: "Do not disturb" },
];

function EmojiStatusLine() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ emoji: string; text: string } | null>(null);
  const [customText, setCustomText] = useState("");

  function setPreset(preset: { emoji: string; text: string }) {
    setStatus(preset);
    setOpen(false);
    localStorage.setItem("vyne-emoji-status", JSON.stringify(preset));
  }

  function clearStatus() {
    setStatus(null);
    setOpen(false);
    localStorage.removeItem("vyne-emoji-status");
  }

  function setCustom(emoji: string) {
    const newStatus = { emoji, text: customText || "Available" };
    setStatus(newStatus);
    setOpen(false);
    localStorage.setItem("vyne-emoji-status", JSON.stringify(newStatus));
  }

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const saved = localStorage.getItem("vyne-emoji-status");
    if (!saved) return;
    try {
      setStatus(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontSize: 10,
          color: "var(--text-tertiary)",
          display: "flex",
          alignItems: "center",
          gap: 3,
          marginTop: 1,
        }}
      >
        {status ? (
          <>
            <span style={{ fontSize: 11 }}>{status.emoji}</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 80,
              }}
            >
              {status.text}
            </span>
          </>
        ) : (
          <span style={{ fontStyle: "italic" }}>Set status</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            width: 220,
            background: "var(--content-bg, #fff)",
            border: "1px solid var(--content-border, #E8E8F0)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            padding: 10,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 6px 2px",
            }}
          >
            Set status
          </p>

          {/* Presets */}
          {STATUS_PRESETS.map((p) => (
            <button
              key={p.text}
              type="button"
              onClick={() => setPreset(p)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background:
                  status?.text === p.text
                    ? "rgba(108,71,255,0.08)"
                    : "transparent",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-primary)",
                textAlign: "left",
              }}
            >
              <span>{p.emoji}</span>
              <span>{p.text}</span>
            </button>
          ))}

          {/* Custom emoji row */}
          <div
            style={{
              borderTop: "1px solid var(--content-border, #E8E8F0)",
              marginTop: 6,
              paddingTop: 6,
            }}
          >
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
              {STATUS_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setCustom(e)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Custom status..."
              style={{
                width: "100%",
                padding: "5px 8px",
                borderRadius: 6,
                border: "1px solid var(--content-border, #E8E8F0)",
                background: "var(--content-bg, #fff)",
                color: "var(--text-primary)",
                fontSize: 11,
                outline: "none",
              }}
            />
          </div>

          {status && (
            <button
              type="button"
              onClick={clearStatus}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "5px 8px",
                borderRadius: 6,
                border: "none",
                background: "rgba(239,68,68,0.08)",
                color: "#EF4444",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Clear status
            </button>
          )}
        </div>
      )}
    </div>
  );
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

  // Module visibility — hydrated from onboarding / settings localStorage
  const [enabledModules, setEnabledModules] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    try {
      const stored = localStorage.getItem("vyne-modules");
      if (stored) {
        setEnabledModules(new Set(JSON.parse(stored) as string[]));
      }
    } catch { /* ignore */ }
  }, []);

  // Filter items: keep items with no moduleId (always shown) or enabled module
  const visibleNavItems = enabledModules === null
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !item.moduleId || enabledModules.has(item.moduleId));

  // ── Pins & recents ─────────────────────────────────────────────
  const pinned = usePinsStore((s) => s.pinned);
  const recent = usePinsStore((s) => s.recent);
  const unpin = usePinsStore((s) => s.unpin);
  const togglePin = usePinsStore((s) => s.togglePin);
  const isPinned = usePinsStore((s) => s.isPinned);
  const trackVisit = usePinsStore((s) => s.trackVisit);

  // Track page visits into the recent list
  useEffect(() => {
    if (!pathname) return;
    const match = NAV_ITEMS.find((n) => {
      if (n.href === "/home") return pathname === "/home" || pathname === "/";
      return pathname === n.href || pathname.startsWith(n.href + "/");
    });
    if (match && match.href !== "/settings") {
      trackVisit({ href: match.href, label: match.label, module: match.moduleId });
    }
  }, [pathname, trackVisit]);

  const currentNavItem = visibleNavItems.find((n) => isActiveHref(n.href, pathname));
  function isActiveHref(href: string, p: string | null) {
    if (!p) return false;
    if (href === "/home") return p === "/home" || p === "/";
    return p === href || p.startsWith(href + "/");
  }

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
      {/* ── Header: Logo + VYNE + search ───────── */}
      <div
        style={{
          padding: "14px 14px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--content-border)",
          flexShrink: 0,
          background: "linear-gradient(135deg, rgba(108,71,255,0.06) 0%, transparent 100%)",
        }}
      >
        <VyneLogo size={28} />
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              display: "block",
              lineHeight: 1.1,
            }}
          >
            VYNE
          </span>
          <span style={{ fontSize: 9.5, color: "var(--text-tertiary)", fontWeight: 500, letterSpacing: "0.06em" }}>
            COMPANY OS
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCommandPalette}
          aria-label="Open command palette"
          style={{
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: "5px 7px",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--vyne-purple)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--vyne-purple)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--content-border)";
          }}
        >
          <Menu size={15} />
        </button>
      </div>

      {/* ── Scrollable nav items ──────────────────── */}
      <nav
        className="sidebar-scroll"
        aria-label="Navigation menu"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {/* ── Pinned ───────────────────────────────────────── */}
        {pinned.length > 0 && (
          <div style={{ padding: "8px 12px 6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sidebar-text)",
                marginBottom: 6,
                opacity: 0.7,
              }}
            >
              <Star size={11} fill="currentColor" />
              Pinned
            </div>
            {pinned.map((p) => (
              <div
                key={p.href}
                role="none"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 4px",
                  borderRadius: 6,
                  marginBottom: 2,
                  background: isActive(p.href)
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => go(p.href)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 6px",
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    textAlign: "left",
                    color: isActive(p.href)
                      ? "var(--sidebar-active)"
                      : "var(--sidebar-text)",
                    overflow: "hidden",
                  }}
                >
                  <Star size={12} fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Unpin ${p.label}`}
                  onClick={() => unpin(p.href)}
                  style={{
                    width: 22,
                    height: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    color: "var(--sidebar-text)",
                    cursor: "pointer",
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                >
                  <XIcon size={11} />
                </button>
              </div>
            ))}
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.06)",
                margin: "10px 0 2px",
              }}
            />
          </div>
        )}

        {/* ── Main nav with inline pin toggle on active row ─ */}
        {visibleNavItems.map((item) => (
          <NavRow
            key={item.label}
            item={item}
            active={isActive(item.href)}
            expanded={expandedItems.has(item.label)}
            onToggle={() => toggleExpand(item.label)}
            onNavigate={go}
          />
        ))}

        {/* ── Recent ───────────────────────────────────────── */}
        {recent.length > 1 && (
          <div style={{ padding: "12px 12px 6px" }}>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.06)",
                marginBottom: 10,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sidebar-text)",
                marginBottom: 6,
                opacity: 0.7,
              }}
            >
              <Clock size={11} />
              Recent
            </div>
            {recent.slice(1, 6).map((r) => (
              <div
                key={r.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 8px",
                  borderRadius: 6,
                  marginBottom: 2,
                  fontSize: 11,
                  color: "var(--sidebar-text)",
                  opacity: 0.7,
                }}
              >
                <button
                  type="button"
                  onClick={() => go(r.href)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                    fontSize: "inherit",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
                </button>
                <button
                  type="button"
                  aria-label={
                    isPinned(r.href) ? `Unpin ${r.label}` : `Pin ${r.label}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin({ href: r.href, label: r.label, module: r.module });
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 4,
                    background: "transparent",
                    border: "none",
                    color: "var(--sidebar-text)",
                    cursor: "pointer",
                    opacity: 0.7,
                  }}
                >
                  {isPinned(r.href) ? (
                    <Star size={10} fill="currentColor" />
                  ) : (
                    <StarOff size={10} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reference currentNavItem so linter sees it used */}
        <div style={{ display: "none" }} data-current={currentNavItem?.href ?? ""} />
      </nav>

      {/* ── User footer ──────────────────────────── */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexShrink: 0,
          position: "relative",
          background: "linear-gradient(135deg, rgba(108,71,255,0.03) 0%, transparent 100%)",
        }}
      >
        {/* Avatar with ring */}
        <button
          type="button"
          aria-label="User menu"
          aria-expanded={menuOpen ? "true" : "false"}
          aria-haspopup="true"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #7C5CFC, #9B59B6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
            cursor: "pointer",
            border: "2px solid rgba(108,71,255,0.25)",
            padding: 0,
            boxShadow: "0 0 0 3px rgba(108,71,255,0.08)",
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 3px rgba(108,71,255,0.22)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 3px rgba(108,71,255,0.08)")
          }
        >
          {userInitials}
        </button>

        {/* Name + Emoji Status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {userName}
          </div>
          <EmojiStatusLine />
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
                type="button"
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
                type="button"
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
