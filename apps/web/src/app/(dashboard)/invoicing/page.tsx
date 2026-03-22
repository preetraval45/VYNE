"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Send,
  CheckCircle,
  Download,
  ChevronUp,
  ChevronDown,
  DollarSign,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";

// ─── Types ────────────────────────────────────────────────────────
type Tab =
  | "customers"
  | "invoices"
  | "creditNotes"
  | "payments"
  | "vendors"
  | "bills"
  | "refunds";

type CustomerStatus = "Active" | "Inactive";
type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
type CreditNoteStatus = "Draft" | "Applied" | "Refunded";
type PaymentMethod = "Bank Transfer" | "Credit Card" | "Check";
type PaymentStatus = "Completed" | "Pending" | "Failed";
type VendorStatus = "Active" | "Inactive";
type BillStatus = "Draft" | "Received" | "Paid" | "Overdue";
type RefundType = "Customer Refund" | "Vendor Refund";
type RefundStatus = "Processed" | "Pending" | "Cancelled";

type SortDir = "asc" | "desc";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalRevenue: number;
  outstandingBalance: number;
  lastInvoice: string;
  status: CustomerStatus;
}

interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
}

interface CreditNote {
  id: string;
  number: string;
  customer: string;
  originalInvoice: string;
  amount: number;
  date: string;
  status: CreditNoteStatus;
}

interface Payment {
  id: string;
  number: string;
  customer: string;
  invoice: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: PaymentStatus;
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  totalPurchased: number;
  outstanding: number;
  status: VendorStatus;
}

interface Bill {
  id: string;
  number: string;
  vendor: string;
  date: string;
  dueDate: string;
  amount: number;
  status: BillStatus;
}

interface Refund {
  id: string;
  number: string;
  customerOrVendor: string;
  type: RefundType;
  amount: number;
  date: string;
  status: RefundStatus;
}

// ─── Mock Data ────────────────────────────────────────────────────
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Acme Corp",
    email: "billing@acmecorp.com",
    phone: "(415) 555-0101",
    totalRevenue: 248500,
    outstandingBalance: 12400,
    lastInvoice: "2026-03-15",
    status: "Active",
  },
  {
    id: "c2",
    name: "Globex Industries",
    email: "ap@globex.io",
    phone: "(312) 555-0202",
    totalRevenue: 187200,
    outstandingBalance: 0,
    lastInvoice: "2026-03-10",
    status: "Active",
  },
  {
    id: "c3",
    name: "Initech LLC",
    email: "finance@initech.com",
    phone: "(512) 555-0303",
    totalRevenue: 94300,
    outstandingBalance: 8750,
    lastInvoice: "2026-02-28",
    status: "Active",
  },
  {
    id: "c4",
    name: "Soylent Corp",
    email: "accounts@soylent.co",
    phone: "(646) 555-0404",
    totalRevenue: 156800,
    outstandingBalance: 23100,
    lastInvoice: "2026-03-18",
    status: "Active",
  },
  {
    id: "c5",
    name: "Umbrella Inc",
    email: "payments@umbrella.com",
    phone: "(213) 555-0505",
    totalRevenue: 72100,
    outstandingBalance: 0,
    lastInvoice: "2026-01-22",
    status: "Inactive",
  },
  {
    id: "c6",
    name: "Wayne Enterprises",
    email: "ar@wayne.com",
    phone: "(305) 555-0606",
    totalRevenue: 312600,
    outstandingBalance: 45000,
    lastInvoice: "2026-03-20",
    status: "Active",
  },
  {
    id: "c7",
    name: "Stark Solutions",
    email: "billing@stark.io",
    phone: "(617) 555-0707",
    totalRevenue: 201400,
    outstandingBalance: 15600,
    lastInvoice: "2026-03-12",
    status: "Active",
  },
  {
    id: "c8",
    name: "Pied Piper Inc",
    email: "invoices@piedpiper.com",
    phone: "(408) 555-0808",
    totalRevenue: 43200,
    outstandingBalance: 0,
    lastInvoice: "2025-12-15",
    status: "Inactive",
  },
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: "i1",
    number: "INV-2026-001",
    customer: "Wayne Enterprises",
    date: "2026-03-20",
    dueDate: "2026-04-19",
    amount: 45000,
    status: "Sent",
  },
  {
    id: "i2",
    number: "INV-2026-002",
    customer: "Soylent Corp",
    date: "2026-03-18",
    dueDate: "2026-04-17",
    amount: 23100,
    status: "Sent",
  },
  {
    id: "i3",
    number: "INV-2026-003",
    customer: "Acme Corp",
    date: "2026-03-15",
    dueDate: "2026-04-14",
    amount: 12400,
    status: "Draft",
  },
  {
    id: "i4",
    number: "INV-2026-004",
    customer: "Stark Solutions",
    date: "2026-03-12",
    dueDate: "2026-04-11",
    amount: 15600,
    status: "Sent",
  },
  {
    id: "i5",
    number: "INV-2026-005",
    customer: "Globex Industries",
    date: "2026-03-10",
    dueDate: "2026-04-09",
    amount: 34200,
    status: "Paid",
  },
  {
    id: "i6",
    number: "INV-2026-006",
    customer: "Initech LLC",
    date: "2026-02-28",
    dueDate: "2026-03-30",
    amount: 8750,
    status: "Overdue",
  },
  {
    id: "i7",
    number: "INV-2026-007",
    customer: "Acme Corp",
    date: "2026-02-15",
    dueDate: "2026-03-17",
    amount: 28500,
    status: "Paid",
  },
  {
    id: "i8",
    number: "INV-2026-008",
    customer: "Wayne Enterprises",
    date: "2026-02-10",
    dueDate: "2026-03-12",
    amount: 67600,
    status: "Paid",
  },
  {
    id: "i9",
    number: "INV-2026-009",
    customer: "Pied Piper Inc",
    date: "2026-01-20",
    dueDate: "2026-02-19",
    amount: 12800,
    status: "Cancelled",
  },
  {
    id: "i10",
    number: "INV-2026-010",
    customer: "Soylent Corp",
    date: "2026-01-05",
    dueDate: "2026-02-04",
    amount: 41500,
    status: "Paid",
  },
];

const MOCK_CREDIT_NOTES: CreditNote[] = [
  {
    id: "cn1",
    number: "CN-2026-001",
    customer: "Acme Corp",
    originalInvoice: "INV-2026-007",
    amount: 4200,
    date: "2026-02-20",
    status: "Applied",
  },
  {
    id: "cn2",
    number: "CN-2026-002",
    customer: "Pied Piper Inc",
    originalInvoice: "INV-2026-009",
    amount: 12800,
    date: "2026-01-25",
    status: "Refunded",
  },
  {
    id: "cn3",
    number: "CN-2026-003",
    customer: "Globex Industries",
    originalInvoice: "INV-2026-005",
    amount: 2100,
    date: "2026-03-14",
    status: "Draft",
  },
];

const MOCK_PAYMENTS: Payment[] = [
  {
    id: "p1",
    number: "PAY-2026-001",
    customer: "Globex Industries",
    invoice: "INV-2026-005",
    amount: 34200,
    method: "Bank Transfer",
    date: "2026-03-18",
    status: "Completed",
  },
  {
    id: "p2",
    number: "PAY-2026-002",
    customer: "Acme Corp",
    invoice: "INV-2026-007",
    amount: 24300,
    method: "Credit Card",
    date: "2026-03-02",
    status: "Completed",
  },
  {
    id: "p3",
    number: "PAY-2026-003",
    customer: "Wayne Enterprises",
    invoice: "INV-2026-008",
    amount: 67600,
    method: "Bank Transfer",
    date: "2026-03-05",
    status: "Completed",
  },
  {
    id: "p4",
    number: "PAY-2026-004",
    customer: "Soylent Corp",
    invoice: "INV-2026-010",
    amount: 41500,
    method: "Check",
    date: "2026-02-01",
    status: "Completed",
  },
  {
    id: "p5",
    number: "PAY-2026-005",
    customer: "Stark Solutions",
    invoice: "INV-2026-004",
    amount: 15600,
    method: "Credit Card",
    date: "2026-03-20",
    status: "Pending",
  },
  {
    id: "p6",
    number: "PAY-2026-006",
    customer: "Initech LLC",
    invoice: "INV-2026-006",
    amount: 8750,
    method: "Bank Transfer",
    date: "2026-03-21",
    status: "Failed",
  },
];

const MOCK_VENDORS: Vendor[] = [
  {
    id: "v1",
    name: "CloudHost Pro",
    contact: "Sarah Chen",
    email: "billing@cloudhostpro.com",
    totalPurchased: 86400,
    outstanding: 7200,
    status: "Active",
  },
  {
    id: "v2",
    name: "Office Depot",
    contact: "Mike Johnson",
    email: "business@officedepot.com",
    totalPurchased: 23100,
    outstanding: 0,
    status: "Active",
  },
  {
    id: "v3",
    name: "TechSupply Co",
    contact: "Raj Patel",
    email: "sales@techsupply.com",
    totalPurchased: 142800,
    outstanding: 18500,
    status: "Active",
  },
  {
    id: "v4",
    name: "Legal Eagles LLP",
    contact: "Diana Prince",
    email: "invoicing@legaleagles.com",
    totalPurchased: 54000,
    outstanding: 12000,
    status: "Active",
  },
  {
    id: "v5",
    name: "GreenClean Services",
    contact: "Tom Hardy",
    email: "accounts@greenclean.co",
    totalPurchased: 18600,
    outstanding: 0,
    status: "Inactive",
  },
];

const MOCK_BILLS: Bill[] = [
  {
    id: "b1",
    number: "BILL-2026-001",
    vendor: "CloudHost Pro",
    date: "2026-03-01",
    dueDate: "2026-03-31",
    amount: 7200,
    status: "Received",
  },
  {
    id: "b2",
    number: "BILL-2026-002",
    vendor: "TechSupply Co",
    date: "2026-03-05",
    dueDate: "2026-04-04",
    amount: 18500,
    status: "Received",
  },
  {
    id: "b3",
    number: "BILL-2026-003",
    vendor: "Legal Eagles LLP",
    date: "2026-02-15",
    dueDate: "2026-03-17",
    amount: 12000,
    status: "Overdue",
  },
  {
    id: "b4",
    number: "BILL-2026-004",
    vendor: "Office Depot",
    date: "2026-02-20",
    dueDate: "2026-03-22",
    amount: 4800,
    status: "Paid",
  },
  {
    id: "b5",
    number: "BILL-2026-005",
    vendor: "GreenClean Services",
    date: "2026-01-10",
    dueDate: "2026-02-09",
    amount: 3100,
    status: "Paid",
  },
  {
    id: "b6",
    number: "BILL-2026-006",
    vendor: "CloudHost Pro",
    date: "2026-03-15",
    dueDate: "2026-04-14",
    amount: 7200,
    status: "Draft",
  },
];

const MOCK_REFUNDS: Refund[] = [
  {
    id: "r1",
    number: "REF-2026-001",
    customerOrVendor: "Pied Piper Inc",
    type: "Customer Refund",
    amount: 12800,
    date: "2026-01-28",
    status: "Processed",
  },
  {
    id: "r2",
    number: "REF-2026-002",
    customerOrVendor: "Office Depot",
    type: "Vendor Refund",
    amount: 1200,
    date: "2026-02-25",
    status: "Processed",
  },
  {
    id: "r3",
    number: "REF-2026-003",
    customerOrVendor: "Acme Corp",
    type: "Customer Refund",
    amount: 4200,
    date: "2026-03-01",
    status: "Pending",
  },
  {
    id: "r4",
    number: "REF-2026-004",
    customerOrVendor: "TechSupply Co",
    type: "Vendor Refund",
    amount: 3400,
    date: "2026-03-10",
    status: "Cancelled",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Status Badge Configs ─────────────────────────────────────────
function invoiceStatusStyle(s: InvoiceStatus): { bg: string; color: string } {
  const map: Record<InvoiceStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Sent: { bg: "#FFFBEB", color: "#92400E" },
    Paid: { bg: "#F0FDF4", color: "#166534" },
    Overdue: { bg: "#FEF2F2", color: "#991B1B" },
    Cancelled: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function creditNoteStatusStyle(s: CreditNoteStatus): {
  bg: string;
  color: string;
} {
  const map: Record<CreditNoteStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Applied: { bg: "#F0FDF4", color: "#166534" },
    Refunded: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  return map[s];
}

function paymentStatusStyle(s: PaymentStatus): { bg: string; color: string } {
  const map: Record<PaymentStatus, { bg: string; color: string }> = {
    Completed: { bg: "#F0FDF4", color: "#166534" },
    Pending: { bg: "#FFFBEB", color: "#92400E" },
    Failed: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function billStatusStyle(s: BillStatus): { bg: string; color: string } {
  const map: Record<BillStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Received: { bg: "#EFF6FF", color: "#1E40AF" },
    Paid: { bg: "#F0FDF4", color: "#166534" },
    Overdue: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function refundStatusStyle(s: RefundStatus): { bg: string; color: string } {
  const map: Record<RefundStatus, { bg: string; color: string }> = {
    Processed: { bg: "#F0FDF4", color: "#166534" },
    Pending: { bg: "#FFFBEB", color: "#92400E" },
    Cancelled: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function customerStatusStyle(s: CustomerStatus): { bg: string; color: string } {
  const map: Record<CustomerStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Inactive: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function vendorStatusStyle(s: VendorStatus): { bg: string; color: string } {
  const map: Record<VendorStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Inactive: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

// ─── Shared Sub-Components ────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  label,
  bg,
  color,
}: Readonly<{ label: string; bg: string; color: string }>) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  delta,
  deltaUp,
}: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  delta?: string;
  deltaUp?: boolean;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        padding: "14px 16px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 10,
            color: deltaUp ? "var(--status-success)" : "var(--status-danger)",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {deltaUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{" "}
          {delta}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: Readonly<{
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
}>) {
  const isActive = currentSort === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: "9px 16px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 600,
        color: isActive ? "var(--vyne-purple)" : "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label}
        {isActive &&
          (currentDir === "asc" ? (
            <ChevronUp size={10} />
          ) : (
            <ChevronDown size={10} />
          ))}
      </span>
    </th>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  color,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}>) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "transparent",
        cursor: "pointer",
        color: color ?? "var(--text-secondary)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

function PrimaryBtn({
  icon,
  label,
  onClick,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "var(--vyne-purple)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterBtn({
  label,
  active,
  count,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 6,
        border: active
          ? "1px solid var(--vyne-purple)"
          : "1px solid rgba(0,0,0,0.1)",
        background: active ? "rgba(108,71,255,0.08)" : "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.15s",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "0 5px",
            borderRadius: 10,
            background: active ? "var(--vyne-purple)" : "rgba(0,0,0,0.06)",
            color: active ? "#fff" : "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
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
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Search
        size={14}
        style={{
          position: "absolute",
          left: 10,
          color: "var(--text-tertiary)",
          pointerEvents: "none",
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: 220,
          padding: "7px 10px 7px 30px",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 8,
          background: "#FAFAFE",
          outline: "none",
          fontSize: 12,
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

function TableContainer({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

function TableRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <tr
      style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      onMouseEnter={(ev) => {
        (ev.currentTarget as HTMLTableRowElement).style.background = "#FAFAFE";
      }}
      onMouseLeave={(ev) => {
        (ev.currentTarget as HTMLTableRowElement).style.background =
          "transparent";
      }}
    >
      {children}
    </tr>
  );
}

function Td({
  children,
  bold,
  color,
  mono,
  align,
}: Readonly<{
  children: React.ReactNode;
  bold?: boolean;
  color?: string;
  mono?: boolean;
  align?: "left" | "right" | "center";
}>) {
  return (
    <td
      style={{
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: bold ? 600 : 400,
        color: color ?? "var(--text-primary)",
        fontFamily: mono ? "monospace" : "inherit",
        textAlign: align ?? "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

// ─── Sort Utility ─────────────────────────────────────────────────
function useSortableData<T>(
  items: T[],
  defaultKey: string,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? "").toLowerCase();
      const bStr = String(bVal ?? "").toLowerCase();
      if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, handleSort };
}

// ─── Tab: Customers ───────────────────────────────────────────────
function CustomersTab() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "name",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={MOCK_CUSTOMERS as unknown as Record<string, unknown>[]}
            filename="vyne-customers"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "totalRevenue", header: "Total Revenue" },
              { key: "outstandingBalance", header: "Outstanding" },
              { key: "lastInvoice", header: "Last Invoice" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Customer"
            onClick={() => {}}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Name"
              sortKey="name"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Email"
              sortKey="email"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Phone"
              sortKey="phone"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Total Revenue"
              sortKey="totalRevenue"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Outstanding"
              sortKey="outstandingBalance"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Last Invoice"
              sortKey="lastInvoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const st = customerStatusStyle(c.status);
            return (
              <TableRow key={c.id}>
                <Td bold color="var(--vyne-purple)">
                  {c.name}
                </Td>
                <Td color="var(--text-secondary)">{c.email}</Td>
                <Td color="var(--text-secondary)">{c.phone}</Td>
                <Td bold>{fmtFull(c.totalRevenue)}</Td>
                <Td
                  bold
                  color={
                    c.outstandingBalance > 0 ? "#991B1B" : "var(--text-primary)"
                  }
                >
                  {c.outstandingBalance > 0
                    ? fmtFull(c.outstandingBalance)
                    : "--"}
                </Td>
                <Td color="var(--text-tertiary)">{fmtDate(c.lastInvoice)}</Td>
                <Td>
                  <StatusBadge label={c.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No customers found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Invoices ────────────────────────────────────────────────
function InvoicesTab() {
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");
  const [invoices, setInvoices] = useState(MOCK_INVOICES);

  const filtered =
    filter === "All"
      ? invoices
      : invoices.filter((inv) => inv.status === filter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "Sent" || i.status === "Draft")
    .reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.amount, 0);

  const counts: Record<string, number> = {
    All: invoices.length,
    Draft: invoices.filter((i) => i.status === "Draft").length,
    Sent: invoices.filter((i) => i.status === "Sent").length,
    Paid: invoices.filter((i) => i.status === "Paid").length,
    Overdue: invoices.filter((i) => i.status === "Overdue").length,
  };

  function markPaid(id: string) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: "Paid" as InvoiceStatus } : inv,
      ),
    );
  }

  return (
    <div>
      {/* KPI Cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Total Invoiced"
          value={fmt(totalInvoiced)}
          icon={<FileText size={16} style={{ color: "var(--vyne-purple)" }} />}
          iconBg="rgba(108,71,255,0.08)"
          delta="+12.4% vs last month"
          deltaUp
        />
        <KpiCard
          label="Paid"
          value={fmt(totalPaid)}
          icon={
            <CheckCircle size={16} style={{ color: "var(--status-success)" }} />
          }
          iconBg="rgba(34,197,94,0.08)"
          delta="4 invoices"
          deltaUp
        />
        <KpiCard
          label="Outstanding"
          value={fmt(totalOutstanding)}
          icon={<Clock size={16} style={{ color: "#F59E0B" }} />}
          iconBg="rgba(245,158,11,0.08)"
          delta="4 invoices pending"
          deltaUp={false}
        />
        <KpiCard
          label="Overdue"
          value={fmt(totalOverdue)}
          icon={
            <AlertTriangle
              size={16}
              style={{ color: "var(--status-danger)" }}
            />
          }
          iconBg="rgba(239,68,68,0.08)"
          delta="1 invoice overdue"
          deltaUp={false}
        />
      </div>

      {/* Filters + Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Draft", "Sent", "Paid", "Overdue"] as const).map((f) => (
            <FilterBtn
              key={f}
              label={f}
              active={filter === f}
              count={counts[f]}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={invoices as unknown as Record<string, unknown>[]}
            filename="vyne-invoices"
            columns={[
              { key: "number", header: "Invoice #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "dueDate", header: "Due Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Invoice"
            onClick={() => {}}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Invoice #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Due Date"
              sortKey="dueDate"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((inv) => {
            const st = invoiceStatusStyle(inv.status);
            return (
              <TableRow key={inv.id}>
                <Td bold color="var(--vyne-purple)">
                  {inv.number}
                </Td>
                <Td>{inv.customer}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(inv.date)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(inv.dueDate)}</Td>
                <Td bold>{fmtFull(inv.amount)}</Td>
                <Td>
                  <StatusBadge label={inv.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    {(inv.status === "Draft" || inv.status === "Sent") && (
                      <ActionBtn
                        icon={<Send size={12} />}
                        label="Send"
                        onClick={() => {}}
                        color="#1E40AF"
                      />
                    )}
                    {(inv.status === "Sent" || inv.status === "Overdue") && (
                      <ActionBtn
                        icon={<CheckCircle size={12} />}
                        label="Mark Paid"
                        onClick={() => markPaid(inv.id)}
                        color="#166534"
                      />
                    )}
                    <ActionBtn
                      icon={<Download size={12} />}
                      label="Download PDF"
                      onClick={() => {}}
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No invoices found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Credit Notes ────────────────────────────────────────────
function CreditNotesTab() {
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    MOCK_CREDIT_NOTES,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <ExportButton
          data={MOCK_CREDIT_NOTES as unknown as Record<string, unknown>[]}
          filename="vyne-credit-notes"
          columns={[
            { key: "number", header: "Credit Note #" },
            { key: "customer", header: "Customer" },
            { key: "originalInvoice", header: "Original Invoice" },
            { key: "amount", header: "Amount" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
        />
        <PrimaryBtn
          icon={<Plus size={13} />}
          label="New Credit Note"
          onClick={() => {}}
        />
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Credit Note #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Original Invoice"
              sortKey="originalInvoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((cn) => {
            const st = creditNoteStatusStyle(cn.status);
            return (
              <TableRow key={cn.id}>
                <Td bold color="var(--vyne-purple)">
                  {cn.number}
                </Td>
                <Td>{cn.customer}</Td>
                <Td color="var(--text-secondary)" mono>
                  {cn.originalInvoice}
                </Td>
                <Td bold>{fmtFull(cn.amount)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(cn.date)}</Td>
                <Td>
                  <StatusBadge label={cn.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Payments ────────────────────────────────────────────────
function PaymentsTab() {
  const [methodFilter, setMethodFilter] = useState<"All" | PaymentMethod>(
    "All",
  );

  const filtered =
    methodFilter === "All"
      ? MOCK_PAYMENTS
      : MOCK_PAYMENTS.filter((p) => p.method === methodFilter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Bank Transfer", "Credit Card", "Check"] as const).map(
            (m) => (
              <FilterBtn
                key={m}
                label={m}
                active={methodFilter === m}
                onClick={() => setMethodFilter(m)}
              />
            ),
          )}
        </div>
        <ExportButton
          data={MOCK_PAYMENTS as unknown as Record<string, unknown>[]}
          filename="vyne-payments"
          columns={[
            { key: "number", header: "Payment #" },
            { key: "customer", header: "Customer" },
            { key: "invoice", header: "Invoice" },
            { key: "amount", header: "Amount" },
            { key: "method", header: "Method" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
        />
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Payment #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Invoice"
              sortKey="invoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Method"
              sortKey="method"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const st = paymentStatusStyle(p.status);
            return (
              <TableRow key={p.id}>
                <Td bold color="var(--vyne-purple)">
                  {p.number}
                </Td>
                <Td>{p.customer}</Td>
                <Td color="var(--text-secondary)" mono>
                  {p.invoice}
                </Td>
                <Td bold>{fmtFull(p.amount)}</Td>
                <Td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      background: "rgba(108,71,255,0.06)",
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {p.method}
                  </span>
                </Td>
                <Td color="var(--text-tertiary)">{fmtDate(p.date)}</Td>
                <Td>
                  <StatusBadge label={p.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No payments found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Vendors ─────────────────────────────────────────────────
function VendorsTab() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_VENDORS.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()),
  );
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "name",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search vendors..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={MOCK_VENDORS as unknown as Record<string, unknown>[]}
            filename="vyne-vendors"
            columns={[
              { key: "name", header: "Name" },
              { key: "contact", header: "Contact" },
              { key: "email", header: "Email" },
              { key: "totalPurchased", header: "Total Purchased" },
              { key: "outstanding", header: "Outstanding" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Vendor"
            onClick={() => {}}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Name"
              sortKey="name"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Contact"
              sortKey="contact"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Email"
              sortKey="email"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Total Purchased"
              sortKey="totalPurchased"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Outstanding"
              sortKey="outstanding"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => {
            const st = vendorStatusStyle(v.status);
            return (
              <TableRow key={v.id}>
                <Td bold color="var(--vyne-purple)">
                  {v.name}
                </Td>
                <Td>{v.contact}</Td>
                <Td color="var(--text-secondary)">{v.email}</Td>
                <Td bold>{fmtFull(v.totalPurchased)}</Td>
                <Td
                  bold
                  color={v.outstanding > 0 ? "#991B1B" : "var(--text-primary)"}
                >
                  {v.outstanding > 0 ? fmtFull(v.outstanding) : "--"}
                </Td>
                <Td>
                  <StatusBadge label={v.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No vendors found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Bills ───────────────────────────────────────────────────
function BillsTab() {
  const [filter, setFilter] = useState<"All" | BillStatus>("All");

  const filtered =
    filter === "All"
      ? MOCK_BILLS
      : MOCK_BILLS.filter((b) => b.status === filter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  const totalBilled = MOCK_BILLS.reduce((s, b) => s + b.amount, 0);
  const totalBillsPaid = MOCK_BILLS.filter((b) => b.status === "Paid").reduce(
    (s, b) => s + b.amount,
    0,
  );
  const totalBillsOutstanding = MOCK_BILLS.filter(
    (b) => b.status === "Received" || b.status === "Draft",
  ).reduce((s, b) => s + b.amount, 0);
  const totalBillsOverdue = MOCK_BILLS.filter(
    (b) => b.status === "Overdue",
  ).reduce((s, b) => s + b.amount, 0);

  const counts: Record<string, number> = {
    All: MOCK_BILLS.length,
    Draft: MOCK_BILLS.filter((b) => b.status === "Draft").length,
    Received: MOCK_BILLS.filter((b) => b.status === "Received").length,
    Paid: MOCK_BILLS.filter((b) => b.status === "Paid").length,
    Overdue: MOCK_BILLS.filter((b) => b.status === "Overdue").length,
  };

  return (
    <div>
      {/* KPI Cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Total Billed"
          value={fmt(totalBilled)}
          icon={<FileText size={16} style={{ color: "var(--vyne-purple)" }} />}
          iconBg="rgba(108,71,255,0.08)"
        />
        <KpiCard
          label="Paid"
          value={fmt(totalBillsPaid)}
          icon={
            <CheckCircle size={16} style={{ color: "var(--status-success)" }} />
          }
          iconBg="rgba(34,197,94,0.08)"
        />
        <KpiCard
          label="Outstanding"
          value={fmt(totalBillsOutstanding)}
          icon={<Clock size={16} style={{ color: "#F59E0B" }} />}
          iconBg="rgba(245,158,11,0.08)"
        />
        <KpiCard
          label="Overdue"
          value={fmt(totalBillsOverdue)}
          icon={
            <AlertTriangle
              size={16}
              style={{ color: "var(--status-danger)" }}
            />
          }
          iconBg="rgba(239,68,68,0.08)"
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Draft", "Received", "Paid", "Overdue"] as const).map(
            (f) => (
              <FilterBtn
                key={f}
                label={f}
                active={filter === f}
                count={counts[f]}
                onClick={() => setFilter(f)}
              />
            ),
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={MOCK_BILLS as unknown as Record<string, unknown>[]}
            filename="vyne-bills"
            columns={[
              { key: "number", header: "Bill #" },
              { key: "vendor", header: "Vendor" },
              { key: "date", header: "Date" },
              { key: "dueDate", header: "Due Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Bill"
            onClick={() => {}}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Bill #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Vendor"
              sortKey="vendor"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Due Date"
              sortKey="dueDate"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const st = billStatusStyle(b.status);
            return (
              <TableRow key={b.id}>
                <Td bold color="var(--vyne-purple)">
                  {b.number}
                </Td>
                <Td>{b.vendor}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(b.date)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(b.dueDate)}</Td>
                <Td bold>{fmtFull(b.amount)}</Td>
                <Td>
                  <StatusBadge label={b.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No bills found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Tab: Refunds ─────────────────────────────────────────────────
function RefundsTab() {
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    MOCK_REFUNDS,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <ExportButton
          data={MOCK_REFUNDS as unknown as Record<string, unknown>[]}
          filename="vyne-refunds"
          columns={[
            { key: "number", header: "Refund #" },
            { key: "customerOrVendor", header: "Customer/Vendor" },
            { key: "type", header: "Type" },
            { key: "amount", header: "Amount" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
        />
        <PrimaryBtn
          icon={<Plus size={13} />}
          label="New Refund"
          onClick={() => {}}
        />
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "#F7F7FB" }}>
            <SortHeader
              label="Refund #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer / Vendor"
              sortKey="customerOrVendor"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Type"
              sortKey="type"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const st = refundStatusStyle(r.status);
            const typeBg =
              r.type === "Customer Refund"
                ? { bg: "#EFF6FF", color: "#1E40AF" }
                : { bg: "#FFF7ED", color: "#9A3412" };
            return (
              <TableRow key={r.id}>
                <Td bold color="var(--vyne-purple)">
                  {r.number}
                </Td>
                <Td>{r.customerOrVendor}</Td>
                <Td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      background: typeBg.bg,
                      color: typeBg.color,
                    }}
                  >
                    {r.type}
                  </span>
                </Td>
                <Td bold>{fmtFull(r.amount)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(r.date)}</Td>
                <Td>
                  <StatusBadge label={r.status} bg={st.bg} color={st.color} />
                </Td>
              </TableRow>
            );
          })}
        </tbody>
      </TableContainer>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InvoicingPage() {
  const [tab, setTab] = useState<Tab>("invoices");

  const totalRevenue = MOCK_CUSTOMERS.reduce((s, c) => s + c.totalRevenue, 0);
  const totalOutstanding = MOCK_CUSTOMERS.reduce(
    (s, c) => s + c.outstandingBalance,
    0,
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px 0",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Invoicing
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "2px 0 0",
              }}
            >
              Manage invoices, bills, payments & customers
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                color: "#166534",
              }}
            >
              Revenue {fmt(totalRevenue)}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(239,68,68,0.1)",
                color: "#991B1B",
              }}
            >
              Outstanding {fmt(totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
          }}
        >
          <TabBtn
            label="Customers"
            active={tab === "customers"}
            onClick={() => setTab("customers")}
          />
          <TabBtn
            label="Invoices"
            active={tab === "invoices"}
            onClick={() => setTab("invoices")}
          />
          <TabBtn
            label="Credit Notes"
            active={tab === "creditNotes"}
            onClick={() => setTab("creditNotes")}
          />
          <TabBtn
            label="Payments"
            active={tab === "payments"}
            onClick={() => setTab("payments")}
          />
          <TabBtn
            label="Vendors"
            active={tab === "vendors"}
            onClick={() => setTab("vendors")}
          />
          <TabBtn
            label="Bills"
            active={tab === "bills"}
            onClick={() => setTab("bills")}
          />
          <TabBtn
            label="Refunds"
            active={tab === "refunds"}
            onClick={() => setTab("refunds")}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 20 }}
      >
        {tab === "customers" && <CustomersTab />}
        {tab === "invoices" && <InvoicesTab />}
        {tab === "creditNotes" && <CreditNotesTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "bills" && <BillsTab />}
        {tab === "refunds" && <RefundsTab />}
      </div>
    </div>
  );
}
