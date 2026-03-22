"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Hash,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { useUIStore } from "@/lib/stores/ui";
import { useTheme, useThemeStore } from "@/lib/stores/theme";

// ── Vyne logo (exact SVG from prototype) ──────────────────────────
function VyneLogo({ size = 26 }: Readonly<{ size?: number }>) {
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

// ── Presence dot ──────────────────────────────────────────────────
function Presence({ color }: Readonly<{ color: "green" | "amber" | "gray" }>) {
  let bg = "var(--text-secondary)";
  if (color === "green") bg = "var(--status-success)";
  else if (color === "amber") bg = "var(--status-warning)";
  return (
    <span
      aria-hidden="true"
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: bg,
        flexShrink: 0,
        border: "1.5px solid var(--sidebar-bg)",
        display: "inline-block",
      }}
    />
  );
}

// ── Mini avatar ───────────────────────────────────────────────────
function MiniAvatar({
  initials,
  gradient,
}: Readonly<{ initials: string; gradient: string }>) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: gradient,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

// ── Nav sub-item (inside expandable section) ─────────────────────
interface NavSubItemProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href: string;
  readonly badge?: number;
  readonly active: boolean;
  readonly onClick: () => void;
}

function NavSubItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: NavSubItemProps) {
  const [hovered, setHovered] = useState(false);

  let color = "rgba(255,255,255,0.5)";
  if (active) color = "#fff";
  else if (hovered) color = "rgba(255,255,255,0.8)";

  let bg = "transparent";
  if (active) bg = "rgba(108,71,255,0.18)";
  else if (hovered) bg = "rgba(255,255,255,0.06)";

  return (
    <button
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px 5px 20px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 12,
        color,
        background: bg,
        border: "none",
        borderLeft: active ? "2px solid #8B68FF" : "2px solid transparent",
        marginBottom: 1,
        userSelect: "none",
        transition: "all 0.15s ease",
        textAlign: "left",
      }}
    >
      <Icon
        size={15}
        style={{
          flexShrink: 0,
          opacity: active ? 1 : 0.7,
        }}
      />
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {badge !== undefined && (
        <span
          aria-label={`${badge} notification${badge === 1 ? "" : "s"}`}
          style={{
            background: "var(--vyne-purple)",
            color: "#fff",
            borderRadius: 10,
            padding: "1px 6px",
            fontSize: 9,
            fontWeight: 600,
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Direct link nav item (Home, Settings, Admin) ─────────────────
interface NavDirectItemProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

function NavDirectItem({
  icon: Icon,
  label,
  active,
  onClick,
}: NavDirectItemProps) {
  const [hovered, setHovered] = useState(false);

  let color = "rgba(255,255,255,0.5)";
  if (active) color = "#fff";
  else if (hovered) color = "rgba(255,255,255,0.8)";

  let bg = "transparent";
  if (active) bg = "rgba(108,71,255,0.18)";
  else if (hovered) bg = "rgba(255,255,255,0.06)";

  return (
    <button
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 500,
        color,
        background: bg,
        border: "none",
        borderLeft: active ? "2px solid #8B68FF" : "2px solid transparent",
        marginBottom: 1,
        userSelect: "none",
        transition: "all 0.15s ease",
        textAlign: "left",
      }}
    >
      <Icon
        size={16}
        style={{
          flexShrink: 0,
          opacity: active ? 1 : 0.7,
        }}
      />
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
    </button>
  );
}

// ── Expandable section ───────────────────────────────────────────
interface SubItemDef {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface ExpandableSectionProps {
  readonly title: string;
  readonly items: SubItemDef[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly pathname: string;
  readonly onNavigate: (href: string) => void;
}

function ExpandableSection({
  title,
  items,
  expanded,
  onToggle,
  pathname,
  onNavigate,
}: ExpandableSectionProps) {
  const [hovered, setHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [items]);

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Section header */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 8px 4px",
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 600,
          color: hovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "transparent",
          border: "none",
          borderRadius: 4,
          transition: "color 0.15s ease",
          userSelect: "none",
        }}
      >
        {expanded ? (
          <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
        ) : (
          <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
        )}
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
      </button>

      {/* Collapsible sub-items */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: expanded ? contentHeight + 8 : 0,
          transition: "max-height 0.2s ease-in-out",
        }}
      >
        <div ref={contentRef} style={{ padding: "2px 0" }}>
          {items.map((item) => (
            <NavSubItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              badge={item.badge}
              active={pathname.startsWith(item.href)}
              onClick={() => onNavigate(item.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Channel item ──────────────────────────────────────────────────
function ChannelItem({
  name,
  unread,
  isAI,
  onClick,
}: Readonly<{
  name: string;
  unread?: boolean;
  isAI?: boolean;
  onClick?: () => void;
}>) {
  const [hovered, setHovered] = useState(false);

  let color = "rgba(255,255,255,0.45)";
  if (unread) color = "rgba(255,255,255,0.85)";
  else if (hovered) color = "rgba(255,255,255,0.7)";

  return (
    <button
      role="menuitem"
      aria-label={`Channel ${name}${unread ? ", unread messages" : ""}${isAI ? ", AI-powered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "3px 8px 3px 20px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 11,
        color,
        fontWeight: unread ? 500 : 400,
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        marginBottom: 1,
        transition: "all 0.12s",
      }}
    >
      <Hash size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: "left" }}>{name}</span>
      {isAI && (
        <span
          style={{
            fontSize: 9,
            color: "#8B68FF",
            background: "rgba(108,71,255,0.15)",
            padding: "1px 4px",
            borderRadius: 3,
            fontWeight: 500,
          }}
        >
          AI
        </span>
      )}
    </button>
  );
}

// ── DM item ───────────────────────────────────────────────────────
function DMItem({
  name,
  initials,
  gradient,
  presence,
  badge,
  onClick,
}: Readonly<{
  name: string;
  initials: string;
  gradient: string;
  presence: "green" | "amber" | "gray";
  badge?: number;
  onClick?: () => void;
}>) {
  const [hovered, setHovered] = useState(false);
  const presenceLabel = { green: "online", amber: "away", gray: "offline" }[
    presence
  ];
  return (
    <button
      role="menuitem"
      aria-label={[
        "Direct message " + name,
        presenceLabel,
        badge ? badge + " unread" : "",
      ]
        .filter(Boolean)
        .join(", ")}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "3px 8px 3px 20px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 11,
        color: hovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)",
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        marginBottom: 1,
        transition: "all 0.12s",
      }}
    >
      <span style={{ position: "relative", flexShrink: 0 }}>
        <MiniAvatar initials={initials} gradient={gradient} />
        <span style={{ position: "absolute", bottom: -1, right: -1 }}>
          <Presence color={presence} />
        </span>
      </span>
      <span style={{ flex: 1, textAlign: "left" }}>{name}</span>
      {badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} unread message${badge === 1 ? "" : "s"}`}
          style={{
            background: "var(--vyne-purple)",
            color: "#fff",
            borderRadius: 10,
            padding: "1px 6px",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────
function SbDivider() {
  return (
    <hr
      style={{
        height: 1,
        background: "rgba(255,255,255,0.06)",
        margin: "6px 0",
        border: "none",
      }}
    />
  );
}

// ── Section navigation data ───────────────────────────────────────
interface NavSection {
  key: string;
  title: string;
  items: SubItemDef[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: "work",
    title: "Work",
    items: [
      { icon: MessageSquare, label: "Chat", href: "/chat", badge: 3 },
      { icon: FolderKanban, label: "Projects", href: "/projects", badge: 2 },
      { icon: FileText, label: "Docs", href: "/docs" },
      { icon: Map, label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    key: "devops",
    title: "DevOps",
    items: [
      { icon: GitBranch, label: "Code", href: "/code" },
      { icon: Activity, label: "Observe", href: "/observe", badge: 1 },
    ],
  },
  {
    key: "business",
    title: "Business",
    items: [
      { icon: Package, label: "Ops / ERP", href: "/ops" },
      { icon: DollarSign, label: "Finance", href: "/finance" },
      { icon: Target, label: "CRM", href: "/crm" },
      { icon: Users, label: "HR", href: "/hr" },
      { icon: Receipt, label: "Expenses", href: "/expenses" },
    ],
  },
  {
    key: "intelligence",
    title: "Intelligence",
    items: [
      { icon: Brain, label: "AI Assistant", href: "/ai" },
      { icon: Zap, label: "Automations", href: "/automations" },
    ],
  },
];

// ── Helper: determine which sections should be auto-expanded ─────
function getAutoExpandedSections(pathname: string): Set<string> {
  const expanded = new Set<string>();
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname.startsWith(item.href)) {
        expanded.add(section.key);
      }
    }
  }
  return expanded;
}

// ── Main Sidebar ──────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleCommandPalette } = useUIStore();
  const theme = useTheme();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  // Compute initial expanded sections based on current pathname
  const initialExpanded = useMemo(
    () => getAutoExpandedSections(pathname),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // Only compute on mount
  );

  const [expandedSections, setExpandedSections] =
    useState<Set<string>>(initialExpanded);

  // Auto-expand section when navigating to a page within it
  useEffect(() => {
    const autoExpanded = getAutoExpandedSections(pathname);
    if (autoExpanded.size > 0) {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        autoExpanded.forEach((key) => next.add(key));
        return next;
      });
    }
  }, [pathname]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  function go(href: string) {
    router.push(href);
  }

  const userName = user?.name ?? "Preet Raval";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav
      className="sidebar-scroll"
      aria-label="Main navigation"
      style={{
        width: 224,
        minWidth: 224,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* ── Workspace header ───────────────────────── */}
      <div
        style={{
          padding: "10px 10px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          aria-expanded={workspaceMenuOpen}
          aria-haspopup="true"
          aria-label="Workspace menu"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 8,
            cursor: "pointer",
            background: workspaceMenuOpen
              ? "rgba(255,255,255,0.06)"
              : "transparent",
            border: "none",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => {
            if (!workspaceMenuOpen)
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            if (!workspaceMenuOpen)
              (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <VyneLogo size={26} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              Vyne HQ
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.45)",
                marginTop: 1,
              }}
            >
              Business · 14 members
            </div>
          </div>
          <span
            aria-hidden="true"
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 11,
              marginLeft: "auto",
            }}
          >
            <ChevronDown size={14} />
          </span>
        </button>

        {workspaceMenuOpen && (
          <div
            role="menu"
            style={{
              marginTop: 4,
              background: "#252538",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "4px 0",
              overflow: "hidden",
            }}
          >
            <button
              role="menuitem"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--text-tertiary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.06)")
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
              onClick={() => logout()}
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
        )}
      </div>

      {/* ── Search / Cmd+K ─────────────────────────── */}
      <button
        onClick={toggleCommandPalette}
        aria-label="Search Vyne, press Command K"
        style={{
          margin: "6px 10px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(255,255,255,0.14)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(255,255,255,0.08)";
        }}
      >
        <Search
          size={14}
          style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            flex: 1,
            textAlign: "left",
          }}
        >
          Search Vyne...
        </span>
        <kbd
          aria-hidden="true"
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.06)",
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "monospace",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* ── Scrollable nav area ────────────────────── */}
      <div
        className="sidebar-scroll"
        role="menu"
        aria-label="Navigation menu"
        style={{
          padding: "4px 8px",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Home — direct link */}
        <NavDirectItem
          icon={Home}
          label="Home"
          active={pathname === "/home" || pathname === "/"}
          onClick={() => go("/home")}
        />

        <SbDivider />

        {/* Expandable sections */}
        {NAV_SECTIONS.map((section) => (
          <ExpandableSection
            key={section.key}
            title={section.title}
            items={section.items}
            expanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            pathname={pathname}
            onNavigate={go}
          />
        ))}

        <SbDivider />

        {/* Settings — direct link */}
        <NavDirectItem
          icon={Settings}
          label="Settings"
          active={pathname.startsWith("/settings")}
          onClick={() => go("/settings")}
        />

        {/* Admin Panel — direct link */}
        <NavDirectItem
          icon={Shield}
          label="Admin Panel"
          active={pathname.startsWith("/admin")}
          onClick={() => go("/admin")}
        />

        <SbDivider />

        {/* ── Channels section ─────────────────────── */}
        <div style={{ marginBottom: 2 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 8px 4px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                flex: 1,
              }}
            >
              Channels
            </span>
            <button
              aria-label="Add channel"
              onClick={() => go("/chat")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: 2,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.7)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.3)")
              }
            >
              <Plus size={13} />
            </button>
          </div>
          <ChannelItem name="general" onClick={() => go("/chat")} />
          <ChannelItem name="alerts" isAI onClick={() => go("/chat")} />
          <ChannelItem name="deployments" onClick={() => go("/chat")} />
          <ChannelItem name="eng-team" onClick={() => go("/chat")} />
          <ChannelItem name="inventory" onClick={() => go("/chat")} />
        </div>

        {/* ── Direct Messages section ──────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              padding: "6px 8px 4px",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Direct Messages
          </div>
          <DMItem
            name="Sarah K."
            initials="S"
            gradient="linear-gradient(135deg,#9B59B6,#8E44AD)"
            presence="green"
            onClick={() => go("/chat")}
          />
          <DMItem
            name="Tony M."
            initials="T"
            gradient="linear-gradient(135deg,#E67E22,#F39C12)"
            presence="green"
            badge={2}
            onClick={() => go("/chat")}
          />
          <DMItem
            name="Alex R."
            initials="A"
            gradient="linear-gradient(135deg,#27AE60,#1ABC9C)"
            presence="amber"
            onClick={() => go("/chat")}
          />
        </div>
      </div>

      {/* ── User footer ────────────────────────────── */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", cursor: "pointer" }}>
          <div
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6C47FF,#9B59B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 600,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <span style={{ position: "absolute", bottom: -1, right: -1 }}>
            <Presence color="green" />
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>
            {userName}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>
            Active now
          </div>
        </div>
        {(() => {
          const themeTitle = {
            light: "Switch to dark mode",
            dark: "Switch to light mode",
            system: "Switch to light mode",
          }[theme];

          const iconMap = {
            light: (
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
            ),
            dark: (
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
            ),
            system: (
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
            ),
          };

          return (
            <button
              onClick={toggleTheme}
              title={themeTitle}
              aria-label={themeTitle}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.35)",
                padding: 4,
                borderRadius: 6,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#fff")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.35)")
              }
            >
              {iconMap[theme]}
            </button>
          );
        })()}
      </div>
    </nav>
  );
}
