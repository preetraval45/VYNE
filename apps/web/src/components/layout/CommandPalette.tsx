"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutGrid,
  FileText,
  MessageSquare,
  Code2,
  Activity,
  Package,
  ArrowRight,
  Hash,
  DollarSign,
  Users,
  Receipt,
  Target,
  Map,
  Shield,
  Sparkles,
  Zap,
  Settings,
  LogOut,
  Sun,
  Moon,
  Plus,
  Clock,
  ShoppingCart,
  User,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/lib/stores/ui";
import { useTheme, useThemeStore } from "@/lib/stores/theme";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// ── Fixture imports for demo search ────────────────────────────────
import { MOCK_PRODUCTS, MOCK_ORDERS } from "@/lib/fixtures/ops";
import { EMPLOYEES } from "@/lib/fixtures/hr";

// ── Constants ──────────────────────────────────────────────────────
const RECENT_SEARCHES_KEY = "vyne-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// ── Types ──────────────────────────────────────────────────────────
type ResultCategory =
  | "Navigate"
  | "Projects"
  | "Issues"
  | "Contacts"
  | "Documents"
  | "Channels"
  | "Messages"
  | "Products"
  | "Orders"
  | "Team"
  | "Quick Actions"
  | "Create"
  | "Actions"
  | "Recent Searches";

interface CommandItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon: React.ReactNode;
  readonly action: () => void;
  readonly category: ResultCategory;
  readonly keywords?: string;
  readonly badge?: string;
}

// ── Mock searchable data for demo mode ─────────────────────────────
const MOCK_ISSUES = [
  {
    id: "i1",
    key: "ENG-43",
    title: "Fix Secrets Manager IAM permissions",
    status: "in_progress",
    priority: "urgent",
  },
  {
    id: "i2",
    key: "ENG-45",
    title: "LangGraph agent orchestration review",
    status: "todo",
    priority: "high",
  },
  {
    id: "i3",
    key: "ENG-41",
    title: "TimescaleDB metrics schema migration",
    status: "in_review",
    priority: "medium",
  },
  {
    id: "i4",
    key: "ENG-38",
    title: "API gateway rate limiting implementation",
    status: "done",
    priority: "high",
  },
  {
    id: "i5",
    key: "ENG-50",
    title: "WebSocket reconnection handling",
    status: "backlog",
    priority: "medium",
  },
  {
    id: "i6",
    key: "ENG-52",
    title: "Add dark mode support to billing page",
    status: "todo",
    priority: "low",
  },
  {
    id: "i7",
    key: "DES-12",
    title: "Redesign onboarding flow",
    status: "in_progress",
    priority: "high",
  },
  {
    id: "i8",
    key: "DES-14",
    title: "Update component library icons",
    status: "backlog",
    priority: "medium",
  },
] as const;

const MOCK_DOCUMENTS = [
  { id: "d1", title: "Product Roadmap Q2 2026", icon: "🗺️" },
  { id: "d2", title: "Engineering Onboarding Guide", icon: "📖" },
  { id: "d3", title: "API Design Principles", icon: "⚙️" },
  { id: "d4", title: "Sprint 12 Retrospective", icon: "📝" },
  { id: "d5", title: "Architecture Decision Records", icon: "🏗️" },
  { id: "d6", title: "Security Incident Playbook", icon: "🛡️" },
] as const;

const MOCK_CHANNELS = [
  { id: "ch1", name: "general", memberCount: 8 },
  { id: "ch2", name: "engineering", memberCount: 5 },
  { id: "ch3", name: "product-updates", memberCount: 8 },
  { id: "ch4", name: "random", memberCount: 8 },
  { id: "ch5", name: "sales-pipeline", memberCount: 3 },
  { id: "ch6", name: "incidents", memberCount: 4 },
] as const;

const MOCK_PROJECTS = [
  { id: "p-vyne", name: "VYNE Platform", identifier: "VYNE" },
  { id: "p-mobile", name: "Mobile App", identifier: "MOB" },
  { id: "p-ai", name: "AI Engine", identifier: "AI" },
  { id: "p-infra", name: "Infrastructure", identifier: "INFRA" },
  { id: "p-design", name: "Design System", identifier: "DS" },
] as const;

const MOCK_CONTACTS = [
  { id: "c-acme", name: "Acme Corp", email: "hello@acme.com" },
  { id: "c-globex", name: "Globex", email: "ops@globex.co" },
  { id: "c-initech", name: "Initech", email: "bill@initech.io" },
  { id: "c-contoso", name: "Contoso", email: "sales@contoso.dev" },
  { id: "c-northwind", name: "Northwind", email: "team@northwind.io" },
] as const;

const MOCK_MESSAGES = [
  {
    id: "m1",
    content: "The API gateway deployment is blocked on DevOps approvals",
    channel: "engineering",
    author: "Preet",
  },
  {
    id: "m2",
    content: "Acme Corp pilot onboarding starts next week",
    channel: "sales-pipeline",
    author: "Alex",
  },
  {
    id: "m3",
    content: "New design system tokens are ready for review",
    channel: "product-updates",
    author: "Sarah",
  },
  {
    id: "m4",
    content: "Deployed auth-service v1.8.2 successfully",
    channel: "engineering",
    author: "Tony",
  },
  {
    id: "m5",
    content: "Monthly revenue report is attached",
    channel: "general",
    author: "Emma",
  },
] as const;

// ── localStorage helpers ───────────────────────────────────────────
function loadRecentSearches(): string[] {
  if (globalThis.window === undefined) return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveRecentSearches(searches: string[]): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    /* ignore */
  }
}

// ── Per-module search helpers ───────────────────────────────────────
// Each function searches one data source and returns matching CommandItems.
// Extracted to keep cognitive complexity low in the main search memo.

function searchIssues(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_ISSUES.filter(
    (issue) =>
      issue.title.toLowerCase().includes(q) ||
      issue.key.toLowerCase().includes(q),
  ).map((issue) => ({
    id: `search-issue-${issue.id}`,
    label: `${issue.key}: ${issue.title}`,
    description: "Projects",
    icon: <Hash size={16} />,
    action: () => navigate("/projects"),
    category: "Issues" as ResultCategory,
    badge: issue.priority,
  }));
}

function searchDocuments(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_DOCUMENTS.filter((doc) =>
    doc.title.toLowerCase().includes(q),
  ).map((doc) => ({
    id: `search-doc-${doc.id}`,
    label: `${doc.icon} ${doc.title}`,
    description: "Docs",
    icon: <FileText size={16} />,
    action: () => navigate("/docs"),
    category: "Documents" as ResultCategory,
  }));
}

function searchProjectList(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_PROJECTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.identifier.toLowerCase().includes(q),
  ).map((p) => ({
    id: `search-proj-${p.id}`,
    label: p.name,
    description: `Project · ${p.identifier}`,
    icon: <Hash size={16} />,
    action: () => navigate(`/projects/${p.id}`),
    category: "Projects" as ResultCategory,
  }));
}

function searchContactList(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
  ).map((c) => ({
    id: `search-contact-${c.id}`,
    label: c.name,
    description: c.email,
    icon: <FileText size={16} />,
    action: () => navigate("/contacts"),
    category: "Contacts" as ResultCategory,
  }));
}

function searchChannels(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_CHANNELS.filter((ch) => ch.name.toLowerCase().includes(q)).map(
    (ch) => ({
      id: `search-ch-${ch.id}`,
      label: `#${ch.name}`,
      description: "Chat",
      icon: <MessageSquare size={16} />,
      action: () => navigate("/chat"),
      category: "Channels" as ResultCategory,
      badge: `${ch.memberCount} members`,
    }),
  );
}

function searchMessages(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_MESSAGES.filter((msg) =>
    msg.content.toLowerCase().includes(q),
  ).map((msg) => {
    const preview =
      msg.content.length > 60 ? msg.content.slice(0, 60) + "..." : msg.content;
    return {
      id: `search-msg-${msg.id}`,
      label: preview,
      description: `#${msg.channel} by ${msg.author}`,
      icon: <MessageSquare size={16} />,
      action: () => navigate("/chat"),
      category: "Messages" as ResultCategory,
    };
  });
}

function searchProducts(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  ).map((product) => ({
    id: `search-product-${product.id}`,
    label: product.name,
    description: `SKU: ${product.sku}`,
    icon: <Package size={16} />,
    action: () => navigate("/ops"),
    category: "Products" as ResultCategory,
    badge:
      product.status === "out_of_stock"
        ? "Out of stock"
        : `${product.stockQty} in stock`,
  }));
}

function searchOrders(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return MOCK_ORDERS.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q),
  ).map((order) => ({
    id: `search-order-${order.id}`,
    label: `${order.orderNumber} - ${order.customerName}`,
    description: "Ops",
    icon: <ShoppingCart size={16} />,
    action: () => navigate("/ops"),
    category: "Orders" as ResultCategory,
    badge: order.status,
  }));
}

function searchTeam(
  q: string,
  navigate: (path: string) => void,
): CommandItem[] {
  return EMPLOYEES.filter(
    (emp) =>
      emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q),
  ).map((emp) => ({
    id: `search-team-${emp.id}`,
    label: emp.name,
    description: `${emp.title} · ${emp.email}`,
    icon: <User size={16} />,
    action: () => navigate("/hr"),
    category: "Team" as ResultCategory,
    badge: emp.department,
  }));
}

// ── Category icon map ──────────────────────────────────────────────
const CATEGORY_ICONS: Record<ResultCategory, React.ReactNode> = {
  Navigate: <LayoutGrid size={12} />,
  Projects: <LayoutGrid size={12} />,
  Issues: <Hash size={12} />,
  Contacts: <Users size={12} />,
  Documents: <FileText size={12} />,
  Channels: <MessageSquare size={12} />,
  Messages: <MessageSquare size={12} />,
  Products: <Package size={12} />,
  Orders: <ShoppingCart size={12} />,
  Team: <Users size={12} />,
  "Quick Actions": <Zap size={12} />,
  Create: <Plus size={12} />,
  Actions: <Settings size={12} />,
  "Recent Searches": <Clock size={12} />,
};

// ── Sub-components ─────────────────────────────────────────────────

type SectionHeaderProps = Readonly<{
  category: ResultCategory;
}>;

function SectionHeader({ category }: SectionHeaderProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
      style={{ color: "#4A4A6A" }}
    >
      <span className="flex-shrink-0 opacity-60">
        {CATEGORY_ICONS[category]}
      </span>
      {category}
    </div>
  );
}

type ResultItemProps = Readonly<{
  item: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}>;

function ResultItem({ item, isSelected, onSelect, onHover }: ResultItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <button
      ref={itemRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
      )}
      style={{
        background: isSelected ? "rgba(6, 182, 212,0.15)" : "transparent",
        color: isSelected ? "#FFFFFF" : "var(--text-tertiary)",
      }}
    >
      <span
        className="flex-shrink-0"
        style={{ color: isSelected ? "#22D3EE" : "var(--text-secondary)" }}
      >
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.label}</div>
        {item.description && (
          <div
            className="text-xs truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.description}
          </div>
        )}
      </div>
      {item.badge && (
        <span
          className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded"
          style={{ background: "rgba(6, 182, 212,0.15)", color: "#22D3EE" }}
        >
          {item.badge}
        </span>
      )}
      {isSelected && (
        <ArrowRight
          size={14}
          style={{ color: "var(--vyne-purple)", flexShrink: 0 }}
        />
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const theme = useTheme();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { logout } = useAuthStore();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Cross-module AI search (triggered by leading "?") ───────────
  interface AiHit {
    id: string;
    module: string;
    title: string;
    snippet: string;
    href?: string;
    score: number;
    reason: string;
  }
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiHits, setAiHits] = useState<AiHit[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const isAiMode = debouncedQuery.startsWith("?");

  useEffect(() => {
    if (!isAiMode) {
      setAiAnswer(null);
      setAiHits([]);
      return;
    }
    const q = debouncedQuery.replace(/^\?+/, "").trim();
    if (q.length < 3) return;
    let cancelled = false;
    setAiLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = (await res.json()) as {
          answer?: string;
          hits?: AiHit[];
          provider?: string;
        };
        if (cancelled) return;
        setAiAnswer(data.answer ?? null);
        setAiHits(data.hits ?? []);
        setAiProvider(data.provider ?? null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isAiMode]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // ── Close helper ────────────────────────────────────────────────
  const close = useCallback(() => {
    setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  // ── Save a search to recents ────────────────────────────────────
  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.startsWith(">")) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  // ── Navigation commands ─────────────────────────────────────────
  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-home",
        label: "Go to Home",
        description: "Main dashboard",
        icon: <LayoutGrid size={16} />,
        action: () => router.push("/home"),
        category: "Navigate",
      },
      {
        id: "nav-chat",
        label: "Go to Chat",
        description: "Messages and channels",
        icon: <MessageSquare size={16} />,
        action: () => router.push("/chat"),
        category: "Navigate",
      },
      {
        id: "nav-projects",
        label: "Go to Projects",
        description: "Project management",
        icon: <Hash size={16} />,
        action: () => router.push("/projects"),
        category: "Navigate",
      },
      {
        id: "nav-crm",
        label: "Go to CRM",
        description: "Pipeline and deals",
        icon: <Target size={16} />,
        action: () => router.push("/crm"),
        category: "Navigate",
      },
      {
        id: "nav-finance",
        label: "Go to Finance",
        description: "P&L, invoices, journal",
        icon: <DollarSign size={16} />,
        action: () => router.push("/finance"),
        category: "Navigate",
      },
      {
        id: "nav-ops",
        label: "Go to Ops",
        description: "Inventory and ERP",
        icon: <Package size={16} />,
        action: () => router.push("/ops"),
        category: "Navigate",
      },
      {
        id: "nav-hr",
        label: "Go to HR",
        description: "Employees, leave, payroll",
        icon: <Users size={16} />,
        action: () => router.push("/hr"),
        category: "Navigate",
      },
      {
        id: "nav-expenses",
        label: "Go to Expenses",
        description: "Expense reports",
        icon: <Receipt size={16} />,
        action: () => router.push("/expenses"),
        category: "Navigate",
      },
      {
        id: "nav-docs",
        label: "Go to Docs",
        description: "Documentation editor",
        icon: <FileText size={16} />,
        action: () => router.push("/docs"),
        category: "Navigate",
      },
      {
        id: "nav-code",
        label: "Go to Code",
        description: "Deployments and PRs",
        icon: <Code2 size={16} />,
        action: () => router.push("/code"),
        category: "Navigate",
      },
      {
        id: "nav-observe",
        label: "Go to Observe",
        description: "Metrics and monitoring",
        icon: <Activity size={16} />,
        action: () => router.push("/observe"),
        category: "Navigate",
      },
      {
        id: "nav-ai",
        label: "Go to AI Assistant",
        description: "Business intelligence",
        icon: <Sparkles size={16} />,
        action: () => router.push("/ai"),
        category: "Navigate",
      },
      {
        id: "nav-automations",
        label: "Go to Automations",
        description: "Workflow builder",
        icon: <Zap size={16} />,
        action: () => router.push("/automations"),
        category: "Navigate",
      },
      {
        id: "nav-roadmap",
        label: "Go to Roadmap",
        description: "Feature gap analysis",
        icon: <Map size={16} />,
        action: () => router.push("/roadmap"),
        category: "Navigate",
      },
      {
        id: "nav-marketing",
        label: "Go to Marketing",
        description: "Campaigns, email, social & analytics",
        icon: <Target size={16} />,
        action: () => router.push("/marketing"),
        category: "Navigate",
        keywords: "campaigns email social media landing pages",
      },
      {
        id: "nav-reporting",
        label: "Go to Reporting",
        description: "Cross-module analytics & custom reports",
        icon: <Activity size={16} />,
        action: () => router.push("/reporting"),
        category: "Navigate",
        keywords: "reports dashboard sales financial operations hr custom",
      },
      {
        id: "nav-admin",
        label: "Go to Admin",
        description: "Tenant and billing management",
        icon: <Shield size={16} />,
        action: () => router.push("/admin"),
        category: "Navigate",
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        description: "Organization settings",
        icon: <Settings size={16} />,
        action: () => router.push("/settings"),
        category: "Navigate",
      },
    ],
    [router],
  );

  // ── Create commands ─────────────────────────────────────────────
  const createCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "create-project",
        label: "New Project",
        description: "Create a project workspace",
        icon: <LayoutGrid size={16} />,
        action: () => router.push("/projects/new"),
        category: "Create",
        keywords: "add project workspace",
      },
      {
        id: "create-deal",
        label: "New CRM Deal",
        description: "Add a deal to the pipeline",
        icon: <Target size={16} />,
        action: () => router.push("/crm/deals/new"),
        category: "Create",
        keywords: "lead sale opportunity",
      },
      {
        id: "create-invoice",
        label: "New Invoice",
        description: "Send an invoice to a customer",
        icon: <Receipt size={16} />,
        action: () => router.push("/invoicing/invoices/new"),
        category: "Create",
        keywords: "bill payment charge",
      },
      {
        id: "create-bill",
        label: "New Bill",
        description: "Record a vendor bill",
        icon: <Receipt size={16} />,
        action: () => router.push("/invoicing/bills/new"),
        category: "Create",
        keywords: "vendor payable ap",
      },
      {
        id: "create-customer",
        label: "New Invoicing Customer",
        description: "Add a billable customer",
        icon: <User size={16} />,
        action: () => router.push("/invoicing/customers/new"),
        category: "Create",
        keywords: "client billing",
      },
      {
        id: "create-vendor",
        label: "New Vendor",
        description: "Add a vendor / supplier for AP",
        icon: <User size={16} />,
        action: () => router.push("/invoicing/vendors/new"),
        category: "Create",
        keywords: "supplier payee",
      },
      {
        id: "create-expense",
        label: "New Expense",
        description: "Submit an expense for approval",
        icon: <Receipt size={16} />,
        action: () => router.push("/expenses/new"),
        category: "Create",
        keywords: "report cost reimburse",
      },
      {
        id: "create-journal",
        label: "New Journal Entry",
        description: "Manual debit/credit entry",
        icon: <FileText size={16} />,
        action: () => router.push("/finance/journal/new"),
        category: "Create",
        keywords: "general ledger debit credit je",
      },
      {
        id: "create-account",
        label: "New Account",
        description: "Add a CRM account / company",
        icon: <User size={16} />,
        action: () => router.push("/contacts/accounts/new"),
        category: "Create",
        keywords: "company org",
      },
      {
        id: "create-contact",
        label: "New Contact",
        description: "Add a person to CRM",
        icon: <User size={16} />,
        action: () => router.push("/contacts/people/new"),
        category: "Create",
        keywords: "person people",
      },
      {
        id: "create-opportunity",
        label: "New Opportunity",
        description: "Open a sales opportunity",
        icon: <Target size={16} />,
        action: () => router.push("/sales/opportunities/new"),
        category: "Create",
        keywords: "deal sales pipeline",
      },
      {
        id: "create-quote",
        label: "New Quote",
        description: "Draft a customer quote",
        icon: <FileText size={16} />,
        action: () => router.push("/sales/quotes/new"),
        category: "Create",
        keywords: "quotation proposal price",
      },
      {
        id: "create-sales-order",
        label: "New Sales Order",
        description: "Record a confirmed sales order",
        icon: <ShoppingCart size={16} />,
        action: () => router.push("/sales/orders/new"),
        category: "Create",
        keywords: "so order sell",
      },
      {
        id: "create-product-sales",
        label: "New Product (Sales)",
        description: "Add a product to the sales catalog",
        icon: <Package size={16} />,
        action: () => router.push("/sales/products/new"),
        category: "Create",
        keywords: "catalog sku sell",
      },
      {
        id: "create-channel",
        label: "New Channel",
        description: "Create a chat channel",
        icon: <MessageSquare size={16} />,
        action: () => router.push("/chat/new"),
        category: "Create",
        keywords: "slack room topic",
      },
      {
        id: "create-ops-product",
        label: "New Product (Ops)",
        description: "Add a product to inventory",
        icon: <Package size={16} />,
        action: () => router.push("/ops/products/new"),
        category: "Create",
        keywords: "inventory stock sku",
      },
      {
        id: "create-order",
        label: "New Order",
        description: "Create an ops order",
        icon: <ShoppingCart size={16} />,
        action: () => router.push("/ops/orders/new"),
        category: "Create",
        keywords: "fulfillment ship customer",
      },
      {
        id: "create-supplier",
        label: "New Supplier",
        description: "Register a supplier",
        icon: <User size={16} />,
        action: () => router.push("/ops/suppliers/new"),
        category: "Create",
        keywords: "vendor procurement",
      },
      {
        id: "create-bom",
        label: "New BOM",
        description: "Define a bill of materials",
        icon: <FileText size={16} />,
        action: () => router.push("/ops/boms/new"),
        category: "Create",
        keywords: "manufacturing components",
      },
      {
        id: "create-work-order",
        label: "New Work Order",
        description: "Schedule a production run",
        icon: <Package size={16} />,
        action: () => router.push("/ops/work-orders/new"),
        category: "Create",
        keywords: "manufacturing wo production",
      },
      {
        id: "create-feature-request",
        label: "Request a Feature",
        description: "Tell us what would make VYNE better",
        icon: <Sparkles size={16} />,
        action: () => router.push("/roadmap/request"),
        category: "Create",
        keywords: "feedback idea suggestion",
      },
      {
        id: "create-automation",
        label: "New Automation",
        description: "Build a workflow rule",
        icon: <Zap size={16} />,
        action: () => router.push("/automations"),
        category: "Create",
        keywords: "workflow rule trigger",
      },
    ],
    [router],
  );

  // ── Action commands ─────────────────────────────────────────────
  const actionCommands: CommandItem[] = useMemo(() => {
    const themeLabel = {
      light: "Switch to Dark Mode",
      dark: "Switch to System Mode",
      system: "Switch to Light Mode",
    }[theme];
    const themeIcon = {
      light: <Moon size={16} />,
      dark: <Sun size={16} />,
      system: <Sun size={16} />,
    }[theme];
    return [
      {
        id: "toggle-theme",
        label: themeLabel,
        description: "Toggle color scheme",
        icon: themeIcon,
        action: toggleTheme,
        category: "Actions",
      },
      {
        id: "logout",
        label: "Sign Out",
        description: "Log out of VYNE",
        icon: <LogOut size={16} />,
        action: () => {
          logout();
          router.push("/login");
        },
        category: "Actions",
      },
    ];
  }, [theme, toggleTheme, logout, router]);

  // ── Quick actions (triggered by ">" prefix) ─────────────────────
  const quickActions: CommandItem[] = useMemo(
    () => [
      {
        id: "qa-issue",
        label: "Create new issue",
        description: "Open the create issue flow",
        icon: <Plus size={16} />,
        action: () => router.push("/projects"),
        category: "Quick Actions",
      },
      {
        id: "qa-project",
        label: "Create new project",
        description: "Open the create project modal",
        icon: <Plus size={16} />,
        action: () => router.push("/projects"),
        category: "Quick Actions",
      },
      {
        id: "qa-channel",
        label: "Create new channel",
        description: "Navigate to chat",
        icon: <Plus size={16} />,
        action: () => router.push("/chat"),
        category: "Quick Actions",
      },
      {
        id: "qa-doc",
        label: "New document",
        description: "Navigate to docs",
        icon: <Plus size={16} />,
        action: () => router.push("/docs"),
        category: "Quick Actions",
      },
      {
        id: "qa-order",
        label: "New order",
        description: "Navigate to ops",
        icon: <Plus size={16} />,
        action: () => router.push("/ops"),
        category: "Quick Actions",
      },
    ],
    [router],
  );

  // ── Search fixtures for matching results (debounced to 300ms) ────
  const searchResults = useMemo((): CommandItem[] => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q || q.startsWith(">")) return [];

    const navigate = (path: string) => router.push(path);
    return [
      ...searchProjectList(q, navigate),
      ...searchIssues(q, navigate),
      ...searchContactList(q, navigate),
      ...searchDocuments(q, navigate),
      ...searchChannels(q, navigate),
      ...searchMessages(q, navigate),
      ...searchProducts(q, navigate),
      ...searchOrders(q, navigate),
      ...searchTeam(q, navigate),
    ];
  }, [debouncedQuery, router]);

  // ── Build the final filtered item list ──────────────────────────
  const filteredItems = useMemo((): CommandItem[] => {
    const q = query.toLowerCase().trim();

    // Quick actions mode: ">" prefix
    if (q.startsWith(">")) {
      const actionQuery = q.slice(1).trim();
      if (!actionQuery) return quickActions;
      return quickActions.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(actionQuery) ||
          (cmd.description?.toLowerCase().includes(actionQuery) ?? false),
      );
    }

    // Empty query: show recent searches then navigation + create
    if (!q) {
      const recentItems: CommandItem[] = recentSearches.map((term, idx) => ({
        id: `recent-${idx}`,
        label: term,
        description: "Search again",
        icon: <Clock size={16} />,
        action: () => setQuery(term),
        category: "Recent Searches" as ResultCategory,
      }));

      return [
        ...recentItems,
        ...navigationCommands,
        ...createCommands,
        ...actionCommands,
      ];
    }

    // Active search: combine search results with matching commands
    const matchingNavCommands = navigationCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.description?.toLowerCase().includes(q) ?? false),
    );

    const matchingCreateCommands = createCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.description?.toLowerCase().includes(q) ?? false) ||
        (cmd.keywords?.toLowerCase().includes(q) ?? false),
    );

    const matchingActionCommands = actionCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.description?.toLowerCase().includes(q) ?? false),
    );

    // Search results first, then matching commands
    return [
      ...searchResults,
      ...matchingNavCommands,
      ...matchingCreateCommands,
      ...matchingActionCommands,
    ];
  }, [
    query,
    searchResults,
    navigationCommands,
    createCommands,
    actionCommands,
    quickActions,
    recentSearches,
  ]);

  // ── Group items by category ─────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  // ── Reset selected index on query change ────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Focus input on open ─────────────────────────────────────────
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setRecentSearches(loadRecentSearches());
    }
  }, [commandPaletteOpen]);

  // ── Global keyboard shortcut ────────────────────────────────────
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        close();
      }
    }
    globalThis.addEventListener("keydown", handleGlobalKeyDown);
    return () => globalThis.removeEventListener("keydown", handleGlobalKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen, close]);

  // ── Keyboard navigation inside the palette ──────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      runCommand(filteredItems[selectedIndex]);
    }
  }

  // ── Execute a command ───────────────────────────────────────────
  function runCommand(cmd: CommandItem) {
    // Save search term when selecting a search result
    if (query.trim() && !query.startsWith(">")) {
      addRecentSearch(query);
    }
    cmd.action();
    close();
  }

  // ── Detect platform for shortcut hint ───────────────────────────
  const isMac =
    globalThis.navigator !== undefined &&
    /Mac|iPod|iPhone|iPad/.test(globalThis.navigator.userAgent);
  const shortcutHint = isMac ? "\u2318K" : "Ctrl+K";

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[18vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-[580px] rounded-xl overflow-hidden"
            style={{
              background: "var(--content-bg, #1C1C2E)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(6, 182, 212,0.15)",
            }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Search
                size={16}
                style={{ color: "var(--text-secondary)", flexShrink: 0 }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search everything · type > for actions · type ? to ask AI"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none"
              />
              {query.length > 0 && (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: 4,
                    padding: "2px 6px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Clear
                </button>
              )}
              <kbd
                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Query mode indicator */}
            {query.startsWith(">") && (
              <div
                className="flex items-center gap-2 px-4 py-2 text-xs"
                style={{
                  background: "rgba(6, 182, 212,0.08)",
                  color: "#22D3EE",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <ChevronRight size={12} />
                Quick Actions Mode
              </div>
            )}
            {isAiMode && (
              <div
                className="flex items-center gap-2 px-4 py-2 text-xs"
                style={{
                  background: "rgba(6, 182, 212,0.12)",
                  color: "#67E8F9",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: 13 }}>✨</span>
                AI Search Mode
                {aiLoading ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    Asking Vyne…
                  </span>
                ) : aiProvider ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    via {aiProvider}
                  </span>
                ) : null}
              </div>
            )}

            {/* AI search results */}
            {isAiMode && (
              <div className="max-h-[400px] overflow-y-auto content-scroll">
                {aiAnswer && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(6, 182, 212,0.06)",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      color: "var(--content-border)",
                      fontSize: 13,
                      lineHeight: 1.55,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#67E8F9",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: 4,
                      }}
                    >
                      Vyne AI
                    </div>
                    {aiAnswer}
                  </div>
                )}
                {aiHits.length === 0 && !aiLoading && (
                  <div
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {debouncedQuery.replace(/^\?+/, "").trim().length < 3
                      ? "Type your question — e.g. ?find docs about the April outage"
                      : "No matches in the demo corpus."}
                  </div>
                )}
                {aiHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => {
                      if (hit.href) router.push(hit.href);
                      close();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--content-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 4,
                          background: "rgba(6, 182, 212,0.18)",
                          color: "#67E8F9",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {hit.module}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {hit.title}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                        }}
                      >
                        {hit.score}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.45,
                      }}
                    >
                      {hit.snippet}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#67E8F9",
                        fontStyle: "italic",
                      }}
                    >
                      ✨ {hit.reason}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Results (hidden when AI search mode is active) */}
            {!isAiMode && (
              <div className="max-h-[400px] overflow-y-auto content-scroll py-2">
                {filteredItems.length === 0 ? (
                  <div
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No results for &quot;{query}&quot;
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <SectionHeader category={category as ResultCategory} />
                      {items.map((cmd) => {
                        const globalIndex = filteredItems.indexOf(cmd);
                        return (
                          <ResultItem
                            key={cmd.id}
                            item={cmd}
                            isSelected={globalIndex === selectedIndex}
                            onSelect={() => runCommand(cmd)}
                            onHover={() => setSelectedIndex(globalIndex)}
                          />
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 text-xs"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: "#4A4A6A",
              }}
            >
              <span className="flex items-center gap-1">
                <kbd
                  className="px-1 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  ↑↓
                </kbd>{" "}
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="px-1 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd
                  className="px-1 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  &gt;
                </kbd>{" "}
                Actions
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <kbd
                  className="px-1 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  {shortcutHint}
                </kbd>{" "}
                Toggle
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
