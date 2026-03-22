"use client";

import { useState } from "react";
import { ExportButton } from "@/components/shared/ExportButton";

// ── Types ────────────────────────────────────────────────────────
type MfgTab =
  | "bom"
  | "orders"
  | "workcenters"
  | "operations"
  | "qc"
  | "reports";

type BOMStatus = "Active" | "Draft" | "Obsolete";
type MOStatus = "Draft" | "Confirmed" | "In Progress" | "Done" | "Cancelled";
type WCStatus = "Active" | "Maintenance" | "Offline";
type QCResult = "Pass" | "Fail" | "Pending";

interface BOMComponent {
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface BillOfMaterials {
  id: string;
  name: string;
  product: string;
  componentsCount: number;
  components: BOMComponent[];
  operations: number;
  cost: number;
  status: BOMStatus;
}

interface ManufacturingOrder {
  id: string;
  moNumber: string;
  product: string;
  quantity: number;
  bom: string;
  startDate: string;
  endDate: string;
  status: MOStatus;
  assignedTo: string;
}

interface WorkCenter {
  id: string;
  name: string;
  code: string;
  capacity: number;
  operatingCostHr: number;
  currentLoad: number;
  status: WCStatus;
}

interface Operation {
  id: string;
  name: string;
  workCenter: string;
  durationMin: number;
  laborCost: number;
  description: string;
}

interface QualityCheck {
  id: string;
  checkNumber: string;
  product: string;
  moReference: string;
  inspector: string;
  result: QCResult;
  date: string;
  notes: string;
}

// ── Mock Data ────────────────────────────────────────────────────
const MOCK_BOMS: BillOfMaterials[] = [
  {
    id: "bom1",
    name: "Widget Assembly A",
    product: "Widget Pro",
    componentsCount: 6,
    operations: 4,
    cost: 145.5,
    status: "Active",
    components: [
      { name: "Steel Bar 20mm", quantity: 2, unit: "pcs", cost: 25.0 },
      { name: "Circuit Board v3", quantity: 1, unit: "pcs", cost: 45.0 },
      { name: "Servo Motor SM-200", quantity: 1, unit: "pcs", cost: 128.0 },
      { name: "Fasteners Kit", quantity: 1, unit: "set", cost: 8.5 },
      { name: "Polymer Resin PX-5", quantity: 0.5, unit: "kg", cost: 16.0 },
      { name: "Wiring Harness", quantity: 1, unit: "pcs", cost: 12.0 },
    ],
  },
  {
    id: "bom2",
    name: "Sensor Module B",
    product: "TempSense X1",
    componentsCount: 4,
    operations: 3,
    cost: 89.2,
    status: "Active",
    components: [
      { name: "Temperature Sensor TS-X", quantity: 2, unit: "pcs", cost: 44.8 },
      { name: "Circuit Board v3", quantity: 1, unit: "pcs", cost: 45.0 },
      { name: "Enclosure Small", quantity: 1, unit: "pcs", cost: 6.4 },
      { name: "Connector Cable", quantity: 1, unit: "pcs", cost: 3.0 },
    ],
  },
  {
    id: "bom3",
    name: "Motor Controller Unit",
    product: "MCU-500",
    componentsCount: 5,
    operations: 5,
    cost: 312.0,
    status: "Active",
    components: [
      { name: "Controller Board X5", quantity: 1, unit: "pcs", cost: 95.0 },
      { name: "Power Module", quantity: 1, unit: "pcs", cost: 120.0 },
      { name: "Heat Sink Alu", quantity: 2, unit: "pcs", cost: 18.0 },
      { name: "Capacitor Array", quantity: 1, unit: "set", cost: 45.0 },
      { name: "Enclosure Medium", quantity: 1, unit: "pcs", cost: 34.0 },
    ],
  },
  {
    id: "bom4",
    name: "Packaging Kit Standard",
    product: "PKG-STD",
    componentsCount: 3,
    operations: 2,
    cost: 8.5,
    status: "Active",
    components: [
      { name: "Corrugated Box (Large)", quantity: 1, unit: "pcs", cost: 2.1 },
      { name: "Foam Insert", quantity: 2, unit: "pcs", cost: 3.2 },
      { name: "Labels Set", quantity: 1, unit: "set", cost: 0.8 },
    ],
  },
  {
    id: "bom5",
    name: "Custom Bracket Assembly",
    product: "BRKT-CNC",
    componentsCount: 4,
    operations: 3,
    cost: 198.0,
    status: "Draft",
    components: [
      { name: "CNC Milled Bracket", quantity: 2, unit: "pcs", cost: 130.0 },
      { name: "Steel Bar 20mm", quantity: 1, unit: "pcs", cost: 12.5 },
      { name: "Fasteners Kit", quantity: 1, unit: "set", cost: 8.5 },
      {
        name: "Industrial Adhesive GA-7",
        quantity: 0.2,
        unit: "kg",
        cost: 3.78,
      },
    ],
  },
  {
    id: "bom6",
    name: "Display Panel v2",
    product: "DSP-V2",
    componentsCount: 5,
    operations: 4,
    cost: 267.0,
    status: "Active",
    components: [
      { name: "LCD Screen 7in", quantity: 1, unit: "pcs", cost: 145.0 },
      { name: "Touch Digitizer", quantity: 1, unit: "pcs", cost: 62.0 },
      { name: "Driver Board", quantity: 1, unit: "pcs", cost: 38.0 },
      { name: "Ribbon Cable", quantity: 2, unit: "pcs", cost: 4.0 },
      { name: "Bezel Frame", quantity: 1, unit: "pcs", cost: 18.0 },
    ],
  },
  {
    id: "bom7",
    name: "Power Supply Unit",
    product: "PSU-120W",
    componentsCount: 6,
    operations: 4,
    cost: 72.4,
    status: "Obsolete",
    components: [
      { name: "Transformer 120W", quantity: 1, unit: "pcs", cost: 28.0 },
      { name: "Rectifier Bridge", quantity: 1, unit: "pcs", cost: 5.5 },
      { name: "Filter Capacitor", quantity: 4, unit: "pcs", cost: 12.0 },
      { name: "PCB Board", quantity: 1, unit: "pcs", cost: 15.0 },
      { name: "Cooling Fan 40mm", quantity: 1, unit: "pcs", cost: 6.9 },
      { name: "Metal Case", quantity: 1, unit: "pcs", cost: 5.0 },
    ],
  },
  {
    id: "bom8",
    name: "Actuator Assembly",
    product: "ACT-LIN",
    componentsCount: 5,
    operations: 3,
    cost: 215.0,
    status: "Draft",
    components: [
      { name: "Linear Motor", quantity: 1, unit: "pcs", cost: 145.0 },
      { name: "Guide Rail", quantity: 2, unit: "pcs", cost: 32.0 },
      { name: "End Stop Sensor", quantity: 2, unit: "pcs", cost: 12.0 },
      { name: "Mounting Plate", quantity: 1, unit: "pcs", cost: 18.0 },
      { name: "Cable Carrier", quantity: 1, unit: "pcs", cost: 8.0 },
    ],
  },
];

const MOCK_MOS: ManufacturingOrder[] = [
  {
    id: "mo1",
    moNumber: "MO-2026-001",
    product: "Widget Pro",
    quantity: 50,
    bom: "Widget Assembly A",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    status: "Done",
    assignedTo: "Team Alpha",
  },
  {
    id: "mo2",
    moNumber: "MO-2026-002",
    product: "TempSense X1",
    quantity: 200,
    bom: "Sensor Module B",
    startDate: "2026-03-05",
    endDate: "2026-03-12",
    status: "Done",
    assignedTo: "Team Beta",
  },
  {
    id: "mo3",
    moNumber: "MO-2026-003",
    product: "MCU-500",
    quantity: 30,
    bom: "Motor Controller Unit",
    startDate: "2026-03-08",
    endDate: "2026-03-20",
    status: "In Progress",
    assignedTo: "Team Alpha",
  },
  {
    id: "mo4",
    moNumber: "MO-2026-004",
    product: "PKG-STD",
    quantity: 500,
    bom: "Packaging Kit Standard",
    startDate: "2026-03-10",
    endDate: "2026-03-14",
    status: "Done",
    assignedTo: "Team Charlie",
  },
  {
    id: "mo5",
    moNumber: "MO-2026-005",
    product: "Widget Pro",
    quantity: 100,
    bom: "Widget Assembly A",
    startDate: "2026-03-12",
    endDate: "2026-03-25",
    status: "In Progress",
    assignedTo: "Team Alpha",
  },
  {
    id: "mo6",
    moNumber: "MO-2026-006",
    product: "DSP-V2",
    quantity: 75,
    bom: "Display Panel v2",
    startDate: "2026-03-15",
    endDate: "2026-03-28",
    status: "Confirmed",
    assignedTo: "Team Beta",
  },
  {
    id: "mo7",
    moNumber: "MO-2026-007",
    product: "BRKT-CNC",
    quantity: 40,
    bom: "Custom Bracket Assembly",
    startDate: "2026-03-18",
    endDate: "2026-04-01",
    status: "Draft",
    assignedTo: "Team Delta",
  },
  {
    id: "mo8",
    moNumber: "MO-2026-008",
    product: "ACT-LIN",
    quantity: 25,
    bom: "Actuator Assembly",
    startDate: "2026-03-20",
    endDate: "2026-04-05",
    status: "Draft",
    assignedTo: "Team Alpha",
  },
  {
    id: "mo9",
    moNumber: "MO-2026-009",
    product: "TempSense X1",
    quantity: 150,
    bom: "Sensor Module B",
    startDate: "2026-03-22",
    endDate: "2026-04-02",
    status: "Confirmed",
    assignedTo: "Team Charlie",
  },
  {
    id: "mo10",
    moNumber: "MO-2026-010",
    product: "MCU-500",
    quantity: 60,
    bom: "Motor Controller Unit",
    startDate: "2026-03-25",
    endDate: "2026-04-10",
    status: "Cancelled",
    assignedTo: "Team Beta",
  },
];

const MOCK_WORK_CENTERS: WorkCenter[] = [
  {
    id: "wc1",
    name: "CNC Machining Bay",
    code: "WC-CNC",
    capacity: 8,
    operatingCostHr: 85,
    currentLoad: 78,
    status: "Active",
  },
  {
    id: "wc2",
    name: "Electronics Assembly",
    code: "WC-ELC",
    capacity: 12,
    operatingCostHr: 65,
    currentLoad: 92,
    status: "Active",
  },
  {
    id: "wc3",
    name: "Quality Testing Lab",
    code: "WC-QTL",
    capacity: 6,
    operatingCostHr: 55,
    currentLoad: 45,
    status: "Active",
  },
  {
    id: "wc4",
    name: "Packaging Station",
    code: "WC-PKG",
    capacity: 10,
    operatingCostHr: 35,
    currentLoad: 60,
    status: "Active",
  },
  {
    id: "wc5",
    name: "Paint & Coating Booth",
    code: "WC-PCB",
    capacity: 4,
    operatingCostHr: 70,
    currentLoad: 0,
    status: "Maintenance",
  },
  {
    id: "wc6",
    name: "Welding Shop",
    code: "WC-WLD",
    capacity: 6,
    operatingCostHr: 75,
    currentLoad: 0,
    status: "Offline",
  },
];

const MOCK_OPERATIONS: Operation[] = [
  {
    id: "op1",
    name: "CNC Milling",
    workCenter: "CNC Machining Bay",
    durationMin: 45,
    laborCost: 63.75,
    description:
      "Precision milling of metal parts per blueprint specifications",
  },
  {
    id: "op2",
    name: "PCB Soldering",
    workCenter: "Electronics Assembly",
    durationMin: 30,
    laborCost: 32.5,
    description: "Surface-mount and through-hole soldering of circuit boards",
  },
  {
    id: "op3",
    name: "Component Assembly",
    workCenter: "Electronics Assembly",
    durationMin: 60,
    laborCost: 65.0,
    description: "Mechanical and electronic component integration and wiring",
  },
  {
    id: "op4",
    name: "Quality Inspection",
    workCenter: "Quality Testing Lab",
    durationMin: 20,
    laborCost: 18.33,
    description:
      "Dimensional and functional quality inspection per QC standards",
  },
  {
    id: "op5",
    name: "Burn-in Testing",
    workCenter: "Quality Testing Lab",
    durationMin: 120,
    laborCost: 110.0,
    description: "Extended operational testing under stress conditions",
  },
  {
    id: "op6",
    name: "Packaging & Labeling",
    workCenter: "Packaging Station",
    durationMin: 15,
    laborCost: 8.75,
    description: "Final packaging with protective materials and labeling",
  },
  {
    id: "op7",
    name: "Surface Coating",
    workCenter: "Paint & Coating Booth",
    durationMin: 40,
    laborCost: 46.67,
    description: "Application of protective or decorative coatings",
  },
  {
    id: "op8",
    name: "MIG Welding",
    workCenter: "Welding Shop",
    durationMin: 35,
    laborCost: 43.75,
    description: "MIG welding of metal frame assemblies and brackets",
  },
];

const MOCK_QC_CHECKS: QualityCheck[] = [
  {
    id: "qc1",
    checkNumber: "QC-001",
    product: "Widget Pro",
    moReference: "MO-2026-001",
    inspector: "Raj Patel",
    result: "Pass",
    date: "2026-03-09",
    notes: "All dimensions within tolerance",
  },
  {
    id: "qc2",
    checkNumber: "QC-002",
    product: "Widget Pro",
    moReference: "MO-2026-001",
    inspector: "Emily Zhou",
    result: "Pass",
    date: "2026-03-09",
    notes: "Electrical tests passed",
  },
  {
    id: "qc3",
    checkNumber: "QC-003",
    product: "TempSense X1",
    moReference: "MO-2026-002",
    inspector: "Raj Patel",
    result: "Pass",
    date: "2026-03-11",
    notes: "Calibration verified within 0.1C accuracy",
  },
  {
    id: "qc4",
    checkNumber: "QC-004",
    product: "TempSense X1",
    moReference: "MO-2026-002",
    inspector: "Emily Zhou",
    result: "Fail",
    date: "2026-03-11",
    notes: "3 units failed waterproof seal test - rework required",
  },
  {
    id: "qc5",
    checkNumber: "QC-005",
    product: "MCU-500",
    moReference: "MO-2026-003",
    inspector: "Raj Patel",
    result: "Pending",
    date: "2026-03-18",
    notes: "Awaiting burn-in test completion",
  },
  {
    id: "qc6",
    checkNumber: "QC-006",
    product: "PKG-STD",
    moReference: "MO-2026-004",
    inspector: "Carlos Rivera",
    result: "Pass",
    date: "2026-03-13",
    notes: "Drop test and compression test passed",
  },
  {
    id: "qc7",
    checkNumber: "QC-007",
    product: "Widget Pro",
    moReference: "MO-2026-005",
    inspector: "Emily Zhou",
    result: "Pending",
    date: "2026-03-20",
    notes: "First batch sampling in progress",
  },
  {
    id: "qc8",
    checkNumber: "QC-008",
    product: "MCU-500",
    moReference: "MO-2026-003",
    inspector: "Carlos Rivera",
    result: "Fail",
    date: "2026-03-19",
    notes: "Thermal runaway detected at 85C - design revision needed",
  },
];

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function bomStatusStyle(s: BOMStatus): { bg: string; color: string } {
  const map: Record<BOMStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Obsolete: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function moStatusStyle(s: MOStatus): { bg: string; color: string } {
  const map: Record<MOStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Confirmed: { bg: "#EFF6FF", color: "#1E40AF" },
    "In Progress": { bg: "#F5F3FF", color: "#5B21B6" },
    Done: { bg: "#F0FDF4", color: "#166534" },
    Cancelled: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function wcStatusStyle(s: WCStatus): { bg: string; color: string } {
  const map: Record<WCStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Maintenance: { bg: "#FFFBEB", color: "#92400E" },
    Offline: { bg: "#FEF2F2", color: "#991B1B" },
  };
  return map[s];
}

function qcStyle(r: QCResult): { bg: string; color: string } {
  const map: Record<QCResult, { bg: string; color: string }> = {
    Pass: { bg: "#F0FDF4", color: "#166534" },
    Fail: { bg: "#FEF2F2", color: "#991B1B" },
    Pending: { bg: "#FFFBEB", color: "#92400E" },
  };
  return map[r];
}

function loadColor(load: number): string {
  if (load >= 80) return "#EF4444";
  if (load >= 50) return "#F59E0B";
  return "#22C55E";
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
        background: "#F7F7FB",
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

// ── Bill of Materials Tab ────────────────────────────────────────
function BOMTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedBOM, setExpandedBOM] = useState<string | null>(null);

  const filtered = MOCK_BOMS.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.product.toLowerCase().includes(search.toLowerCase());
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
          placeholder="Search BOMs..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Active", "Draft", "Obsolete"]}
          allLabel="All Statuses"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="bill-of-materials"
            columns={[
              { key: "name" as never, header: "BOM Name" },
              { key: "product" as never, header: "Product" },
              { key: "componentsCount" as never, header: "Components" },
              { key: "cost" as never, header: "Cost" },
              { key: "status" as never, header: "Status" },
            ]}
          />
          <NewButton label="New BOM" onClick={() => {}} />
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
            <tr style={{ background: "#FAFAFE" }}>
              {[
                "",
                "BOM Name",
                "Product",
                "Components",
                "Operations",
                "Cost",
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
              const st = bomStatusStyle(b.status);
              const isExpanded = expandedBOM === b.id;
              return (
                <>
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: "1px solid #F0F0F8",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedBOM(isExpanded ? null : b.id)}
                  >
                    <td style={{ ...tdStyle, width: 32, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.15s",
                          color: "var(--text-tertiary)",
                          fontSize: 12,
                        }}
                      >
                        &#9654;
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{b.name}</td>
                    <td style={tdStyle}>{b.product}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          background: "rgba(108,71,255,0.08)",
                          color: "var(--vyne-purple)",
                          fontWeight: 600,
                        }}
                      >
                        {b.componentsCount} parts
                      </span>
                    </td>
                    <td style={tdStyle}>{b.operations}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      ${b.cost.toFixed(2)}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge
                        label={b.status}
                        bg={st.bg}
                        color={st.color}
                      />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${b.id}-detail`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div
                          style={{
                            background: "#FAFAFE",
                            padding: "12px 24px 12px 56px",
                            borderBottom: "1px solid var(--content-border)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--text-tertiary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 8,
                            }}
                          >
                            Component List
                          </div>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr>
                                {["Component", "Quantity", "Unit", "Cost"].map(
                                  (h) => (
                                    <th
                                      key={h}
                                      style={{
                                        ...thStyle,
                                        background: "transparent",
                                        fontSize: 10,
                                        padding: "6px 12px",
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {b.components.map((c, i) => (
                                <tr
                                  key={i}
                                  style={{
                                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    {c.name}
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    {c.quantity}
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      color: "var(--text-tertiary)",
                                    }}
                                  >
                                    {c.unit}
                                  </td>
                                  <td
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    ${c.cost.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
                  No BOMs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Manufacturing Orders Tab ─────────────────────────────────────
function ManufacturingOrdersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const filtered = MOCK_MOS.filter((mo) => {
    const matchSearch =
      mo.moNumber.toLowerCase().includes(search.toLowerCase()) ||
      mo.product.toLowerCase().includes(search.toLowerCase()) ||
      mo.assignedTo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "" || mo.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const kanbanStatuses: MOStatus[] = [
    "Draft",
    "Confirmed",
    "In Progress",
    "Done",
    "Cancelled",
  ];

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
          placeholder="Search orders..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Draft", "Confirmed", "In Progress", "Done", "Cancelled"]}
          allLabel="All Statuses"
        />
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#F0F0F8",
            borderRadius: 8,
            padding: 2,
          }}
        >
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              background:
                viewMode === "table" ? "var(--content-bg)" : "transparent",
              color:
                viewMode === "table"
                  ? "var(--vyne-purple)"
                  : "var(--text-tertiary)",
              boxShadow:
                viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              background:
                viewMode === "kanban" ? "var(--content-bg)" : "transparent",
              color:
                viewMode === "kanban"
                  ? "var(--vyne-purple)"
                  : "var(--text-tertiary)",
              boxShadow:
                viewMode === "kanban" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Kanban
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="manufacturing-orders"
            columns={[
              { key: "moNumber" as never, header: "MO #" },
              { key: "product" as never, header: "Product" },
              { key: "quantity" as never, header: "Qty" },
              { key: "status" as never, header: "Status" },
              { key: "assignedTo" as never, header: "Assigned To" },
            ]}
          />
          <NewButton label="New MO" onClick={() => {}} />
        </div>
      </div>

      {viewMode === "table" && (
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
              <tr style={{ background: "#FAFAFE" }}>
                {[
                  "MO #",
                  "Product",
                  "Qty",
                  "BOM",
                  "Start Date",
                  "End Date",
                  "Status",
                  "Assigned To",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((mo) => {
                const st = moStatusStyle(mo.status);
                return (
                  <tr key={mo.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        color: "var(--vyne-purple)",
                      }}
                    >
                      {mo.moNumber}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {mo.product}
                    </td>
                    <td style={tdStyle}>{mo.quantity}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {mo.bom}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                      {mo.startDate}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                      {mo.endDate}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge
                        label={mo.status}
                        bg={st.bg}
                        color={st.color}
                      />
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          background: "#F0F0F8",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {mo.assignedTo}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "var(--text-tertiary)",
                      fontSize: 13,
                    }}
                  >
                    No manufacturing orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "kanban" && (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {kanbanStatuses.map((status) => {
            const st = moStatusStyle(status);
            const items = filtered.filter((mo) => mo.status === status);
            return (
              <div
                key={status}
                style={{
                  minWidth: 240,
                  flex: 1,
                  background: "#FAFAFE",
                  borderRadius: 10,
                  padding: 12,
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
                  <StatusBadge label={status} bg={st.bg} color={st.color} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      padding: "1px 6px",
                      background: "#F0F0F8",
                      borderRadius: 8,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {items.map((mo) => (
                    <div
                      key={mo.id}
                      style={{
                        background: "var(--content-bg)",
                        border: "1px solid var(--content-border)",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--vyne-purple)",
                          marginBottom: 4,
                        }}
                      >
                        {mo.moNumber}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: 6,
                        }}
                      >
                        {mo.product}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <span>Qty: {mo.quantity}</span>
                        <span>{mo.assignedTo}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 4,
                        }}
                      >
                        {mo.startDate} - {mo.endDate}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div
                      style={{
                        padding: 16,
                        textAlign: "center",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontStyle: "italic",
                      }}
                    >
                      No orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Work Centers Tab ─────────────────────────────────────────────
function WorkCentersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = MOCK_WORK_CENTERS.filter((wc) => {
    const matchSearch =
      wc.name.toLowerCase().includes(search.toLowerCase()) ||
      wc.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "" || wc.status === statusFilter;
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
          placeholder="Search work centers..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Active", "Maintenance", "Offline"]}
          allLabel="All Statuses"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="work-centers"
            columns={[
              { key: "name" as never, header: "Name" },
              { key: "code" as never, header: "Code" },
              { key: "capacity" as never, header: "Capacity" },
              { key: "status" as never, header: "Status" },
            ]}
          />
          <NewButton label="New Work Center" onClick={() => {}} />
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
            <tr style={{ background: "#FAFAFE" }}>
              {[
                "Name",
                "Code",
                "Capacity",
                "Cost/hr",
                "Current Load",
                "Status",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((wc) => {
              const st = wcStatusStyle(wc.status);
              return (
                <tr key={wc.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{wc.name}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {wc.code}
                  </td>
                  <td style={tdStyle}>{wc.capacity} units/hr</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    ${wc.operatingCostHr}/hr
                  </td>
                  <td style={{ ...tdStyle, minWidth: 160 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 8,
                          background: "#F0F0F8",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${wc.currentLoad}%`,
                            background: loadColor(wc.currentLoad),
                            borderRadius: 4,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: loadColor(wc.currentLoad),
                          minWidth: 32,
                        }}
                      >
                        {wc.currentLoad}%
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge
                      label={wc.status}
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
                  colSpan={6}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No work centers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Operations Tab ───────────────────────────────────────────────
function OperationsTab() {
  const [search, setSearch] = useState("");
  const [wcFilter, setWcFilter] = useState("");

  const workCenters = [...new Set(MOCK_OPERATIONS.map((op) => op.workCenter))];

  const filtered = MOCK_OPERATIONS.filter((op) => {
    const matchSearch =
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.description.toLowerCase().includes(search.toLowerCase());
    const matchWc = wcFilter === "" || op.workCenter === wcFilter;
    return matchSearch && matchWc;
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
          placeholder="Search operations..."
        />
        <FilterSelect
          value={wcFilter}
          onChange={setWcFilter}
          options={workCenters}
          allLabel="All Work Centers"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="operations"
            columns={[
              { key: "name" as never, header: "Operation" },
              { key: "workCenter" as never, header: "Work Center" },
              { key: "durationMin" as never, header: "Duration (min)" },
              { key: "laborCost" as never, header: "Labor Cost" },
            ]}
          />
          <NewButton label="New Operation" onClick={() => {}} />
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
            <tr style={{ background: "#FAFAFE" }}>
              {[
                "Operation Name",
                "Work Center",
                "Duration",
                "Labor Cost",
                "Description",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((op) => (
              <tr key={op.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{op.name}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      background: "rgba(108,71,255,0.08)",
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {op.workCenter}
                  </span>
                </td>
                <td style={tdStyle}>{op.durationMin} min</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  ${op.laborCost.toFixed(2)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    color: "var(--text-tertiary)",
                    fontSize: 11,
                    maxWidth: 300,
                  }}
                >
                  {op.description}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No operations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Quality Control Tab ──────────────────────────────────────────
function QualityControlTab() {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const filtered = MOCK_QC_CHECKS.filter((qc) => {
    const matchSearch =
      qc.checkNumber.toLowerCase().includes(search.toLowerCase()) ||
      qc.product.toLowerCase().includes(search.toLowerCase()) ||
      qc.inspector.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === "" || qc.result === resultFilter;
    return matchSearch && matchResult;
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
          placeholder="Search QC checks..."
        />
        <FilterSelect
          value={resultFilter}
          onChange={setResultFilter}
          options={["Pass", "Fail", "Pending"]}
          allLabel="All Results"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ExportButton
            data={filtered as unknown as Record<string, unknown>[]}
            filename="quality-checks"
            columns={[
              { key: "checkNumber" as never, header: "Check #" },
              { key: "product" as never, header: "Product" },
              { key: "moReference" as never, header: "MO Reference" },
              { key: "inspector" as never, header: "Inspector" },
              { key: "result" as never, header: "Result" },
            ]}
          />
          <NewButton label="New QC Check" onClick={() => {}} />
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
            <tr style={{ background: "#FAFAFE" }}>
              {[
                "Check #",
                "Product",
                "MO Reference",
                "Inspector",
                "Result",
                "Date",
                "Notes",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((qc) => {
              const st = qcStyle(qc.result);
              return (
                <tr key={qc.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {qc.checkNumber}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{qc.product}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {qc.moReference}
                  </td>
                  <td style={tdStyle}>{qc.inspector}</td>
                  <td style={tdStyle}>
                    <StatusBadge
                      label={qc.result}
                      bg={st.bg}
                      color={st.color}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>
                    {qc.date}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--text-tertiary)",
                      fontSize: 11,
                      maxWidth: 250,
                    }}
                  >
                    {qc.notes}
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
                  No QC checks found.
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
function MfgReportsTab() {
  const totalOutput = MOCK_MOS.filter((mo) => mo.status === "Done").reduce(
    (sum, mo) => sum + mo.quantity,
    0,
  );

  const failedChecks = MOCK_QC_CHECKS.filter(
    (qc) => qc.result === "Fail",
  ).length;
  const totalChecks = MOCK_QC_CHECKS.filter(
    (qc) => qc.result !== "Pending",
  ).length;
  const defectRate =
    totalChecks > 0 ? ((failedChecks / totalChecks) * 100).toFixed(1) : "0";

  // Average cycle time (days) for done MOs
  const doneMOs = MOCK_MOS.filter((mo) => mo.status === "Done");
  const avgCycleTime =
    doneMOs.length > 0
      ? Math.round(
          doneMOs.reduce((sum, mo) => {
            const d1 = new Date(mo.startDate).getTime();
            const d2 = new Date(mo.endDate).getTime();
            return sum + (d2 - d1) / 86400000;
          }, 0) / doneMOs.length,
        )
      : 0;

  // Capacity utilization
  const activeWCs = MOCK_WORK_CENTERS.filter((wc) => wc.status === "Active");
  const avgUtilization =
    activeWCs.length > 0
      ? Math.round(
          activeWCs.reduce((sum, wc) => sum + wc.currentLoad, 0) /
            activeWCs.length,
        )
      : 0;

  // Production by product
  const productionByProduct: Record<string, number> = {};
  for (const mo of MOCK_MOS) {
    if (mo.status === "Done" || mo.status === "In Progress") {
      productionByProduct[mo.product] =
        (productionByProduct[mo.product] || 0) + mo.quantity;
    }
  }
  const maxProduction = Math.max(...Object.values(productionByProduct));

  // Monthly production trend (simulated)
  const trendData = [
    { month: "Oct", output: 420 },
    { month: "Nov", output: 510 },
    { month: "Dec", output: 380 },
    { month: "Jan", output: 590 },
    { month: "Feb", output: 640 },
    { month: "Mar", output: totalOutput },
  ];
  const maxTrend = Math.max(...trendData.map((d) => d.output));

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
          label="Total Output"
          value={totalOutput.toLocaleString()}
          accent="var(--vyne-purple)"
        />
        <KPICard
          label="Defect Rate"
          value={`${defectRate}%`}
          accent="var(--status-danger)"
        />
        <KPICard
          label="Avg Cycle Time"
          value={`${avgCycleTime} days`}
          accent="var(--status-warning)"
        />
        <KPICard
          label="Capacity Utilization"
          value={`${avgUtilization}%`}
          accent="var(--status-success)"
        />
      </div>

      {/* Production Trend Chart */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
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
          Production Trend (Units)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 160,
          }}
        >
          {trendData.map((d) => (
            <div
              key={d.month}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {d.output}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 48,
                  height: `${(d.output / maxTrend) * 120}px`,
                  background:
                    "linear-gradient(180deg, var(--vyne-purple), #8B68FF)",
                  borderRadius: "6px 6px 2px 2px",
                  transition: "height 0.4s ease",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                }}
              >
                {d.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Production by Product */}
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
          Production by Product
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(productionByProduct)
            .sort((a, b) => b[1] - a[1])
            .map(([product, qty]) => (
              <div key={product}>
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
                    {product}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {qty} units
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#F0F0F8",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(qty / maxProduction) * 100}%`,
                      background: "linear-gradient(90deg, #22C55E, #4ADE80)",
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Work Center Utilization */}
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
          Work Center Utilization
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK_WORK_CENTERS.map((wc) => (
            <div key={wc.id}>
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
                  {wc.name}
                  {wc.status !== "Active" && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      ({wc.status})
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: loadColor(wc.currentLoad),
                  }}
                >
                  {wc.currentLoad}%
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "#F0F0F8",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${wc.currentLoad}%`,
                    background: loadColor(wc.currentLoad),
                    borderRadius: 4,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Manufacturing Page ──────────────────────────────────────
export default function ManufacturingPage() {
  const [activeTab, setActiveTab] = useState<MfgTab>("bom");

  function renderTab() {
    switch (activeTab) {
      case "bom":
        return <BOMTab />;
      case "orders":
        return <ManufacturingOrdersTab />;
      case "workcenters":
        return <WorkCentersTab />;
      case "operations":
        return <OperationsTab />;
      case "qc":
        return <QualityControlTab />;
      case "reports":
        return <MfgReportsTab />;
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
            Manufacturing
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Manage BOMs, manufacturing orders, work centers, operations and
            quality control
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
          label="Bill of Materials"
          active={activeTab === "bom"}
          onClick={() => setActiveTab("bom")}
          count={MOCK_BOMS.length}
        />
        <TabBtn
          label="Manufacturing Orders"
          active={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
          count={MOCK_MOS.length}
        />
        <TabBtn
          label="Work Centers"
          active={activeTab === "workcenters"}
          onClick={() => setActiveTab("workcenters")}
          count={MOCK_WORK_CENTERS.length}
        />
        <TabBtn
          label="Operations"
          active={activeTab === "operations"}
          onClick={() => setActiveTab("operations")}
          count={MOCK_OPERATIONS.length}
        />
        <TabBtn
          label="Quality Control"
          active={activeTab === "qc"}
          onClick={() => setActiveTab("qc")}
          count={MOCK_QC_CHECKS.length}
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
