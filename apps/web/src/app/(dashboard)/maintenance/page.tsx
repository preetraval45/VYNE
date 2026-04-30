"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Activity,
  Package,
  Calendar,
  ClipboardList,
  Settings2,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type MaintenanceTab =
  | "equipment"
  | "requests"
  | "preventive"
  | "workorders"
  | "parts";

type EquipmentCategory =
  | "HVAC"
  | "Electrical"
  | "Plumbing"
  | "IT"
  | "Machinery";
type EquipmentStatus =
  | "Operational"
  | "Under Maintenance"
  | "Broken"
  | "Retired";

type RequestType = "Corrective" | "Preventive";
type RequestPriority = "Low" | "Medium" | "High" | "Critical";
type RequestStatus = "New" | "In Progress" | "Done" | "Cancelled";

type PMFrequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
type PMStatus = "Active" | "Paused";

type WOStatus = "Scheduled" | "In Progress" | "Completed" | "On Hold";

type PartStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  location: string;
  serialNumber: string;
  status: EquipmentStatus;
  lastService: string;
  nextService: string;
}

interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  equipment: string;
  type: RequestType;
  priority: RequestPriority;
  assignedTo: string;
  status: RequestStatus;
  created: string;
  deadline: string;
}

interface PreventivePlan {
  id: string;
  planName: string;
  equipment: string;
  frequency: PMFrequency;
  lastRun: string;
  nextRun: string;
  assignedTeam: string;
  status: PMStatus;
}

interface WorkOrder {
  id: string;
  woNumber: string;
  equipment: string;
  description: string;
  assignedTo: string;
  startDate: string;
  endDate: string;
  duration: string;
  partsUsed: string;
  status: WOStatus;
}

interface SparePart {
  id: string;
  partName: string;
  sku: string;
  category: string;
  quantityInStock: number;
  minStock: number;
  unitCost: number;
  location: string;
  status: PartStatus;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: "EQ-001",
    name: "Central AC Unit A",
    category: "HVAC",
    location: "Building A - Floor 1",
    serialNumber: "HVAC-2024-0012",
    status: "Operational",
    lastService: "2026-02-15",
    nextService: "2026-05-15",
  },
  {
    id: "EQ-002",
    name: "Backup Generator",
    category: "Electrical",
    location: "Building B - Basement",
    serialNumber: "GEN-2023-0445",
    status: "Operational",
    lastService: "2026-01-20",
    nextService: "2026-04-20",
  },
  {
    id: "EQ-003",
    name: "Main Water Pump",
    category: "Plumbing",
    location: "Building A - Basement",
    serialNumber: "PLB-2022-1190",
    status: "Under Maintenance",
    lastService: "2026-03-10",
    nextService: "2026-06-10",
  },
  {
    id: "EQ-004",
    name: "Server Rack #3",
    category: "IT",
    location: "Data Center - Row C",
    serialNumber: "SRV-2025-0034",
    status: "Operational",
    lastService: "2026-03-01",
    nextService: "2026-06-01",
  },
  {
    id: "EQ-005",
    name: "CNC Milling Machine",
    category: "Machinery",
    location: "Workshop - Bay 2",
    serialNumber: "CNC-2021-0877",
    status: "Broken",
    lastService: "2026-01-05",
    nextService: "2026-04-05",
  },
  {
    id: "EQ-006",
    name: "Rooftop Exhaust Fan",
    category: "HVAC",
    location: "Building A - Roof",
    serialNumber: "HVAC-2023-0198",
    status: "Operational",
    lastService: "2026-02-28",
    nextService: "2026-05-28",
  },
  {
    id: "EQ-007",
    name: "UPS System 40kVA",
    category: "Electrical",
    location: "Building B - Floor 2",
    serialNumber: "UPS-2024-0089",
    status: "Operational",
    lastService: "2026-03-05",
    nextService: "2026-06-05",
  },
  {
    id: "EQ-008",
    name: "Fire Suppression Panel",
    category: "Electrical",
    location: "Building A - Lobby",
    serialNumber: "FIRE-2020-0023",
    status: "Retired",
    lastService: "2025-12-01",
    nextService: "—",
  },
  {
    id: "EQ-009",
    name: "Network Switch Core",
    category: "IT",
    location: "Data Center - Row A",
    serialNumber: "NET-2025-0112",
    status: "Operational",
    lastService: "2026-03-18",
    nextService: "2026-06-18",
  },
  {
    id: "EQ-010",
    name: "Hydraulic Press #1",
    category: "Machinery",
    location: "Workshop - Bay 5",
    serialNumber: "HYD-2022-0556",
    status: "Under Maintenance",
    lastService: "2026-03-12",
    nextService: "2026-04-12",
  },
];

const MOCK_REQUESTS: MaintenanceRequest[] = [
  {
    id: "R-001",
    requestNumber: "MR-2026-001",
    equipment: "CNC Milling Machine",
    type: "Corrective",
    priority: "Critical",
    assignedTo: "Mike Torres",
    status: "In Progress",
    created: "2026-03-15",
    deadline: "2026-03-22",
  },
  {
    id: "R-002",
    requestNumber: "MR-2026-002",
    equipment: "Main Water Pump",
    type: "Corrective",
    priority: "High",
    assignedTo: "Sarah Chen",
    status: "In Progress",
    created: "2026-03-10",
    deadline: "2026-03-24",
  },
  {
    id: "R-003",
    requestNumber: "MR-2026-003",
    equipment: "Central AC Unit A",
    type: "Preventive",
    priority: "Medium",
    assignedTo: "Jake Wilson",
    status: "New",
    created: "2026-03-18",
    deadline: "2026-04-01",
  },
  {
    id: "R-004",
    requestNumber: "MR-2026-004",
    equipment: "Server Rack #3",
    type: "Preventive",
    priority: "Low",
    assignedTo: "Lisa Park",
    status: "Done",
    created: "2026-02-20",
    deadline: "2026-03-05",
  },
  {
    id: "R-005",
    requestNumber: "MR-2026-005",
    equipment: "Hydraulic Press #1",
    type: "Corrective",
    priority: "High",
    assignedTo: "Mike Torres",
    status: "New",
    created: "2026-03-20",
    deadline: "2026-03-28",
  },
  {
    id: "R-006",
    requestNumber: "MR-2026-006",
    equipment: "Backup Generator",
    type: "Preventive",
    priority: "Medium",
    assignedTo: "Sarah Chen",
    status: "Done",
    created: "2026-02-15",
    deadline: "2026-03-01",
  },
  {
    id: "R-007",
    requestNumber: "MR-2026-007",
    equipment: "Rooftop Exhaust Fan",
    type: "Corrective",
    priority: "Low",
    assignedTo: "Jake Wilson",
    status: "Cancelled",
    created: "2026-03-01",
    deadline: "2026-03-15",
  },
  {
    id: "R-008",
    requestNumber: "MR-2026-008",
    equipment: "UPS System 40kVA",
    type: "Preventive",
    priority: "Medium",
    assignedTo: "Lisa Park",
    status: "New",
    created: "2026-03-21",
    deadline: "2026-04-05",
  },
];

const MOCK_PM_PLANS: PreventivePlan[] = [
  {
    id: "PM-001",
    planName: "HVAC Quarterly Checkup",
    equipment: "Central AC Unit A",
    frequency: "Quarterly",
    lastRun: "2026-02-15",
    nextRun: "2026-05-15",
    assignedTeam: "HVAC Team",
    status: "Active",
  },
  {
    id: "PM-002",
    planName: "Generator Load Test",
    equipment: "Backup Generator",
    frequency: "Monthly",
    lastRun: "2026-03-01",
    nextRun: "2026-04-01",
    assignedTeam: "Electrical Team",
    status: "Active",
  },
  {
    id: "PM-003",
    planName: "Server Room Inspection",
    equipment: "Server Rack #3",
    frequency: "Weekly",
    lastRun: "2026-03-18",
    nextRun: "2026-03-25",
    assignedTeam: "IT Ops",
    status: "Active",
  },
  {
    id: "PM-004",
    planName: "Fire System Annual Test",
    equipment: "Fire Suppression Panel",
    frequency: "Yearly",
    lastRun: "2025-12-01",
    nextRun: "2026-12-01",
    assignedTeam: "Safety Team",
    status: "Paused",
  },
  {
    id: "PM-005",
    planName: "Hydraulic Fluid Check",
    equipment: "Hydraulic Press #1",
    frequency: "Monthly",
    lastRun: "2026-03-12",
    nextRun: "2026-04-12",
    assignedTeam: "Mechanical Team",
    status: "Active",
  },
  {
    id: "PM-006",
    planName: "Network Health Scan",
    equipment: "Network Switch Core",
    frequency: "Daily",
    lastRun: "2026-03-22",
    nextRun: "2026-03-23",
    assignedTeam: "IT Ops",
    status: "Active",
  },
];

const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: "WO-001",
    woNumber: "WO-2026-001",
    equipment: "CNC Milling Machine",
    description: "Replace spindle bearings and realign axis",
    assignedTo: "Mike Torres",
    startDate: "2026-03-16",
    endDate: "2026-03-20",
    duration: "4 days",
    partsUsed: "Spindle bearings (x2), Alignment kit",
    status: "In Progress",
  },
  {
    id: "WO-002",
    woNumber: "WO-2026-002",
    equipment: "Main Water Pump",
    description: "Seal replacement and pressure test",
    assignedTo: "Sarah Chen",
    startDate: "2026-03-11",
    endDate: "2026-03-14",
    duration: "3 days",
    partsUsed: "Mechanical seal, Gasket set",
    status: "In Progress",
  },
  {
    id: "WO-003",
    woNumber: "WO-2026-003",
    equipment: "Central AC Unit A",
    description: "Filter replacement and coil cleaning",
    assignedTo: "Jake Wilson",
    startDate: "2026-04-01",
    endDate: "2026-04-02",
    duration: "1 day",
    partsUsed: "HEPA filters (x4)",
    status: "Scheduled",
  },
  {
    id: "WO-004",
    woNumber: "WO-2026-004",
    equipment: "Server Rack #3",
    description: "Fan module replacement and cable management",
    assignedTo: "Lisa Park",
    startDate: "2026-02-22",
    endDate: "2026-02-23",
    duration: "1 day",
    partsUsed: "Fan modules (x3)",
    status: "Completed",
  },
  {
    id: "WO-005",
    woNumber: "WO-2026-005",
    equipment: "Backup Generator",
    description: "Oil change and filter replacement",
    assignedTo: "Mike Torres",
    startDate: "2026-03-01",
    endDate: "2026-03-01",
    duration: "4 hours",
    partsUsed: "Oil filter, Engine oil (20L)",
    status: "Completed",
  },
  {
    id: "WO-006",
    woNumber: "WO-2026-006",
    equipment: "Hydraulic Press #1",
    description: "Hydraulic cylinder rebuild",
    assignedTo: "Sarah Chen",
    startDate: "2026-03-25",
    endDate: "2026-03-28",
    duration: "3 days",
    partsUsed: "Cylinder seals, Piston rod",
    status: "Scheduled",
  },
  {
    id: "WO-007",
    woNumber: "WO-2026-007",
    equipment: "UPS System 40kVA",
    description: "Battery bank replacement",
    assignedTo: "Jake Wilson",
    startDate: "2026-03-18",
    endDate: "—",
    duration: "—",
    partsUsed: "UPS Batteries (x8)",
    status: "On Hold",
  },
];

const MOCK_PARTS: SparePart[] = [
  {
    id: "P-001",
    partName: "HEPA Air Filter (24x24)",
    sku: "FLT-HEPA-2424",
    category: "HVAC",
    quantityInStock: 12,
    minStock: 4,
    unitCost: 45.0,
    location: "Warehouse A - Shelf 3",
    status: "In Stock",
  },
  {
    id: "P-002",
    partName: "Spindle Bearing 6205",
    sku: "BRG-SPD-6205",
    category: "Machinery",
    quantityInStock: 2,
    minStock: 4,
    unitCost: 125.0,
    location: "Warehouse B - Bin 12",
    status: "Low Stock",
  },
  {
    id: "P-003",
    partName: "Mechanical Seal 35mm",
    sku: "SEL-MEC-035",
    category: "Plumbing",
    quantityInStock: 6,
    minStock: 3,
    unitCost: 89.0,
    location: "Warehouse A - Shelf 7",
    status: "In Stock",
  },
  {
    id: "P-004",
    partName: "UPS Battery 12V 9Ah",
    sku: "BAT-UPS-129",
    category: "Electrical",
    quantityInStock: 0,
    minStock: 8,
    unitCost: 65.0,
    location: "Warehouse B - Rack 2",
    status: "Out of Stock",
  },
  {
    id: "P-005",
    partName: "Hydraulic Cylinder Seal Kit",
    sku: "SEL-HYD-CYL",
    category: "Machinery",
    quantityInStock: 3,
    minStock: 2,
    unitCost: 210.0,
    location: "Warehouse B - Bin 5",
    status: "In Stock",
  },
  {
    id: "P-006",
    partName: "Server Fan Module",
    sku: "FAN-SRV-MOD",
    category: "IT",
    quantityInStock: 1,
    minStock: 3,
    unitCost: 78.0,
    location: "Data Center Spares",
    status: "Low Stock",
  },
  {
    id: "P-007",
    partName: "Oil Filter (Generator)",
    sku: "FLT-OIL-GEN",
    category: "Electrical",
    quantityInStock: 8,
    minStock: 4,
    unitCost: 32.0,
    location: "Warehouse A - Shelf 1",
    status: "In Stock",
  },
  {
    id: "P-008",
    partName: "V-Belt A68",
    sku: "BLT-V-A68",
    category: "Machinery",
    quantityInStock: 1,
    minStock: 3,
    unitCost: 18.5,
    location: "Warehouse B - Bin 9",
    status: "Low Stock",
  },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    text: "WO-2026-005 completed — Generator oil change finished",
    time: "2 hours ago",
    icon: "done" as const,
  },
  {
    id: 2,
    text: "MR-2026-008 created — UPS preventive maintenance requested",
    time: "5 hours ago",
    icon: "new" as const,
  },
  {
    id: 3,
    text: "Hydraulic Press #1 status changed to Under Maintenance",
    time: "1 day ago",
    icon: "alert" as const,
  },
  {
    id: 4,
    text: "PM schedule triggered — Server Room Inspection (weekly)",
    time: "1 day ago",
    icon: "schedule" as const,
  },
  {
    id: 5,
    text: "Low stock alert — Spindle Bearing 6205 below minimum",
    time: "2 days ago",
    icon: "alert" as const,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Style helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const equipmentStatusStyle: Record<
  EquipmentStatus,
  { bg: string; color: string }
> = {
  Operational: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  "Under Maintenance": { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
  Broken: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  Retired: { bg: "var(--content-secondary)", color: "var(--text-secondary)" },
};

const priorityDotColor: Record<RequestPriority, string> = {
  Low: "#22C55E",
  Medium: "#F59E0B",
  High: "#EF4444",
  Critical: "#991B1B",
};

const requestStatusStyle: Record<RequestStatus, { bg: string; color: string }> =
  {
    New: { bg: "#EFF6FF", color: "#1E40AF" },
    "In Progress": { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Done: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Cancelled: {
      bg: "var(--content-secondary)",
      color: "var(--text-secondary)",
    },
  };

const frequencyBadgeStyle: Record<PMFrequency, { bg: string; color: string }> =
  {
    Daily: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Weekly: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Monthly: { bg: "#EFF6FF", color: "#1E40AF" },
    Quarterly: { bg: "#F5F3FF", color: "#5B21B6" },
    Yearly: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  };

const woStatusStyle: Record<WOStatus, { bg: string; color: string }> = {
  Scheduled: { bg: "#EFF6FF", color: "#1E40AF" },
  "In Progress": { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
  Completed: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  "On Hold": { bg: "var(--content-secondary)", color: "var(--text-secondary)" },
};

const partStatusStyle: Record<PartStatus, { bg: string; color: string }> = {
  "In Stock": { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  "Low Stock": { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
  "Out of Stock": { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-tertiary)",
  borderBottom: "1px solid var(--content-border)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-primary)",
  borderBottom: "1px solid var(--content-border)",
  whiteSpace: "nowrap",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const cardStyle: React.CSSProperties = {
  background: "var(--content-bg)",
  borderRadius: 12,
  border: "1px solid var(--content-border)",
  padding: 20,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reusable sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Badge({
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function PriorityDot({ priority }: Readonly<{ priority: RequestPriority }>) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: priorityDotColor[priority],
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13 }}>{priority}</span>
    </span>
  );
}

function TabBtn({
  label,
  active,
  onClick,
  icon,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: active ? "var(--vyne-accent, var(--vyne-purple))" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--content-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function KPICard({
  label,
  value,
  icon,
  accent,
}: Readonly<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}>) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flex: 1,
        minWidth: 180,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${accent}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div style={{ ...cardStyle, flex: 1, minWidth: 320 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Activity size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        Recent Activity
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {RECENT_ACTIVITY.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                marginTop: 5,
                flexShrink: 0,
                background:
                  a.icon === "done"
                    ? "#22C55E"
                    : a.icon === "alert"
                      ? "#EF4444"
                      : a.icon === "new"
                        ? "#3B82F6"
                        : "#F59E0B",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>
                {a.text}
              </div>
              <div
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {a.time}
              </div>
            </div>
          </div>
        ))}
      </div>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 8,
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
        width: 220,
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
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 13,
          color: "var(--text-primary)",
        }}
      />
    </div>
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
      aria-label="Select option"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "7px 10px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        fontSize: 12,
        color: "var(--text-secondary)",
        outline: "none",
        cursor: "pointer",
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

function AddButton({
  label,
  onClick,
  href,
}: Readonly<{ label: string; onClick?: () => void; href?: string }>) {
  const sharedStyle = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, var(--vyne-accent, #06B6D4) 0%, var(--vyne-accent-light, #22D3EE) 100%)",
    boxShadow: "0 2px 8px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
    textDecoration: "none",
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.boxShadow =
      "0 4px 14px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.45)";
    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.boxShadow =
      "0 2px 8px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)";
    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
  };

  if (href) {
    return (
      <Link
        href={href}
        style={sharedStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <Plus size={14} />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={sharedStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab content components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EquipmentTab() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = MOCK_EQUIPMENT.filter((eq) => {
    const matchSearch =
      !search ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      eq.location.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || eq.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const exportData = filtered.map((eq) => ({
    Name: eq.name,
    Category: eq.category,
    Location: eq.location,
    "Serial #": eq.serialNumber,
    Status: eq.status,
    "Last Service": eq.lastService,
    "Next Service": eq.nextService,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search equipment..."
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={["HVAC", "Electrical", "Plumbing", "IT", "Machinery"]}
          allLabel="All Categories"
        />
        <div style={{ flex: 1 }} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="maintenance-equipment"
          columns={[
            { key: "Name" as never, header: "Name" },
            { key: "Category" as never, header: "Category" },
            { key: "Location" as never, header: "Location" },
            { key: "Serial #" as never, header: "Serial #" },
            { key: "Status" as never, header: "Status" },
            { key: "Last Service" as never, header: "Last Service" },
            { key: "Next Service" as never, header: "Next Service" },
          ]}
        />
        <AddButton label="Add Equipment" href="/ops/products/new" />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Serial #</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last Service</th>
              <th style={thStyle}>Next Service</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((eq) => {
              const s = equipmentStatusStyle[eq.status];
              return (
                <tr
                  key={eq.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{eq.name}</td>
                  <td style={tdStyle}>
                    <Badge
                      label={eq.category}
                      bg="rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                      color="var(--vyne-accent, var(--vyne-purple))"
                    />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {eq.location}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {eq.serialNumber}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={eq.status} bg={s.bg} color={s.color} />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {eq.lastService}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {eq.nextService}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-tertiary)",
                  }}
                >
                  No equipment found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsTab() {
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = MOCK_REQUESTS.filter((r) => {
    const matchPriority = !priorityFilter || r.priority === priorityFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchPriority && matchStatus;
  });

  const exportData = filtered.map((r) => ({
    "Request #": r.requestNumber,
    Equipment: r.equipment,
    Type: r.type,
    Priority: r.priority,
    "Assigned To": r.assignedTo,
    Status: r.status,
    Created: r.created,
    Deadline: r.deadline,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <FilterSelect
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={["Low", "Medium", "High", "Critical"]}
          allLabel="All Priorities"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={["New", "In Progress", "Done", "Cancelled"]}
          allLabel="All Statuses"
        />
        <div style={{ flex: 1 }} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="maintenance-requests"
          columns={[
            { key: "Request #" as never, header: "Request #" },
            { key: "Equipment" as never, header: "Equipment" },
            { key: "Type" as never, header: "Type" },
            { key: "Priority" as never, header: "Priority" },
            { key: "Assigned To" as never, header: "Assigned To" },
            { key: "Status" as never, header: "Status" },
            { key: "Created" as never, header: "Created" },
            { key: "Deadline" as never, header: "Deadline" },
          ]}
        />
        <AddButton label="New Request" href="/ops/work-orders/new" />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>Request #</th>
              <th style={thStyle}>Equipment</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = requestStatusStyle[r.status];
              return (
                <tr
                  key={r.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {r.requestNumber}
                  </td>
                  <td style={tdStyle}>{r.equipment}</td>
                  <td style={tdStyle}>
                    <Badge
                      label={r.type}
                      bg={r.type === "Corrective" ? "#FEF2F2" : "#EFF6FF"}
                      color={r.type === "Corrective" ? "#991B1B" : "#1E40AF"}
                    />
                  </td>
                  <td style={tdStyle}>
                    <PriorityDot priority={r.priority} />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {r.assignedTo}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={r.status} bg={s.bg} color={s.color} />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {r.created}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {r.deadline}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-tertiary)",
                  }}
                >
                  No requests match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreventiveTab() {
  const exportData = MOCK_PM_PLANS.map((p) => ({
    "Plan Name": p.planName,
    Equipment: p.equipment,
    Frequency: p.frequency,
    "Last Run": p.lastRun,
    "Next Run": p.nextRun,
    "Assigned Team": p.assignedTeam,
    Status: p.status,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="preventive-maintenance-plans"
          columns={[
            { key: "Plan Name" as never, header: "Plan Name" },
            { key: "Equipment" as never, header: "Equipment" },
            { key: "Frequency" as never, header: "Frequency" },
            { key: "Last Run" as never, header: "Last Run" },
            { key: "Next Run" as never, header: "Next Run" },
            { key: "Assigned Team" as never, header: "Assigned Team" },
            { key: "Status" as never, header: "Status" },
          ]}
        />
        <AddButton label="New Schedule" href="/ops/work-orders/new" />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>Plan Name</th>
              <th style={thStyle}>Equipment</th>
              <th style={thStyle}>Frequency</th>
              <th style={thStyle}>Last Run</th>
              <th style={thStyle}>Next Run</th>
              <th style={thStyle}>Assigned Team</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PM_PLANS.map((p) => {
              const freq = frequencyBadgeStyle[p.frequency];
              return (
                <tr
                  key={p.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.planName}</td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {p.equipment}
                  </td>
                  <td style={tdStyle}>
                    <Badge
                      label={p.frequency}
                      bg={freq.bg}
                      color={freq.color}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {p.lastRun}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {p.nextRun}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {p.assignedTeam}
                  </td>
                  <td style={tdStyle}>
                    <Badge
                      label={p.status}
                      bg={
                        p.status === "Active"
                          ? "#F0FDF4"
                          : "var(--content-secondary)"
                      }
                      color={
                        p.status === "Active"
                          ? "#166534"
                          : "var(--text-secondary)"
                      }
                    />
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

function WorkOrdersTab() {
  const exportData = MOCK_WORK_ORDERS.map((wo) => ({
    "WO #": wo.woNumber,
    Equipment: wo.equipment,
    Description: wo.description,
    "Assigned To": wo.assignedTo,
    "Start Date": wo.startDate,
    "End Date": wo.endDate,
    Duration: wo.duration,
    "Parts Used": wo.partsUsed,
    Status: wo.status,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Timeline hint */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.04)",
          borderColor: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)",
        }}
      >
        <Calendar
          size={16}
          style={{ color: "var(--vyne-accent, var(--vyne-purple))", flexShrink: 0 }}
        />
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>
            Scheduled this week:
          </strong>{" "}
          {
            MOCK_WORK_ORDERS.filter(
              (wo) => wo.status === "Scheduled" || wo.status === "In Progress",
            ).length
          }{" "}
          work orders &middot;{" "}
          {MOCK_WORK_ORDERS.filter((wo) => wo.status === "On Hold").length} on
          hold
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="work-orders"
          columns={[
            { key: "WO #" as never, header: "WO #" },
            { key: "Equipment" as never, header: "Equipment" },
            { key: "Description" as never, header: "Description" },
            { key: "Assigned To" as never, header: "Assigned To" },
            { key: "Start Date" as never, header: "Start Date" },
            { key: "End Date" as never, header: "End Date" },
            { key: "Duration" as never, header: "Duration" },
            { key: "Parts Used" as never, header: "Parts Used" },
            { key: "Status" as never, header: "Status" },
          ]}
        />
        <AddButton label="Create Work Order" href="/ops/work-orders/new" />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>WO #</th>
              <th style={thStyle}>Equipment</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Start</th>
              <th style={thStyle}>End</th>
              <th style={thStyle}>Duration</th>
              <th style={thStyle}>Parts Used</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_WORK_ORDERS.map((wo) => {
              const s = woStatusStyle[wo.status];
              return (
                <tr
                  key={wo.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {wo.woNumber}
                  </td>
                  <td style={tdStyle}>{wo.equipment}</td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--text-secondary)",
                    }}
                    title={wo.description}
                  >
                    {wo.description}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {wo.assignedTo}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {wo.startDate}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {wo.endDate}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {wo.duration}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                    }}
                    title={wo.partsUsed}
                  >
                    {wo.partsUsed}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={wo.status} bg={s.bg} color={s.color} />
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

function PartsTab() {
  const lowStockItems = MOCK_PARTS.filter(
    (p) => p.quantityInStock < p.minStock,
  );

  const exportData = MOCK_PARTS.map((p) => ({
    "Part Name": p.partName,
    SKU: p.sku,
    Category: p.category,
    "Qty in Stock": p.quantityInStock,
    "Min Stock": p.minStock,
    "Unit Cost": `$${p.unitCost.toFixed(2)}`,
    Location: p.location,
    Status: p.status,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "var(--badge-danger-bg)",
            borderColor: "rgba(239,68,68,0.2)",
          }}
        >
          <AlertTriangle
            size={16}
            style={{ color: "#EF4444", flexShrink: 0 }}
          />
          <div style={{ fontSize: 12, color: "var(--badge-danger-text)" }}>
            <strong>Low Stock Alert:</strong>{" "}
            {lowStockItems.map((p) => p.partName).join(", ")} —{" "}
            {lowStockItems.length === 1 ? "this item is" : "these items are"}{" "}
            below minimum stock levels.
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="spare-parts-inventory"
          columns={[
            { key: "Part Name" as never, header: "Part Name" },
            { key: "SKU" as never, header: "SKU" },
            { key: "Category" as never, header: "Category" },
            { key: "Qty in Stock" as never, header: "Qty in Stock" },
            { key: "Min Stock" as never, header: "Min Stock" },
            { key: "Unit Cost" as never, header: "Unit Cost" },
            { key: "Location" as never, header: "Location" },
            { key: "Status" as never, header: "Status" },
          ]}
        />
        <AddButton label="Add Part" href="/ops/products/new" />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>Part Name</th>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Qty in Stock</th>
              <th style={thStyle}>Min Stock</th>
              <th style={thStyle}>Unit Cost</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PARTS.map((p) => {
              const s = partStatusStyle[p.status];
              const isLow = p.quantityInStock < p.minStock;
              return (
                <tr
                  key={p.id}
                  style={{
                    transition: "background 0.1s",
                    background: isLow ? "rgba(239,68,68,0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = isLow
                      ? "rgba(239,68,68,0.06)"
                      : "var(--content-secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = isLow
                      ? "rgba(239,68,68,0.03)"
                      : "transparent")
                  }
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.partName}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.sku}
                  </td>
                  <td style={tdStyle}>
                    <Badge
                      label={p.category}
                      bg="rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                      color="var(--vyne-accent, var(--vyne-purple))"
                    />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: isLow ? 700 : 400,
                      color: isLow ? "#991B1B" : "var(--text-primary)",
                    }}
                  >
                    {p.quantityInStock}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    {p.minStock}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>
                    ${p.unitCost.toFixed(2)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "var(--text-secondary)",
                      fontSize: 12,
                    }}
                  >
                    {p.location}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={p.status} bg={s.bg} color={s.color} />
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main page component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("equipment");

  // KPI calculations
  const totalEquipment = MOCK_EQUIPMENT.length;
  const activeRequests = MOCK_REQUESTS.filter(
    (r) => r.status === "New" || r.status === "In Progress",
  ).length;
  const overdueTasks = MOCK_REQUESTS.filter(
    (r) =>
      (r.status === "New" || r.status === "In Progress") &&
      new Date(r.deadline) < new Date("2026-03-22"),
  ).length;
  const operationalCount = MOCK_EQUIPMENT.filter(
    (eq) => eq.status === "Operational",
  ).length;
  const uptimePercent = Math.round((operationalCount / totalEquipment) * 100);

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)" }}
          >
            <Wrench size={18} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
          </div>
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Maintenance
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Equipment, requests & work orders
            </p>
          </div>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────── */}
      <div className="flex-1 overflow-auto content-scroll px-6 py-6">
        {/* ── Summary Dashboard ─────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <KPICard
            label="Total Equipment"
            value={totalEquipment}
            icon={<Settings2 size={20} />}
            accent="var(--vyne-accent, #06B6D4)"
          />
          <KPICard
            label="Active Requests"
            value={activeRequests}
            icon={<ClipboardList size={20} />}
            accent="#3B82F6"
          />
          <KPICard
            label="Overdue Tasks"
            value={overdueTasks}
            icon={<AlertTriangle size={20} />}
            accent="#EF4444"
          />
          <KPICard
            label="Uptime %"
            value={`${uptimePercent}%`}
            icon={<CheckCircle2 size={20} />}
            accent="#22C55E"
          />
        </div>

        {/* Recent Activity Feed */}
        <div style={{ marginBottom: 24 }}>
          <ActivityFeed />
        </div>

        {/* ── Tabs ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 20,
            padding: "4px",
            borderRadius: 10,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            width: "fit-content",
          }}
        >
          <TabBtn
            label="Equipment"
            active={activeTab === "equipment"}
            onClick={() => setActiveTab("equipment")}
            icon={<Settings2 size={13} />}
          />
          <TabBtn
            label="Requests"
            active={activeTab === "requests"}
            onClick={() => setActiveTab("requests")}
            icon={<ClipboardList size={13} />}
          />
          <TabBtn
            label="Preventive"
            active={activeTab === "preventive"}
            onClick={() => setActiveTab("preventive")}
            icon={<Clock size={13} />}
          />
          <TabBtn
            label="Work Orders"
            active={activeTab === "workorders"}
            onClick={() => setActiveTab("workorders")}
            icon={<Wrench size={13} />}
          />
          <TabBtn
            label="Parts & Inventory"
            active={activeTab === "parts"}
            onClick={() => setActiveTab("parts")}
            icon={<Package size={13} />}
          />
        </div>

        {/* ── Tab Content ───────────────────────────── */}
        {activeTab === "equipment" && <EquipmentTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "preventive" && <PreventiveTab />}
        {activeTab === "workorders" && <WorkOrdersTab />}
        {activeTab === "parts" && <PartsTab />}
      </div>
    </div>
  );
}
