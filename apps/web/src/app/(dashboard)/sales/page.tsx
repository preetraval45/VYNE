"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  X,
  Package,
  TrendingUp,
  DollarSign,
  Target,
  ShoppingCart,
  BarChart3,
  Users,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";

// ─── Types ───────────────────────────────────────────────────────
type SalesTab =
  | "opportunities"
  | "quotations"
  | "orders"
  | "products"
  | "customers"
  | "reports";

type OpportunityStage =
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";
type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Rejected";
type OrderStatus = "Confirmed" | "Processing" | "Shipped" | "Delivered";
type ProductStatus = "Active" | "Low Stock" | "Out of Stock";
type CustomerStatus = "Active" | "Inactive" | "New";

interface Opportunity {
  id: string;
  name: string;
  company: string;
  value: number;
  probability: number;
  stage: OpportunityStage;
  expectedClose: string;
  assignee: string;
  createdAt: string;
}

interface Quote {
  id: string;
  number: string;
  customer: string;
  date: string;
  expiry: string;
  amount: number;
  status: QuoteStatus;
  items: number;
}

interface SalesOrder {
  id: string;
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: OrderStatus;
  tracking: string;
  items: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrder: string;
  status: CustomerStatus;
}

// ─── Mock Data ───────────────────────────────────────────────────
const NOW = Date.now();
const daysAgo = (d: number) =>
  new Date(NOW - d * 86400000).toISOString().slice(0, 10);
const daysFromNow = (d: number) =>
  new Date(NOW + d * 86400000).toISOString().slice(0, 10);

const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp1",
    name: "Enterprise License Deal",
    company: "Acme Corp",
    value: 120000,
    probability: 30,
    stage: "Qualification",
    expectedClose: daysFromNow(45),
    assignee: "Alex Rivera",
    createdAt: daysAgo(12),
  },
  {
    id: "opp2",
    name: "Platform Migration",
    company: "TechStart Inc",
    value: 85000,
    probability: 55,
    stage: "Proposal",
    expectedClose: daysFromNow(30),
    assignee: "Priya Shah",
    createdAt: daysAgo(20),
  },
  {
    id: "opp3",
    name: "API Integration Suite",
    company: "DataFlow Ltd",
    value: 64000,
    probability: 70,
    stage: "Negotiation",
    expectedClose: daysFromNow(15),
    assignee: "Sam Chen",
    createdAt: daysAgo(35),
  },
  {
    id: "opp4",
    name: "Annual SaaS Contract",
    company: "Global Retail",
    value: 48000,
    probability: 40,
    stage: "Proposal",
    expectedClose: daysFromNow(25),
    assignee: "Alex Rivera",
    createdAt: daysAgo(18),
  },
  {
    id: "opp5",
    name: "Custom Analytics Module",
    company: "FinEdge Capital",
    value: 156000,
    probability: 60,
    stage: "Negotiation",
    expectedClose: daysFromNow(20),
    assignee: "Priya Shah",
    createdAt: daysAgo(40),
  },
  {
    id: "opp6",
    name: "Cloud Infrastructure",
    company: "ManuCo",
    value: 92000,
    probability: 100,
    stage: "Closed Won",
    expectedClose: daysAgo(5),
    assignee: "Sam Chen",
    createdAt: daysAgo(60),
  },
  {
    id: "opp7",
    name: "Security Audit Package",
    company: "CloudOps Solutions",
    value: 35000,
    probability: 25,
    stage: "Qualification",
    expectedClose: daysFromNow(50),
    assignee: "Jordan Lee",
    createdAt: daysAgo(8),
  },
  {
    id: "opp8",
    name: "Data Warehouse Setup",
    company: "PharmaLink",
    value: 210000,
    probability: 45,
    stage: "Proposal",
    expectedClose: daysFromNow(35),
    assignee: "Priya Shah",
    createdAt: daysAgo(25),
  },
  {
    id: "opp9",
    name: "DevOps Consulting",
    company: "BuildWorks Inc",
    value: 28000,
    probability: 80,
    stage: "Negotiation",
    expectedClose: daysFromNow(10),
    assignee: "Alex Rivera",
    createdAt: daysAgo(30),
  },
  {
    id: "opp10",
    name: "Support Tier Upgrade",
    company: "RetailNow",
    value: 18000,
    probability: 0,
    stage: "Closed Lost",
    expectedClose: daysAgo(3),
    assignee: "Jordan Lee",
    createdAt: daysAgo(45),
  },
  {
    id: "opp11",
    name: "ML Pipeline License",
    company: "GreenVolt Energy",
    value: 145000,
    probability: 100,
    stage: "Closed Won",
    expectedClose: daysAgo(8),
    assignee: "Sam Chen",
    createdAt: daysAgo(55),
  },
  {
    id: "opp12",
    name: "Compliance Toolkit",
    company: "EduSpark",
    value: 42000,
    probability: 20,
    stage: "Qualification",
    expectedClose: daysFromNow(60),
    assignee: "Jordan Lee",
    createdAt: daysAgo(5),
  },
];

const MOCK_QUOTES: Quote[] = [
  {
    id: "q1",
    number: "QT-2026-001",
    customer: "Acme Corp",
    date: daysAgo(3),
    expiry: daysFromNow(27),
    amount: 120000,
    status: "Sent",
    items: 5,
  },
  {
    id: "q2",
    number: "QT-2026-002",
    customer: "TechStart Inc",
    date: daysAgo(7),
    expiry: daysFromNow(23),
    amount: 85000,
    status: "Draft",
    items: 3,
  },
  {
    id: "q3",
    number: "QT-2026-003",
    customer: "DataFlow Ltd",
    date: daysAgo(14),
    expiry: daysFromNow(16),
    amount: 64000,
    status: "Accepted",
    items: 4,
  },
  {
    id: "q4",
    number: "QT-2026-004",
    customer: "Global Retail",
    date: daysAgo(5),
    expiry: daysFromNow(25),
    amount: 48000,
    status: "Sent",
    items: 2,
  },
  {
    id: "q5",
    number: "QT-2026-005",
    customer: "FinEdge Capital",
    date: daysAgo(10),
    expiry: daysFromNow(20),
    amount: 156000,
    status: "Sent",
    items: 7,
  },
  {
    id: "q6",
    number: "QT-2026-006",
    customer: "ManuCo",
    date: daysAgo(20),
    expiry: daysAgo(5),
    amount: 92000,
    status: "Accepted",
    items: 4,
  },
  {
    id: "q7",
    number: "QT-2026-007",
    customer: "RetailNow",
    date: daysAgo(12),
    expiry: daysFromNow(18),
    amount: 18000,
    status: "Rejected",
    items: 1,
  },
  {
    id: "q8",
    number: "QT-2026-008",
    customer: "PharmaLink",
    date: daysAgo(2),
    expiry: daysFromNow(28),
    amount: 210000,
    status: "Draft",
    items: 8,
  },
];

const MOCK_ORDERS: SalesOrder[] = [
  {
    id: "so1",
    number: "SO-2026-001",
    customer: "ManuCo",
    date: daysAgo(5),
    amount: 92000,
    status: "Delivered",
    tracking: "TRK-88291",
    items: 4,
  },
  {
    id: "so2",
    number: "SO-2026-002",
    customer: "DataFlow Ltd",
    date: daysAgo(8),
    amount: 64000,
    status: "Shipped",
    tracking: "TRK-77142",
    items: 3,
  },
  {
    id: "so3",
    number: "SO-2026-003",
    customer: "GreenVolt Energy",
    date: daysAgo(3),
    amount: 145000,
    status: "Processing",
    tracking: "--",
    items: 6,
  },
  {
    id: "so4",
    number: "SO-2026-004",
    customer: "Acme Corp",
    date: daysAgo(15),
    amount: 38000,
    status: "Delivered",
    tracking: "TRK-66039",
    items: 2,
  },
  {
    id: "so5",
    number: "SO-2026-005",
    customer: "FinEdge Capital",
    date: daysAgo(1),
    amount: 156000,
    status: "Confirmed",
    tracking: "--",
    items: 7,
  },
  {
    id: "so6",
    number: "SO-2026-006",
    customer: "BuildWorks Inc",
    date: daysAgo(10),
    amount: 28000,
    status: "Shipped",
    tracking: "TRK-55487",
    items: 2,
  },
  {
    id: "so7",
    number: "SO-2026-007",
    customer: "CloudOps Solutions",
    date: daysAgo(6),
    amount: 52000,
    status: "Processing",
    tracking: "--",
    items: 3,
  },
  {
    id: "so8",
    number: "SO-2026-008",
    customer: "PharmaLink",
    date: daysAgo(2),
    amount: 210000,
    status: "Confirmed",
    tracking: "--",
    items: 8,
  },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "VYNE Platform License",
    sku: "VPL-001",
    category: "Software",
    price: 12000,
    stock: 999,
    status: "Active",
  },
  {
    id: "p2",
    name: "API Gateway Module",
    sku: "AGM-002",
    category: "Add-ons",
    price: 4500,
    stock: 999,
    status: "Active",
  },
  {
    id: "p3",
    name: "Analytics Dashboard",
    sku: "ADH-003",
    category: "Add-ons",
    price: 3200,
    stock: 999,
    status: "Active",
  },
  {
    id: "p4",
    name: "Enterprise Support Plan",
    sku: "ESP-004",
    category: "Services",
    price: 8000,
    stock: 50,
    status: "Active",
  },
  {
    id: "p5",
    name: "Custom Integration Setup",
    sku: "CIS-005",
    category: "Services",
    price: 15000,
    stock: 20,
    status: "Active",
  },
  {
    id: "p6",
    name: "ML Pipeline Module",
    sku: "MPM-006",
    category: "Add-ons",
    price: 6800,
    stock: 999,
    status: "Active",
  },
  {
    id: "p7",
    name: "Compliance Toolkit",
    sku: "CTK-007",
    category: "Add-ons",
    price: 2400,
    stock: 5,
    status: "Low Stock",
  },
  {
    id: "p8",
    name: "Data Migration Service",
    sku: "DMS-008",
    category: "Services",
    price: 10000,
    stock: 0,
    status: "Out of Stock",
  },
  {
    id: "p9",
    name: "Security Audit Package",
    sku: "SAP-009",
    category: "Services",
    price: 7500,
    stock: 15,
    status: "Active",
  },
  {
    id: "p10",
    name: "Training Workshop (5-day)",
    sku: "TWK-010",
    category: "Training",
    price: 5000,
    stock: 8,
    status: "Low Stock",
  },
];

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cust1",
    name: "Acme Corp",
    email: "billing@acme.com",
    totalOrders: 8,
    totalRevenue: 284000,
    lastOrder: daysAgo(5),
    status: "Active",
  },
  {
    id: "cust2",
    name: "TechStart Inc",
    email: "accounts@techstart.io",
    totalOrders: 3,
    totalRevenue: 96000,
    lastOrder: daysAgo(12),
    status: "Active",
  },
  {
    id: "cust3",
    name: "DataFlow Ltd",
    email: "finance@dataflow.co",
    totalOrders: 5,
    totalRevenue: 178000,
    lastOrder: daysAgo(8),
    status: "Active",
  },
  {
    id: "cust4",
    name: "Global Retail",
    email: "procurement@globalretail.com",
    totalOrders: 2,
    totalRevenue: 48000,
    lastOrder: daysAgo(30),
    status: "Inactive",
  },
  {
    id: "cust5",
    name: "FinEdge Capital",
    email: "ops@finedge.com",
    totalOrders: 6,
    totalRevenue: 312000,
    lastOrder: daysAgo(1),
    status: "Active",
  },
  {
    id: "cust6",
    name: "ManuCo",
    email: "purchasing@manuco.com",
    totalOrders: 4,
    totalRevenue: 198000,
    lastOrder: daysAgo(5),
    status: "Active",
  },
  {
    id: "cust7",
    name: "GreenVolt Energy",
    email: "admin@greenvolt.io",
    totalOrders: 7,
    totalRevenue: 420000,
    lastOrder: daysAgo(3),
    status: "Active",
  },
  {
    id: "cust8",
    name: "EduSpark",
    email: "info@eduspark.org",
    totalOrders: 1,
    totalRevenue: 12000,
    lastOrder: daysAgo(60),
    status: "New",
  },
];

const MONTHLY_REVENUE = [
  { month: "Oct 2025", revenue: 182000 },
  { month: "Nov 2025", revenue: 215000 },
  { month: "Dec 2025", revenue: 198000 },
  { month: "Jan 2026", revenue: 242000 },
  { month: "Feb 2026", revenue: 278000 },
  { month: "Mar 2026", revenue: 310000 },
];

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function stageConfig(s: OpportunityStage): {
  bg: string;
  color: string;
  dotColor: string;
} {
  const map: Record<
    OpportunityStage,
    { bg: string; color: string; dotColor: string }
  > = {
    Qualification: { bg: "#EFF6FF", color: "#1E40AF", dotColor: "#3B82F6" },
    Proposal: { bg: "#FFFBEB", color: "#92400E", dotColor: "#F59E0B" },
    Negotiation: { bg: "#F5F3FF", color: "#5B21B6", dotColor: "#8B5CF6" },
    "Closed Won": { bg: "#F0FDF4", color: "#166534", dotColor: "#22C55E" },
    "Closed Lost": { bg: "#FEF2F2", color: "#991B1B", dotColor: "#EF4444" },
  };
  return map[s];
}

function quoteStatusConfig(s: QuoteStatus): { bg: string; color: string } {
  const map: Record<QuoteStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F4F4F8", color: "#6B6B8A" },
    Sent: { bg: "#EFF6FF", color: "#1E40AF" },
    Accepted: { bg: "#F0FDF4", color: "#166534" },
    Rejected: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function orderStatusConfig(s: OrderStatus): { bg: string; color: string } {
  const map: Record<OrderStatus, { bg: string; color: string }> = {
    Confirmed: { bg: "#EFF6FF", color: "#1E40AF" },
    Processing: { bg: "#FFFBEB", color: "#92400E" },
    Shipped: { bg: "#F5F3FF", color: "#5B21B6" },
    Delivered: { bg: "#F0FDF4", color: "#166534" },
  };
  return map[s];
}

function productStatusConfig(s: ProductStatus): { bg: string; color: string } {
  const map: Record<ProductStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    "Low Stock": { bg: "#FFFBEB", color: "#92400E" },
    "Out of Stock": { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function customerStatusConfig(s: CustomerStatus): {
  bg: string;
  color: string;
} {
  const map: Record<CustomerStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Inactive: { bg: "#F4F4F8", color: "#6B6B8A" },
    New: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  return map[s];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Shared UI ───────────────────────────────────────────────────
function TabBtn({
  label,
  icon,
  active,
  onClick,
}: Readonly<{
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        borderBottom: active
          ? "2px solid var(--vyne-purple)"
          : "2px solid transparent",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({
  label,
  config,
}: Readonly<{ label: string; config: { bg: string; color: string } }>) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: config.bg,
        color: config.color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        width: 240,
      }}
    >
      <Search
        size={14}
        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            color: "var(--text-tertiary)",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "7px 28px 7px 12px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        fontSize: 12,
        color: value ? "var(--text-primary)" : "var(--text-tertiary)",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A0A0B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function NewButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 14px rgba(108,71,255,0.45)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(108,71,255,0.3)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

function Th({
  children,
  width,
}: Readonly<{ children: React.ReactNode; width?: number | string }>) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        width: width ?? "auto",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
  align,
}: Readonly<{
  children: React.ReactNode;
  mono?: boolean;
  align?: "right" | "left" | "center";
}>) {
  return (
    <td
      style={{
        padding: "10px 14px",
        fontSize: 12,
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
        fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
        borderBottom: "1px solid var(--content-border)",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </td>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}>) {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px 18px",
        borderRadius: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `${color}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Opportunities Tab (Kanban) ──────────────────────────────────
function OpportunitiesTab() {
  const [opportunities] = useState<Opportunity[]>(MOCK_OPPORTUNITIES);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const stages: OpportunityStage[] = [
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  const filtered = opportunities.filter((o) => {
    const matchSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.company.toLowerCase().includes(search.toLowerCase()) ||
      o.assignee.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || o.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalPipeline = opportunities
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .reduce((s, o) => s + o.value, 0);

  const weightedPipeline = opportunities
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .reduce((s, o) => s + o.value * (o.probability / 100), 0);

  const wonDeals = opportunities.filter((o) => o.stage === "Closed Won");
  const wonTotal = wonDeals.reduce((s, o) => s + o.value, 0);

  const exportData = filtered.map((o) => ({
    name: o.name,
    company: o.company,
    value: String(o.value),
    probability: String(o.probability),
    stage: o.stage,
    expectedClose: o.expectedClose,
    assignee: o.assignee,
  }));

  return (
    <div>
      {/* Pipeline Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <KpiCard
          label="Total Pipeline"
          value={fmt(totalPipeline)}
          icon={<Target size={18} />}
          color="#6C47FF"
        />
        <KpiCard
          label="Weighted Pipeline"
          value={fmt(weightedPipeline)}
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
        />
        <KpiCard
          label="Won This Period"
          value={fmt(wonTotal)}
          icon={<DollarSign size={18} />}
          color="#22C55E"
        />
        <KpiCard
          label="Open Deals"
          value={String(
            opportunities.filter(
              (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost",
            ).length,
          )}
          icon={<ShoppingCart size={18} />}
          color="#3B82F6"
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search opportunities..."
          />
          <FilterDropdown
            label="All Stages"
            value={stageFilter}
            options={stages}
            onChange={setStageFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="opportunities-export"
            columns={[
              { key: "name", header: "Deal Name" },
              { key: "company", header: "Company" },
              { key: "value", header: "Value" },
              { key: "probability", header: "Probability" },
              { key: "stage", header: "Stage" },
              { key: "expectedClose", header: "Expected Close" },
              { key: "assignee", header: "Assignee" },
            ]}
          />
          <NewButton label="New Deal" onClick={() => {}} />
        </div>
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {stages.map((stage) => {
          const stageOpps = filtered.filter((o) => o.stage === stage);
          const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
          const cfg = stageConfig(stage);

          return (
            <div
              key={stage}
              style={{
                minWidth: 260,
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px 10px 0 0",
                  background: cfg.bg,
                  borderBottom: `2px solid ${cfg.dotColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: cfg.dotColor,
                    }}
                  />
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}
                  >
                    {stage}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      color: cfg.color,
                      fontWeight: 600,
                    }}
                  >
                    {stageOpps.length}
                  </span>
                </div>
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}
                >
                  {fmt(stageTotal)}
                </span>
              </div>

              {/* Cards */}
              <div
                style={{
                  flex: 1,
                  background: "var(--content-secondary)",
                  borderRadius: "0 0 10px 10px",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minHeight: 120,
                  border: "1px solid var(--content-border)",
                  borderTop: "none",
                }}
              >
                {stageOpps.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No deals
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "var(--content-bg)",
                        border: "1px solid var(--content-border)",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.08)";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "none";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        {opp.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          marginBottom: 8,
                        }}
                      >
                        {opp.company}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {fmtFull(opp.value)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background:
                              opp.probability >= 60
                                ? "#F0FDF4"
                                : opp.probability >= 30
                                  ? "#FFFBEB"
                                  : "#FEF2F2",
                            color:
                              opp.probability >= 60
                                ? "#166534"
                                : opp.probability >= 30
                                  ? "#92400E"
                                  : "#991B1B",
                          }}
                        >
                          {opp.probability}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "rgba(108,71,255,0.10)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8,
                              fontWeight: 700,
                              color: "var(--vyne-purple)",
                            }}
                          >
                            {initials(opp.assignee)}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {opp.assignee}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {opp.expectedClose}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quotations Tab ──────────────────────────────────────────────
function QuotationsTab() {
  const [quotes] = useState<Quote[]>(MOCK_QUOTES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = quotes.filter((q) => {
    const matchSearch =
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((q) => ({
    number: q.number,
    customer: q.customer,
    date: q.date,
    expiry: q.expiry,
    amount: String(q.amount),
    status: q.status,
    items: String(q.items),
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search quotations..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Draft", "Sent", "Accepted", "Rejected"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="quotations-export"
            columns={[
              { key: "number", header: "Quote #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "expiry", header: "Expiry" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton label="New Quote" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Quote #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Expiry</Th>
                <Th>Items</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No quotations match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const cfg = quoteStatusConfig(q.status);
                  const isExpired = new Date(q.expiry) < new Date();
                  return (
                    <tr
                      key={q.id}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td mono>{q.number}</Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>{q.customer}</span>
                      </Td>
                      <Td>{q.date}</Td>
                      <Td>
                        <span
                          style={{
                            color: isExpired
                              ? "#991B1B"
                              : "var(--text-primary)",
                          }}
                        >
                          {q.expiry}
                          {isExpired && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 4,
                                color: "#EF4444",
                              }}
                            >
                              (expired)
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td>{q.items}</Td>
                      <Td mono>{fmtFull(q.amount)}</Td>
                      <Td>
                        <StatusBadge label={q.status} config={cfg} />
                      </Td>
                      <Td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--content-border)",
                              background: "transparent",
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                            }}
                          >
                            View
                          </button>
                          {q.status === "Draft" && (
                            <button
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: "var(--vyne-purple)",
                                fontSize: 11,
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                            >
                              Send
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Orders Tab ────────────────────────────────────────────
function SalesOrdersTab() {
  const [orders] = useState<SalesOrder[]>(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((o) => ({
    number: o.number,
    customer: o.customer,
    date: o.date,
    amount: String(o.amount),
    status: o.status,
    tracking: o.tracking,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search orders..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Confirmed", "Processing", "Shipped", "Delivered"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="sales-orders-export"
            columns={[
              { key: "number", header: "SO #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
              { key: "tracking", header: "Tracking" },
            ]}
          />
          <NewButton label="New Order" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>SO #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Items</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Tracking</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const cfg = orderStatusConfig(order.status);
                  return (
                    <tr
                      key={order.id}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td mono>{order.number}</Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>
                          {order.customer}
                        </span>
                      </Td>
                      <Td>{order.date}</Td>
                      <Td>{order.items}</Td>
                      <Td mono>{fmtFull(order.amount)}</Td>
                      <Td>
                        <StatusBadge label={order.status} config={cfg} />
                      </Td>
                      <Td>
                        {order.tracking === "--" ? (
                          <span
                            style={{
                              color: "var(--text-tertiary)",
                              fontSize: 11,
                            }}
                          >
                            Pending
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: "'SF Mono', 'Fira Code', monospace",
                              color: "var(--vyne-purple)",
                            }}
                          >
                            {order.tracking}
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────
function ProductsTab() {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const exportData = filtered.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: String(p.price),
    stock: String(p.stock),
    status: p.status,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products..."
          />
          <FilterDropdown
            label="All Categories"
            value={categoryFilter}
            options={categories}
            onChange={setCategoryFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="products-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "sku", header: "SKU" },
              { key: "category", header: "Category" },
              { key: "price", header: "Price" },
              { key: "stock", header: "Stock" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton label="Add Product" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const cfg = productStatusConfig(product.status);
                  return (
                    <tr
                      key={product.id}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: "rgba(108,71,255,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Package
                              size={14}
                              style={{ color: "var(--vyne-purple)" }}
                            />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {product.name}
                          </span>
                        </div>
                      </Td>
                      <Td mono>{product.sku}</Td>
                      <Td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            background: "#F4F4F8",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {product.category}
                        </span>
                      </Td>
                      <Td mono>{fmtFull(product.price)}</Td>
                      <Td>
                        {product.stock === 999
                          ? "Unlimited"
                          : product.stock.toLocaleString()}
                      </Td>
                      <Td>
                        <StatusBadge label={product.status} config={cfg} />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Customers Tab ───────────────────────────────────────────────
function CustomersTab() {
  const [customers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((c) => ({
    name: c.name,
    email: c.email,
    totalOrders: String(c.totalOrders),
    totalRevenue: String(c.totalRevenue),
    lastOrder: c.lastOrder,
    status: c.status,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customers..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Active", "Inactive", "New"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="customers-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "totalOrders", header: "Total Orders" },
              { key: "totalRevenue", header: "Total Revenue" },
              { key: "lastOrder", header: "Last Order" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton label="Add Customer" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Total Orders</Th>
                <Th>Total Revenue</Th>
                <Th>Last Order</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No customers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const cfg = customerStatusConfig(cust.status);
                  return (
                    <tr
                      key={cust.id}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: "rgba(108,71,255,0.10)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--vyne-purple)",
                              flexShrink: 0,
                            }}
                          >
                            {initials(cust.name)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {cust.name}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                        >
                          {cust.email}
                        </span>
                      </Td>
                      <Td>{cust.totalOrders}</Td>
                      <Td mono>{fmtFull(cust.totalRevenue)}</Td>
                      <Td>{cust.lastOrder}</Td>
                      <Td>
                        <StatusBadge label={cust.status} config={cfg} />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────
function ReportsTab() {
  const totalRevenue = MOCK_CUSTOMERS.reduce((s, c) => s + c.totalRevenue, 0);
  const wonDeals = MOCK_OPPORTUNITIES.filter((o) => o.stage === "Closed Won");
  const lostDeals = MOCK_OPPORTUNITIES.filter((o) => o.stage === "Closed Lost");
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((s, o) => s + o.value, 0) / wonDeals.length
      : 0;
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
        )
      : 0;
  const pipelineValue = MOCK_OPPORTUNITIES.filter(
    (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost",
  ).reduce((s, o) => s + o.value, 0);

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          icon={<DollarSign size={18} />}
          color="#22C55E"
        />
        <KpiCard
          label="Avg Deal Size"
          value={fmt(avgDealSize)}
          icon={<TrendingUp size={18} />}
          color="#6C47FF"
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={<Target size={18} />}
          color="#3B82F6"
        />
        <KpiCard
          label="Pipeline Value"
          value={fmt(pipelineValue)}
          icon={<BarChart3 size={18} />}
          color="#8B5CF6"
        />
      </div>

      {/* Monthly Revenue Bar Chart */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Monthly Revenue
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Last 6 months
            </div>
          </div>
          <ExportButton
            data={MONTHLY_REVENUE.map((m) => ({
              month: m.month,
              revenue: String(m.revenue),
            }))}
            filename="monthly-revenue-export"
            columns={[
              { key: "month", header: "Month" },
              { key: "revenue", header: "Revenue" },
            ]}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            height: 200,
            padding: "0 8px",
          }}
        >
          {MONTHLY_REVENUE.map((m, i) => {
            const barHeight =
              maxRevenue > 0 ? (m.revenue / maxRevenue) * 170 : 0;
            return (
              <div
                key={m.month}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {/* Value label */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {fmt(m.revenue)}
                </span>

                {/* Bar */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: 48,
                    height: barHeight,
                    borderRadius: "6px 6px 2px 2px",
                    background:
                      i === MONTHLY_REVENUE.length - 1
                        ? "linear-gradient(180deg, #6C47FF 0%, #8B6BFF 100%)"
                        : "rgba(108,71,255,0.20)",
                    transition: "height 0.3s ease",
                    position: "relative",
                  }}
                  title={`${m.month}: ${fmtFull(m.revenue)}`}
                />

                {/* Month label */}
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  {m.month.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top Deals */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Top Deals (Won)
          </div>
          {wonDeals.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
                padding: 20,
              }}
            >
              No won deals yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wonDeals
                .sort((a, b) => b.value - a.value)
                .map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--content-secondary)",
                      border: "1px solid var(--content-border)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {deal.name}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        {deal.company}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#166534",
                      }}
                    >
                      {fmtFull(deal.value)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Pipeline by Stage */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Pipeline by Stage
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(
              [
                "Qualification",
                "Proposal",
                "Negotiation",
                "Closed Won",
                "Closed Lost",
              ] as OpportunityStage[]
            ).map((stage) => {
              const stageOpps = MOCK_OPPORTUNITIES.filter(
                (o) => o.stage === stage,
              );
              const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
              const cfg = stageConfig(stage);
              const allTotal = MOCK_OPPORTUNITIES.reduce(
                (s, o) => s + o.value,
                0,
              );
              const pct =
                allTotal > 0 ? Math.round((stageTotal / allTotal) * 100) : 0;

              return (
                <div key={stage}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: cfg.dotColor,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {stage}
                      </span>
                      <span
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        ({stageOpps.length})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {fmt(stageTotal)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: "var(--content-secondary)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: cfg.dotColor,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: 20,
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Top Customers by Revenue
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Total Revenue</Th>
                <Th>Orders</Th>
                <Th>Avg Order Value</Th>
              </tr>
            </thead>
            <tbody>
              {[...MOCK_CUSTOMERS]
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 5)
                .map((cust) => (
                  <tr key={cust.id}>
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(108,71,255,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--vyne-purple)",
                          }}
                        >
                          {initials(cust.name)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>
                          {cust.name}
                        </span>
                      </div>
                    </Td>
                    <Td mono>{fmtFull(cust.totalRevenue)}</Td>
                    <Td>{cust.totalOrders}</Td>
                    <Td mono>
                      {fmtFull(
                        Math.round(cust.totalRevenue / cust.totalOrders),
                      )}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>("opportunities");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: 6,
              borderRadius: 8,
              background: "rgba(108,71,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingCart size={18} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Sales
            </h1>
            <p
              style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}
            >
              {MOCK_OPPORTUNITIES.length} opportunities, {MOCK_ORDERS.length}{" "}
              orders
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        <TabBtn
          label="Opportunities"
          icon={<Target size={13} />}
          active={activeTab === "opportunities"}
          onClick={() => setActiveTab("opportunities")}
        />
        <TabBtn
          label="Quotations"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          active={activeTab === "quotations"}
          onClick={() => setActiveTab("quotations")}
        />
        <TabBtn
          label="Sales Orders"
          icon={<ShoppingCart size={13} />}
          active={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
        />
        <TabBtn
          label="Products"
          icon={<Package size={13} />}
          active={activeTab === "products"}
          onClick={() => setActiveTab("products")}
        />
        <TabBtn
          label="Customers"
          icon={<Users size={13} />}
          active={activeTab === "customers"}
          onClick={() => setActiveTab("customers")}
        />
        <TabBtn
          label="Reports"
          icon={<BarChart3 size={13} />}
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "opportunities" && <OpportunitiesTab />}
        {activeTab === "quotations" && <QuotationsTab />}
        {activeTab === "orders" && <SalesOrdersTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}
