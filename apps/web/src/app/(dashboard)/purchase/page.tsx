"use client";

import { useState, useEffect } from "react";
import { ExportButton } from "@/components/shared/ExportButton";
import { erpApi } from "@/lib/api/client";

// ── Types ────────────────────────────────────────────────────────
type PurchaseTab =
  | "orders"
  | "vendors"
  | "products"
  | "receipts"
  | "bills"
  | "reports";

type POStatus = "Draft" | "Sent" | "Confirmed" | "Received" | "Cancelled";

type VendorStatus = "Active" | "Inactive" | "Pending";

type QCResult = "Pass" | "Fail" | "Pending";

type BillStatus = "Draft" | "Received" | "Paid" | "Overdue";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  date: string;
  expectedDelivery: string;
  amount: number;
  status: POStatus;
  itemsCount: number;
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  productsSupplied: string[];
  totalPurchased: number;
  rating: number;
  status: VendorStatus;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  unitCost: number;
  lastPurchasePrice: number;
  leadTimeDays: number;
  minOrderQty: number;
  reorderPoint: number;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  poReference: string;
  vendor: string;
  dateReceived: string;
  items: number;
  qualityCheck: QCResult;
  notes: string;
}

interface Bill {
  id: string;
  billNumber: string;
  vendor: string;
  poReference: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
}

// ── Mock Data ────────────────────────────────────────────────────
let MOCK_POS: PurchaseOrder[] = [
  {
    id: "po1",
    poNumber: "PO-2026-001",
    vendor: "Acme Supplies",
    date: "2026-03-01",
    expectedDelivery: "2026-03-15",
    amount: 12500,
    status: "Received",
    itemsCount: 5,
  },
  {
    id: "po2",
    poNumber: "PO-2026-002",
    vendor: "Global Components",
    date: "2026-03-03",
    expectedDelivery: "2026-03-20",
    amount: 8700,
    status: "Confirmed",
    itemsCount: 3,
  },
  {
    id: "po3",
    poNumber: "PO-2026-003",
    vendor: "TechParts Inc",
    date: "2026-03-05",
    expectedDelivery: "2026-03-25",
    amount: 23400,
    status: "Sent",
    itemsCount: 8,
  },
  {
    id: "po4",
    poNumber: "PO-2026-004",
    vendor: "Raw Materials Co",
    date: "2026-03-07",
    expectedDelivery: "2026-03-22",
    amount: 6300,
    status: "Draft",
    itemsCount: 2,
  },
  {
    id: "po5",
    poNumber: "PO-2026-005",
    vendor: "Precision Tools",
    date: "2026-03-08",
    expectedDelivery: "2026-03-28",
    amount: 15800,
    status: "Confirmed",
    itemsCount: 6,
  },
  {
    id: "po6",
    poNumber: "PO-2026-006",
    vendor: "EcoPackaging Ltd",
    date: "2026-03-10",
    expectedDelivery: "2026-04-01",
    amount: 4200,
    status: "Sent",
    itemsCount: 4,
  },
  {
    id: "po7",
    poNumber: "PO-2026-007",
    vendor: "Acme Supplies",
    date: "2026-03-12",
    expectedDelivery: "2026-03-30",
    amount: 9100,
    status: "Cancelled",
    itemsCount: 3,
  },
  {
    id: "po8",
    poNumber: "PO-2026-008",
    vendor: "Global Components",
    date: "2026-03-14",
    expectedDelivery: "2026-04-05",
    amount: 18600,
    status: "Draft",
    itemsCount: 7,
  },
  {
    id: "po9",
    poNumber: "PO-2026-009",
    vendor: "MetalWorks Ltd",
    date: "2026-03-16",
    expectedDelivery: "2026-04-02",
    amount: 7450,
    status: "Sent",
    itemsCount: 4,
  },
  {
    id: "po10",
    poNumber: "PO-2026-010",
    vendor: "ChemSource Global",
    date: "2026-03-18",
    expectedDelivery: "2026-04-08",
    amount: 31200,
    status: "Confirmed",
    itemsCount: 10,
  },
];

let MOCK_VENDORS: Vendor[] = [
  {
    id: "v1",
    name: "Acme Supplies",
    contact: "John Hartman",
    email: "john@acmesupplies.com",
    phone: "+1 555-0101",
    productsSupplied: ["Steel Bars", "Aluminum Sheets", "Fasteners"],
    totalPurchased: 185000,
    rating: 4.5,
    status: "Active",
  },
  {
    id: "v2",
    name: "Global Components",
    contact: "Sarah Chen",
    email: "sarah@globalcomp.com",
    phone: "+1 555-0202",
    productsSupplied: ["Circuit Boards", "Sensors", "Wiring"],
    totalPurchased: 142000,
    rating: 4.2,
    status: "Active",
  },
  {
    id: "v3",
    name: "TechParts Inc",
    contact: "Mike Johnson",
    email: "mike@techparts.com",
    phone: "+1 555-0303",
    productsSupplied: ["Motors", "Controllers", "Displays"],
    totalPurchased: 98000,
    rating: 3.8,
    status: "Active",
  },
  {
    id: "v4",
    name: "Raw Materials Co",
    contact: "Lisa Wang",
    email: "lisa@rawmaterials.com",
    phone: "+1 555-0404",
    productsSupplied: ["Polymers", "Adhesives"],
    totalPurchased: 67000,
    rating: 4.0,
    status: "Active",
  },
  {
    id: "v5",
    name: "Precision Tools",
    contact: "David Kim",
    email: "david@precisiontools.com",
    phone: "+1 555-0505",
    productsSupplied: ["Drill Bits", "Cutting Tools", "Measuring Instruments"],
    totalPurchased: 54000,
    rating: 4.7,
    status: "Active",
  },
  {
    id: "v6",
    name: "EcoPackaging Ltd",
    contact: "Emma Brown",
    email: "emma@ecopackaging.com",
    phone: "+1 555-0606",
    productsSupplied: ["Boxes", "Foam Inserts", "Labels"],
    totalPurchased: 32000,
    rating: 3.5,
    status: "Pending",
  },
  {
    id: "v7",
    name: "MetalWorks Ltd",
    contact: "Robert Singh",
    email: "robert@metalworks.com",
    phone: "+1 555-0707",
    productsSupplied: ["Custom Castings", "CNC Parts"],
    totalPurchased: 76000,
    rating: 4.3,
    status: "Active",
  },
  {
    id: "v8",
    name: "ChemSource Global",
    contact: "Ana Martinez",
    email: "ana@chemsource.com",
    phone: "+1 555-0808",
    productsSupplied: ["Solvents", "Coatings", "Lubricants"],
    totalPurchased: 45000,
    rating: 3.9,
    status: "Inactive",
  },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Steel Bar 20mm",
    sku: "STL-020",
    category: "Raw Materials",
    supplier: "Acme Supplies",
    unitCost: 12.5,
    lastPurchasePrice: 12.8,
    leadTimeDays: 7,
    minOrderQty: 100,
    reorderPoint: 200,
  },
  {
    id: "p2",
    name: "Circuit Board v3",
    sku: "PCB-003",
    category: "Electronics",
    supplier: "Global Components",
    unitCost: 45.0,
    lastPurchasePrice: 44.5,
    leadTimeDays: 14,
    minOrderQty: 50,
    reorderPoint: 100,
  },
  {
    id: "p3",
    name: "Servo Motor SM-200",
    sku: "MOT-200",
    category: "Electronics",
    supplier: "TechParts Inc",
    unitCost: 128.0,
    lastPurchasePrice: 130.0,
    leadTimeDays: 21,
    minOrderQty: 10,
    reorderPoint: 25,
  },
  {
    id: "p4",
    name: "Polymer Resin PX-5",
    sku: "CHM-PX5",
    category: "Chemicals",
    supplier: "Raw Materials Co",
    unitCost: 32.0,
    lastPurchasePrice: 31.5,
    leadTimeDays: 10,
    minOrderQty: 200,
    reorderPoint: 500,
  },
  {
    id: "p5",
    name: "Aluminum Sheet 1mm",
    sku: "ALU-001",
    category: "Raw Materials",
    supplier: "Acme Supplies",
    unitCost: 8.75,
    lastPurchasePrice: 9.0,
    leadTimeDays: 5,
    minOrderQty: 200,
    reorderPoint: 400,
  },
  {
    id: "p6",
    name: "Precision Drill Bit 5mm",
    sku: "TLS-D05",
    category: "Tools",
    supplier: "Precision Tools",
    unitCost: 15.6,
    lastPurchasePrice: 15.6,
    leadTimeDays: 3,
    minOrderQty: 20,
    reorderPoint: 50,
  },
  {
    id: "p7",
    name: "Corrugated Box (Large)",
    sku: "PKG-LG1",
    category: "Packaging",
    supplier: "EcoPackaging Ltd",
    unitCost: 2.1,
    lastPurchasePrice: 2.15,
    leadTimeDays: 7,
    minOrderQty: 500,
    reorderPoint: 1000,
  },
  {
    id: "p8",
    name: "Temperature Sensor TS-X",
    sku: "SEN-TSX",
    category: "Electronics",
    supplier: "Global Components",
    unitCost: 22.4,
    lastPurchasePrice: 23.0,
    leadTimeDays: 12,
    minOrderQty: 30,
    reorderPoint: 60,
  },
  {
    id: "p9",
    name: "Industrial Adhesive GA-7",
    sku: "CHM-GA7",
    category: "Chemicals",
    supplier: "Raw Materials Co",
    unitCost: 18.9,
    lastPurchasePrice: 19.2,
    leadTimeDays: 8,
    minOrderQty: 100,
    reorderPoint: 250,
  },
  {
    id: "p10",
    name: "CNC Milled Bracket",
    sku: "CNC-BRK",
    category: "Custom Parts",
    supplier: "MetalWorks Ltd",
    unitCost: 65.0,
    lastPurchasePrice: 67.0,
    leadTimeDays: 18,
    minOrderQty: 25,
    reorderPoint: 50,
  },
];

const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "r1",
    receiptNumber: "REC-001",
    poReference: "PO-2026-001",
    vendor: "Acme Supplies",
    dateReceived: "2026-03-14",
    items: 5,
    qualityCheck: "Pass",
    notes: "All items in good condition",
  },
  {
    id: "r2",
    receiptNumber: "REC-002",
    poReference: "PO-2026-002",
    vendor: "Global Components",
    dateReceived: "2026-03-18",
    items: 3,
    qualityCheck: "Pass",
    notes: "Received ahead of schedule",
  },
  {
    id: "r3",
    receiptNumber: "REC-003",
    poReference: "PO-2026-003",
    vendor: "TechParts Inc",
    dateReceived: "2026-03-20",
    items: 6,
    qualityCheck: "Pending",
    notes: "2 items still pending QC inspection",
  },
  {
    id: "r4",
    receiptNumber: "REC-004",
    poReference: "PO-2026-005",
    vendor: "Precision Tools",
    dateReceived: "2026-03-19",
    items: 4,
    qualityCheck: "Fail",
    notes: "2 drill bits out of spec - return initiated",
  },
  {
    id: "r5",
    receiptNumber: "REC-005",
    poReference: "PO-2026-006",
    vendor: "EcoPackaging Ltd",
    dateReceived: "2026-03-21",
    items: 4,
    qualityCheck: "Pass",
    notes: "Standard packaging order",
  },
  {
    id: "r6",
    receiptNumber: "REC-006",
    poReference: "PO-2026-009",
    vendor: "MetalWorks Ltd",
    dateReceived: "2026-03-22",
    items: 4,
    qualityCheck: "Pending",
    notes: "Awaiting inspection team",
  },
];

const MOCK_BILLS: Bill[] = [
  {
    id: "b1",
    billNumber: "BILL-001",
    vendor: "Acme Supplies",
    poReference: "PO-2026-001",
    amount: 12500,
    dueDate: "2026-04-01",
    status: "Paid",
  },
  {
    id: "b2",
    billNumber: "BILL-002",
    vendor: "Global Components",
    poReference: "PO-2026-002",
    amount: 8700,
    dueDate: "2026-04-05",
    status: "Received",
  },
  {
    id: "b3",
    billNumber: "BILL-003",
    vendor: "TechParts Inc",
    poReference: "PO-2026-003",
    amount: 23400,
    dueDate: "2026-03-20",
    status: "Overdue",
  },
  {
    id: "b4",
    billNumber: "BILL-004",
    vendor: "Precision Tools",
    poReference: "PO-2026-005",
    amount: 15800,
    dueDate: "2026-04-10",
    status: "Received",
  },
  {
    id: "b5",
    billNumber: "BILL-005",
    vendor: "EcoPackaging Ltd",
    poReference: "PO-2026-006",
    amount: 4200,
    dueDate: "2026-04-15",
    status: "Draft",
  },
  {
    id: "b6",
    billNumber: "BILL-006",
    vendor: "MetalWorks Ltd",
    poReference: "PO-2026-009",
    amount: 7450,
    dueDate: "2026-04-08",
    status: "Received",
  },
];

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function poStatusStyle(s: POStatus): { bg: string; color: string } {
  const map: Record<POStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Sent: { bg: "#EFF6FF", color: "#1E40AF" },
    Confirmed: { bg: "#F5F3FF", color: "#5B21B6" },
    Received: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Cancelled: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function vendorStatusStyle(s: VendorStatus): { bg: string; color: string } {
  const map: Record<VendorStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Inactive: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Pending: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
  };
  return map[s];
}

function qcStyle(r: QCResult): { bg: string; color: string } {
  const map: Record<QCResult, { bg: string; color: string }> = {
    Pass: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Fail: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Pending: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
  };
  return map[r];
}

function billStatusStyle(s: BillStatus): { bg: string; color: string } {
  const map: Record<BillStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Received: { bg: "#EFF6FF", color: "#1E40AF" },
    Paid: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Overdue: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    "\u2605".repeat(full) + (half ? "\u00BD" : "") + "\u2606".repeat(empty)
  );
}

// ── Shared UI Components ─────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
  count,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
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
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: 10,
            background: active ? "rgba(108,71,255,0.12)" : "#F0F0F8",
            color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
          }}
        >
          {count}
        </span>
      )}
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

function KPICard({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent: string }>) {
  return (
    <div
      style={{
        background: "var(--table-header-bg)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          height: 3,
          background: accent,
          borderRadius: 2,
          width: "40%",
          marginTop: 6,
        }}
      />
    </div>
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
    <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-tertiary)",
        }}
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path
          d="M16 16l4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "7px 10px 7px 32px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          fontSize: 12,
          color: "var(--text-primary)",
          background: "var(--content-bg)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
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
        padding: "7px 14px",
        background: "var(--vyne-purple)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      + {label}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "7px 10px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        fontSize: 12,
        color: "var(--text-primary)",
        background: "var(--content-bg)",
        cursor: "pointer",
        outline: "none",
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textAlign: "left",
  borderBottom: "1px solid var(--content-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 16px",
  fontSize: 12,
  color: "var(--text-primary)",
};

// ── Purchase Orders Tab ──────────────────────────────────────────
function PurchaseOrdersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = MOCK_POS.filter((po) => {
    const matchSearch =
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPOs = MOCK_POS.length;
  const pendingReceipt = MOCK_POS.filter(
    (po) => po.status === "Sent" || po.status === "Confirmed",
  ).length;
  const totalSpent = MOCK_POS.filter((po) => po.status === "Received").reduce(
    (sum, po) => sum + po.amount,
    0,
  );
  const avgLeadTime = Math.round(
    MOCK_POS.reduce((sum, po) => {
      const d1 = new Date(po.date).getTime();
      const d2 = new Date(po.expectedDelivery).getTime();
      return sum + (d2 - d1) / 86400000;
    }, 0) / MOCK_POS.length,
  );

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPICard
          label="Total POs"
          value={String(totalPOs)}
          accent="var(--vyne-purple)"
        />
        <KPICard
          label="Pending Receipt"
          value={String(pendingReceipt)}
          accent="var(--status-warning)"
        />
        <KPICard
          label="Total Spent"
          value={fmt(totalSpent)}
          accent="var(--status-success)"
        />
        <KPICard
          label="Avg Lead Time"
          value={`${avgLeadTime} days`}
          accent="var(--status-info)"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search POs..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Draft", "Sent", "Confirmed", "Received", "Cancelled"]}
          allLabel="All Statuses"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="purchase-orders"
            columns={[
              { key: "poNumber" as never, header: "PO #" },
              { key: "vendor" as never, header: "Vendor" },
              { key: "date" as never, header: "Date" },
              { key: "amount" as never, header: "Amount" },
              { key: "status" as never, header: "Status" },
            ]}
          />
          <NewButton label="New PO" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "PO #",
                "Vendor",
                "Date",
                "Expected Delivery",
                "Amount",
                "Items",
                "Status",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((po) => {
              const st = poStatusStyle(po.status);
              return (
                <tr
                  key={po.id}
                  style={{
                    borderBottom: "1px solid #F0F0F8",
                    cursor: "pointer",
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {po.poNumber}
                  </td>
                  <td style={tdStyle}>{po.vendor}</td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {po.date}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {po.expectedDelivery}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {fmt(po.amount)}
                  </td>
                  <td style={tdStyle}>{po.itemsCount}</td>
                  <td style={tdStyle}>
                    <StatusBadge
                      label={po.status}
                      bg={st.bg}
                      color={st.color}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No purchase orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Vendors Tab ──────────────────────────────────────────────────
function VendorsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = MOCK_VENDORS.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search vendors..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Active", "Inactive", "Pending"]}
          allLabel="All Statuses"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="vendors"
            columns={[
              { key: "name" as never, header: "Name" },
              { key: "contact" as never, header: "Contact" },
              { key: "email" as never, header: "Email" },
              { key: "status" as never, header: "Status" },
            ]}
          />
          <NewButton label="New Vendor" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Name",
                "Contact",
                "Email",
                "Phone",
                "Products Supplied",
                "Total Purchased",
                "Rating",
                "Status",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const st = vendorStatusStyle(v.status);
              return (
                <tr key={v.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{v.name}</td>
                  <td style={tdStyle}>{v.contact}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--vyne-purple)",
                      fontSize: 11,
                    }}
                  >
                    {v.email}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {v.phone}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {v.productsSupplied.map((p) => (
                        <span
                          key={p}
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            background: "var(--content-secondary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {fmt(v.totalPurchased)}
                  </td>
                  <td
                    style={{ ...tdStyle, color: "#F59E0B", letterSpacing: 1 }}
                  >
                    {renderStars(v.rating)}
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {v.rating.toFixed(1)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge label={v.status} bg={st.bg} color={st.color} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Products Tab ─────────────────────────────────────────────────
function ProductsTab() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = [...new Set(MOCK_PRODUCTS.map((p) => p.category))];

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products..."
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categories}
          allLabel="All Categories"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="purchase-products"
            columns={[
              { key: "name" as never, header: "Name" },
              { key: "sku" as never, header: "SKU" },
              { key: "category" as never, header: "Category" },
              { key: "supplier" as never, header: "Supplier" },
              { key: "unitCost" as never, header: "Unit Cost" },
            ]}
          />
          <NewButton label="New Product" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Name",
                "SKU",
                "Category",
                "Supplier",
                "Unit Cost",
                "Last Price",
                "Lead Time",
                "Min Order",
                "Reorder Pt",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {p.sku}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      background: "var(--content-secondary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.category}
                  </span>
                </td>
                <td style={tdStyle}>{p.supplier}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  ${p.unitCost.toFixed(2)}
                </td>
                <td style={tdStyle}>${p.lastPurchasePrice.toFixed(2)}</td>
                <td style={tdStyle}>{p.leadTimeDays} days</td>
                <td style={tdStyle}>{p.minOrderQty}</td>
                <td style={tdStyle}>{p.reorderPoint}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Receipts Tab ─────────────────────────────────────────────────
function ReceiptsTab() {
  const [search, setSearch] = useState("");
  const [qcFilter, setQcFilter] = useState("");

  const filtered = MOCK_RECEIPTS.filter((r) => {
    const matchSearch =
      r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.vendor.toLowerCase().includes(search.toLowerCase()) ||
      r.poReference.toLowerCase().includes(search.toLowerCase());
    const matchQc = qcFilter === "" || r.qualityCheck === qcFilter;
    return matchSearch && matchQc;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search receipts..."
        />
        <FilterSelect
          value={qcFilter}
          onChange={setQcFilter}
          options={["Pass", "Fail", "Pending"]}
          allLabel="All QC Results"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="receipts"
            columns={[
              { key: "receiptNumber" as never, header: "Receipt #" },
              { key: "poReference" as never, header: "PO Reference" },
              { key: "vendor" as never, header: "Vendor" },
              { key: "dateReceived" as never, header: "Date Received" },
              { key: "qualityCheck" as never, header: "QC Result" },
            ]}
          />
          <NewButton label="New Receipt" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Receipt #",
                "PO Reference",
                "Vendor",
                "Date Received",
                "Items",
                "Quality Check",
                "Notes",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const st = qcStyle(r.qualityCheck);
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {r.receiptNumber}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {r.poReference}
                  </td>
                  <td style={tdStyle}>{r.vendor}</td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {r.dateReceived}
                  </td>
                  <td style={tdStyle}>{r.items}</td>
                  <td style={tdStyle}>
                    <StatusBadge
                      label={r.qualityCheck}
                      bg={st.bg}
                      color={st.color}
                    />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                      maxWidth: 200,
                    }}
                  >
                    {r.notes}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No receipts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bills Tab ────────────────────────────────────────────────────
function BillsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = MOCK_BILLS.filter((b) => {
    const matchSearch =
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.vendor.toLowerCase().includes(search.toLowerCase()) ||
      b.poReference.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search bills..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Draft", "Received", "Paid", "Overdue"]}
          allLabel="All Statuses"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="bills"
            columns={[
              { key: "billNumber" as never, header: "Bill #" },
              { key: "vendor" as never, header: "Vendor" },
              { key: "amount" as never, header: "Amount" },
              { key: "status" as never, header: "Status" },
            ]}
          />
          <NewButton label="New Bill" onClick={() => {}} />
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Bill #",
                "Vendor",
                "PO Reference",
                "Amount",
                "Due Date",
                "Status",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const st = billStatusStyle(b.status);
              return (
                <tr key={b.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {b.billNumber}
                  </td>
                  <td style={tdStyle}>{b.vendor}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {b.poReference}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {fmt(b.amount)}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {b.dueDate}
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge label={b.status} bg={st.bg} color={st.color} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports Tab ──────────────────────────────────────────────────
function ReportsTab() {
  const totalSpend = MOCK_POS.reduce((sum, po) => sum + po.amount, 0);

  // Top vendor by purchase amount
  const vendorTotals = MOCK_POS.reduce<Record<string, number>>((acc, po) => {
    acc[po.vendor] = (acc[po.vendor] || 0) + po.amount;
    return acc;
  }, {});
  const topVendor = Object.entries(vendorTotals).sort((a, b) => b[1] - a[1])[0];

  const avgLeadTime = Math.round(
    MOCK_POS.reduce((sum, po) => {
      const d1 = new Date(po.date).getTime();
      const d2 = new Date(po.expectedDelivery).getTime();
      return sum + (d2 - d1) / 86400000;
    }, 0) / MOCK_POS.length,
  );

  const receivedCount = MOCK_POS.filter(
    (po) => po.status === "Received",
  ).length;
  const totalDeliverable = MOCK_POS.filter(
    (po) => po.status !== "Draft" && po.status !== "Cancelled",
  ).length;
  const onTimePercent =
    totalDeliverable > 0
      ? Math.round((receivedCount / totalDeliverable) * 100)
      : 0;

  // Spend by category from products
  const categorySpend: Record<string, number> = {};
  for (const product of MOCK_PRODUCTS) {
    categorySpend[product.category] =
      (categorySpend[product.category] || 0) +
      product.unitCost * product.minOrderQty;
  }
  const maxCategorySpend = Math.max(...Object.values(categorySpend));

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Total Spend"
          value={fmt(totalSpend)}
          accent="var(--vyne-purple)"
        />
        <KPICard
          label="Top Vendor"
          value={topVendor ? topVendor[0] : "N/A"}
          accent="var(--status-info)"
        />
        <KPICard
          label="Avg Lead Time"
          value={`${avgLeadTime} days`}
          accent="var(--status-warning)"
        />
        <KPICard
          label="On-time Delivery %"
          value={`${onTimePercent}%`}
          accent="var(--status-success)"
        />
      </div>

      {/* Spend by Category Chart */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Spend by Category
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(categorySpend)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, spend]) => (
              <div key={cat}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {cat}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmt(spend)}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "var(--content-secondary)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(spend / maxCategorySpend) * 100}%`,
                      background:
                        "linear-gradient(90deg, var(--vyne-purple), #8B68FF)",
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Vendor Spend Breakdown */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: 20,
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Vendor Spend Breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(vendorTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([vendor, spend]) => {
              const maxVendorSpend = Math.max(...Object.values(vendorTotals));
              return (
                <div key={vendor}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {vendor}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {fmt(spend)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "var(--content-secondary)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(spend / maxVendorSpend) * 100}%`,
                        background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ── Main Purchase Page ───────────────────────────────────────────
export default function PurchasePage() {
  const [activeTab, setActiveTab] = useState<PurchaseTab>("orders");
  const [, setTick] = useState(0);

  useEffect(() => {
    erpApi
      .listOrders({ status: "draft" })
      .then((r) => {
        if (r.data?.length) {
          MOCK_POS = r.data.map((o, i) => ({
            id: o.id,
            poNumber: o.orderNumber,
            vendor: o.customerName,
            date: o.createdAt.slice(0, 10),
            expectedDelivery: o.createdAt.slice(0, 10),
            amount: o.total,
            status: (
              o.status === "delivered"
                ? "Received"
                : o.status === "shipped"
                  ? "Confirmed"
                  : o.status === "confirmed"
                    ? "Sent"
                    : o.status === "cancelled"
                      ? "Cancelled"
                      : "Draft"
            ) as POStatus,
            itemsCount: o.lines?.length ?? i + 1,
          }));
          setTick((t) => t + 1);
        }
      })
      .catch(() => {});
    erpApi
      .listSuppliers()
      .then((r) => {
        if (r.data?.length) {
          MOCK_VENDORS = r.data.map((s) => ({
            id: s.id,
            name: s.name,
            contact: s.contactName ?? s.name,
            email: s.email ?? "",
            phone: s.phone ?? "",
            productsSupplied: [],
            totalPurchased: 0,
            rating: 4,
            status: (s.status === "inactive" ? "Inactive" : "Active") as VendorStatus,
          }));
          setTick((t) => t + 1);
        }
      })
      .catch(() => {});
  }, []);

  function renderTab() {
    switch (activeTab) {
      case "orders":
        return <PurchaseOrdersTab />;
      case "vendors":
        return <VendorsTab />;
      case "products":
        return <ProductsTab />;
      case "receipts":
        return <ReceiptsTab />;
      case "bills":
        return <BillsTab />;
      case "reports":
        return <ReportsTab />;
    }
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1400,
        margin: "0 auto",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Purchase
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Manage purchase orders, vendors, products, receipts and bills
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--content-border)",
          marginBottom: 20,
        }}
      >
        <TabBtn
          label="Purchase Orders"
          active={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
          count={MOCK_POS.length}
        />
        <TabBtn
          label="Vendors"
          active={activeTab === "vendors"}
          onClick={() => setActiveTab("vendors")}
          count={MOCK_VENDORS.length}
        />
        <TabBtn
          label="Products"
          active={activeTab === "products"}
          onClick={() => setActiveTab("products")}
          count={MOCK_PRODUCTS.length}
        />
        <TabBtn
          label="Receipts"
          active={activeTab === "receipts"}
          onClick={() => setActiveTab("receipts")}
          count={MOCK_RECEIPTS.length}
        />
        <TabBtn
          label="Bills"
          active={activeTab === "bills"}
          onClick={() => setActiveTab("bills")}
          count={MOCK_BILLS.length}
        />
        <TabBtn
          label="Reports"
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
      </div>

      {/* Active Tab Content */}
      {renderTab()}
    </div>
  );
}
