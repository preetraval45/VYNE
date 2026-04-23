"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";

// ─── Types ─────────────────────────────────────────────────────────
type ReportingTab =
  | "dashboard"
  | "sales"
  | "financial"
  | "operations"
  | "hr"
  | "custom";

// ─── Helpers ───────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Tab button ────────────────────────────────────────────────────
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

// ─── KPI Card ──────────────────────────────────────────────────────
function KPICard({
  title,
  value,
  subtitle,
  accentColor,
  trend,
}: Readonly<{
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  trend?: { value: string; positive: boolean };
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {title}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: accentColor ?? "var(--text-primary)",
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trend.positive ? "var(--badge-success-text)" : "var(--badge-danger-text)",
            }}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────
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

// ─── Table wrapper ─────────────────────────────────────────────────
function TableCard({
  title,
  actions,
  children,
}: Readonly<{
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </span>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}

// ─── Section panel ─────────────────────────────────────────────────
function SectionPanel({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "18px",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          display: "block",
          marginBottom: 16,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

// ─── Shared table styles ───────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 12,
  color: "var(--text-primary)",
  borderBottom: "1px solid var(--content-border)",
  whiteSpace: "nowrap",
};

const tdSecondary: React.CSSProperties = {
  ...tdStyle,
  color: "var(--text-secondary)",
};

// ─── CSS-only Bar Chart ────────────────────────────────────────────
function BarChart({
  data,
  labelKey,
  valueKey,
  secondaryKey,
  barColor,
  secondaryColor,
  height = 140,
  showValues = true,
}: Readonly<{
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  secondaryKey?: string;
  barColor?: string;
  secondaryColor?: string;
  height?: number;
  showValues?: boolean;
}>) {
  const allValues = data.flatMap((d) => {
    const vals = [Number(d[valueKey])];
    if (secondaryKey) vals.push(Number(d[secondaryKey]));
    return vals;
  });
  const maxVal = Math.max(...allValues, 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        height,
        padding: "0 4px",
      }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          {showValues && (
            <span
              style={{
                fontSize: 9,
                color: "var(--text-tertiary)",
                fontWeight: 600,
              }}
            >
              {fmtNum(Number(d[valueKey]))}
            </span>
          )}
          <div
            style={{
              display: "flex",
              gap: secondaryKey ? 3 : 0,
              alignItems: "flex-end",
              height: height - 40,
              width: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                background: barColor ?? "var(--vyne-purple)",
                borderRadius: "3px 3px 0 0",
                height: `${(Number(d[valueKey]) / maxVal) * 100}%`,
                opacity: 0.85,
                minHeight: 2,
              }}
              title={`${d[labelKey]}: ${fmtNum(Number(d[valueKey]))}`}
            />
            {secondaryKey && (
              <div
                style={{
                  flex: 1,
                  background: secondaryColor ?? "var(--status-danger)",
                  borderRadius: "3px 3px 0 0",
                  height: `${(Number(d[secondaryKey]) / maxVal) * 100}%`,
                  opacity: 0.7,
                  minHeight: 2,
                }}
                title={`${d[labelKey]}: ${fmtNum(Number(d[secondaryKey]))}`}
              />
            )}
          </div>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {String(d[labelKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal bar ────────────────────────────────────────────────
function HorizontalBar({
  label,
  value,
  max,
  color,
  suffix,
}: Readonly<{
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          width: 90,
          flexShrink: 0,
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 20,
          background: "rgba(0,0,0,0.04)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-primary)",
          width: 55,
          textAlign: "right",
        }}
      >
        {suffix ? `${value}${suffix}` : fmtNum(value)}
      </span>
    </div>
  );
}

// ─── Pie Chart (CSS-only) ──────────────────────────────────────────
function PieChart({
  segments,
  size = 120,
}: Readonly<{
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
}>) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;
  const gradientParts: string[] = [];

  for (const seg of segments) {
    const start = (cumulative / total) * 360;
    cumulative += seg.value;
    const end = (cumulative / total) * 360;
    gradientParts.push(`${seg.color} ${start}deg ${end}deg`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${gradientParts.join(", ")})`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {seg.label}: {pct((seg.value / total) * 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel Chart (CSS-only) ───────────────────────────────────────
function FunnelChart({
  stages,
}: Readonly<{
  stages: Array<{ label: string; value: number; color: string }>;
}>) {
  const maxVal = stages[0]?.value ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {stages.map((s, i) => {
        const widthPct = Math.max((s.value / maxVal) * 100, 20);
        const convRate =
          i > 0 ? ((s.value / stages[i - 1].value) * 100).toFixed(1) : null;
        return (
          <div key={s.label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  width: 80,
                  flexShrink: 0,
                }}
              >
                {s.label}
              </span>
              <div
                style={{
                  width: `${widthPct}%`,
                  height: 28,
                  background: s.color,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                  transition: "width 0.3s",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {fmtNum(s.value)}
                </span>
              </div>
              {convRate && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {convRate}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── P&L Row helper ────────────────────────────────────────────────
function PLRow({
  label,
  value,
  bold,
  indent,
  highlight,
}: Readonly<{
  label: string;
  value: number;
  bold?: boolean;
  indent?: number;
  highlight?: boolean;
}>) {
  let valueColor = "var(--text-primary)";
  if (value < 0) valueColor = "var(--status-danger)";
  else if (highlight) valueColor = "var(--badge-success-text)";

  return (
    <tr
      style={{
        borderTop: "1px solid var(--content-border)",
        background: highlight
          ? value >= 0
            ? "#F0FDF4"
            : "#FEF2F2"
          : "transparent",
      }}
    >
      <td
        style={{
          padding: "10px 18px",
          fontSize: 12,
          color: bold ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: bold ? 600 : 400,
          paddingLeft: 18 + (indent ?? 0) * 20,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "10px 18px",
          fontSize: 12,
          fontWeight: bold ? 700 : 400,
          textAlign: "right",
          color: valueColor,
        }}
      >
        {value < 0 ? `-${fmt(Math.abs(value))}` : fmt(value)}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MOCK DATA ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// Sales data
const MONTHLY_REVENUE = [
  { month: "Oct", revenue: 128000, expenses: 85000 },
  { month: "Nov", revenue: 142000, expenses: 91000 },
  { month: "Dec", revenue: 115000, expenses: 78000 },
  { month: "Jan", revenue: 156000, expenses: 96000 },
  { month: "Feb", revenue: 168000, expenses: 102000 },
  { month: "Mar", revenue: 185000, expenses: 110000 },
];

const TOP_CUSTOMERS = [
  { name: "Acme Corp", revenue: 42000, orders: 18, segment: "Enterprise" },
  {
    name: "Globex Industries",
    revenue: 35800,
    orders: 12,
    segment: "Enterprise",
  },
  {
    name: "Initech Solutions",
    revenue: 28500,
    orders: 24,
    segment: "Mid-Market",
  },
  { name: "Soylent Corp", revenue: 21200, orders: 9, segment: "Mid-Market" },
  { name: "Umbrella LLC", revenue: 18700, orders: 15, segment: "SMB" },
  {
    name: "Cyberdyne Systems",
    revenue: 15400,
    orders: 7,
    segment: "Enterprise",
  },
];

const SALES_BY_CATEGORY = [
  { category: "SaaS Licenses", revenue: 82000, color: "#06B6D4" },
  { category: "Professional Services", revenue: 45000, color: "#3498DB" },
  { category: "Hardware", revenue: 32000, color: "#2ECC71" },
  { category: "Support Plans", revenue: 18000, color: "#F39C12" },
  { category: "Training", revenue: 8000, color: "#06B6D4" },
];

const PIPELINE_FUNNEL = [
  { label: "Leads", value: 1240, color: "rgba(6, 182, 212,0.6)" },
  { label: "Qualified", value: 680, color: "rgba(6, 182, 212,0.7)" },
  { label: "Proposal", value: 320, color: "rgba(6, 182, 212,0.8)" },
  { label: "Negotiation", value: 145, color: "rgba(6, 182, 212,0.9)" },
  { label: "Won", value: 78, color: "#06B6D4" },
];

// Financial data
const PL_ROWS = [
  { label: "Revenue", value: 185000, bold: true, indent: 0 },
  { label: "Cost of Goods Sold", value: -72000, indent: 1 },
  { label: "Gross Profit", value: 113000, bold: true, indent: 0 },
  { label: "Operating Expenses", value: -38000, indent: 1 },
  { label: "EBITDA", value: 75000, bold: true, indent: 0 },
  { label: "Depreciation & Amortization", value: -5200, indent: 1 },
  { label: "Net Profit", value: 69800, bold: true, indent: 0, highlight: true },
];

const CASH_FLOW = [
  { month: "Oct", inflow: 135000, outflow: 98000 },
  { month: "Nov", inflow: 148000, outflow: 105000 },
  { month: "Dec", inflow: 120000, outflow: 92000 },
  { month: "Jan", inflow: 162000, outflow: 108000 },
  { month: "Feb", inflow: 175000, outflow: 115000 },
  { month: "Mar", inflow: 192000, outflow: 122000 },
];

const AR_AGING = [
  {
    bucket: "Current (0-30)",
    amount: 85000,
    count: 24,
    color: "var(--badge-success-text)",
    bg: "#F0FDF4",
  },
  {
    bucket: "31-60 Days",
    amount: 32000,
    count: 8,
    color: "#1E40AF",
    bg: "#EFF6FF",
  },
  {
    bucket: "61-90 Days",
    amount: 12500,
    count: 3,
    color: "var(--badge-warning-text)",
    bg: "#FFFBEB",
  },
  {
    bucket: "90+ Days",
    amount: 4800,
    count: 2,
    color: "var(--badge-danger-text)",
    bg: "#FEF2F2",
  },
];

// Operations data
const INVENTORY_CATEGORIES = [
  { category: "Raw Materials", value: 245000, turnover: 6.2, color: "#06B6D4" },
  {
    category: "Work in Progress",
    value: 128000,
    turnover: 8.4,
    color: "#3498DB",
  },
  {
    category: "Finished Goods",
    value: 312000,
    turnover: 4.8,
    color: "#2ECC71",
  },
  { category: "Spare Parts", value: 45000, turnover: 2.1, color: "#F39C12" },
];

const SUPPLIER_PERF = [
  {
    supplier: "Alpha Components",
    onTime: 97.2,
    quality: 99.1,
    leadDays: 5,
    rating: "A",
  },
  {
    supplier: "Beta Electronics",
    onTime: 92.8,
    quality: 98.5,
    leadDays: 7,
    rating: "A",
  },
  {
    supplier: "Gamma Materials",
    onTime: 88.5,
    quality: 96.2,
    leadDays: 12,
    rating: "B",
  },
  {
    supplier: "Delta Logistics",
    onTime: 95.1,
    quality: 97.8,
    leadDays: 3,
    rating: "A",
  },
  {
    supplier: "Epsilon Parts",
    onTime: 82.3,
    quality: 94.5,
    leadDays: 14,
    rating: "C",
  },
];

const MFG_OUTPUT = [
  { month: "Oct", units: 1240 },
  { month: "Nov", units: 1380 },
  { month: "Dec", units: 980 },
  { month: "Jan", units: 1520 },
  { month: "Feb", units: 1650 },
  { month: "Mar", units: 1780 },
];

// HR data
const DEPT_HEADCOUNT = [
  { dept: "Engineering", count: 42, color: "#06B6D4" },
  { dept: "Sales", count: 28, color: "#06B6D4" },
  { dept: "Product", count: 15, color: "#0891B2" },
  { dept: "Operations", count: 18, color: "#F39C12" },
  { dept: "Finance", count: 12, color: "#3498DB" },
  { dept: "HR", count: 8, color: "#2ECC71" },
  { dept: "Marketing", count: 14, color: "#E67E22" },
];

const LEAVE_UTIL = [
  { type: "Annual Leave", used: 68, total: 100, color: "#06B6D4" },
  { type: "Sick Leave", used: 22, total: 40, color: "#06B6D4" },
  { type: "Personal Days", used: 8, total: 15, color: "#F39C12" },
  { type: "Parental Leave", used: 3, total: 5, color: "#3498DB" },
];

const PAYROLL_SUMMARY = [
  { category: "Base Salary", amount: 1_250_000 },
  { category: "Bonuses", amount: 85_000 },
  { category: "Benefits", amount: 312_000 },
  { category: "Taxes & Deductions", amount: 420_000 },
  { category: "Total Payroll", amount: 2_067_000 },
];

const HIRING_PIPELINE = [
  { stage: "Applications", count: 245, color: "rgba(6, 182, 212,0.5)" },
  { stage: "Screening", count: 120, color: "rgba(6, 182, 212,0.6)" },
  { stage: "Interview", count: 48, color: "rgba(6, 182, 212,0.75)" },
  { stage: "Offer", count: 12, color: "rgba(6, 182, 212,0.9)" },
  { stage: "Hired", count: 8, color: "#06B6D4" },
];

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Dashboard (Overview) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function DashboardTab() {
  const kpis = [
    {
      title: "Revenue (MTD)",
      value: fmt(185000),
      trend: { value: "12.4%", positive: true },
      accentColor: "var(--vyne-purple)",
    },
    {
      title: "Orders",
      value: "342",
      trend: { value: "8.2%", positive: true },
      subtitle: "this month",
    },
    {
      title: "Active Projects",
      value: "18",
      subtitle: "3 at risk",
      accentColor: "#5B21B6",
    },
    {
      title: "Open Issues",
      value: "47",
      trend: { value: "5", positive: false },
      subtitle: "12 critical",
    },
    {
      title: "Support Tickets",
      value: "23",
      trend: { value: "15%", positive: true },
      subtitle: "avg 2.1h response",
    },
    {
      title: "Inventory Value",
      value: fmt(730000),
      subtitle: "across 4 categories",
      accentColor: "#166534",
    },
    {
      title: "Employee Count",
      value: "137",
      trend: { value: "3", positive: true },
      subtitle: "8 open positions",
    },
    {
      title: "System Uptime",
      value: "99.97%",
      subtitle: "last 30 days",
      accentColor: "var(--status-info)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            accentColor={kpi.accentColor}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Revenue trend + quick breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <SectionPanel title="Revenue Trend (6 Months)">
          <BarChart
            data={MONTHLY_REVENUE.map((m) => ({
              label: m.month,
              revenue: m.revenue,
              expenses: m.expenses,
            }))}
            labelKey="label"
            valueKey="revenue"
            secondaryKey="expenses"
            barColor="var(--vyne-purple)"
            secondaryColor="var(--status-danger)"
            height={160}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--vyne-purple)",
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Revenue
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--status-danger)",
                  opacity: 0.7,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Expenses
              </span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Revenue by Category">
          <PieChart
            segments={SALES_BY_CATEGORY.map((c) => ({
              label: c.category,
              value: c.revenue,
              color: c.color,
            }))}
            size={100}
          />
        </SectionPanel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Sales Reports ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function SalesTab() {
  const totalRevenue = MONTHLY_REVENUE.reduce((s, m) => s + m.revenue, 0);
  const currentMonth = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1];
  const prevMonth = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 2];
  const revenueGrowth =
    ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Total Revenue (6M)"
          value={fmt(totalRevenue)}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Current Month"
          value={fmt(currentMonth.revenue)}
          trend={{
            value: `${revenueGrowth.toFixed(1)}%`,
            positive: revenueGrowth > 0,
          }}
        />
        <KPICard
          title="Avg Order Value"
          value={fmt(Math.round(currentMonth.revenue / 342))}
          subtitle="342 orders"
        />
        <KPICard
          title="Win Rate"
          value="6.3%"
          subtitle="78 of 1,240 leads"
          accentColor="#166534"
        />
      </div>

      {/* Revenue chart + Category breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SectionPanel title="Revenue by Month">
          <BarChart
            data={MONTHLY_REVENUE.map((m) => ({
              label: m.month,
              value: m.revenue,
            }))}
            labelKey="label"
            valueKey="value"
            barColor="var(--vyne-purple)"
            height={160}
          />
        </SectionPanel>

        <SectionPanel title="Sales by Product Category">
          <PieChart
            segments={SALES_BY_CATEGORY.map((c) => ({
              label: c.category,
              value: c.revenue,
              color: c.color,
            }))}
            size={110}
          />
        </SectionPanel>
      </div>

      {/* Top customers */}
      <TableCard
        title="Top Customers"
        actions={
          <ExportButton
            data={TOP_CUSTOMERS as unknown as Record<string, unknown>[]}
            filename="top-customers-report"
            columns={[
              {
                key: "name" as keyof Record<string, unknown>,
                header: "Customer",
              },
              {
                key: "revenue" as keyof Record<string, unknown>,
                header: "Revenue",
              },
              {
                key: "orders" as keyof Record<string, unknown>,
                header: "Orders",
              },
              {
                key: "segment" as keyof Record<string, unknown>,
                header: "Segment",
              },
            ]}
          />
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Customer</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
              <th style={thStyle}>Segment</th>
              <th style={thStyle}>Share</th>
            </tr>
          </thead>
          <tbody>
            {TOP_CUSTOMERS.map((c, i) => {
              const share = (c.revenue / currentMonth.revenue) * 100;
              const segColors: Record<string, { bg: string; color: string }> = {
                Enterprise: { bg: "#F5F3FF", color: "#5B21B6" },
                "Mid-Market": { bg: "#EFF6FF", color: "#1E40AF" },
                SMB: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
              };
              const seg = segColors[c.segment] ?? {
                bg: "var(--content-secondary)",
                color: "var(--text-secondary)",
              };
              return (
                <tr key={c.name}>
                  <td style={tdSecondary}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {fmt(c.revenue)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{c.orders}</td>
                  <td style={tdStyle}>
                    <Badge label={c.segment} bg={seg.bg} color={seg.color} />
                  </td>
                  <td style={tdSecondary}>{share.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {/* Pipeline funnel */}
      <SectionPanel title="Pipeline Conversion Funnel">
        <FunnelChart stages={PIPELINE_FUNNEL} />
      </SectionPanel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Financial Reports ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function FinancialTab() {
  const totalAR = AR_AGING.reduce((s, a) => s + a.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Net Profit"
          value={fmt(69800)}
          accentColor="#166534"
          trend={{ value: "18.2%", positive: true }}
        />
        <KPICard
          title="Gross Margin"
          value="61.1%"
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Operating Expenses"
          value={fmt(38000)}
          subtitle="vs $35K last month"
        />
        <KPICard
          title="Accounts Receivable"
          value={fmt(totalAR)}
          subtitle={`${AR_AGING.reduce((s, a) => s + a.count, 0)} invoices`}
        />
      </div>

      {/* P&L + Rev vs Expenses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <TableCard title="Profit & Loss Summary -- March 2026">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {PL_ROWS.map((row) => (
                <PLRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  bold={row.bold}
                  indent={row.indent}
                  highlight={row.highlight}
                />
              ))}
            </tbody>
          </table>
        </TableCard>

        <SectionPanel title="Revenue vs Expenses (6 Months)">
          <BarChart
            data={MONTHLY_REVENUE.map((m) => ({
              label: m.month,
              revenue: m.revenue,
              expenses: m.expenses,
            }))}
            labelKey="label"
            valueKey="revenue"
            secondaryKey="expenses"
            barColor="var(--vyne-purple)"
            secondaryColor="var(--status-danger)"
            height={160}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--vyne-purple)",
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Revenue
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--status-danger)",
                  opacity: 0.7,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Expenses
              </span>
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* Cash flow + AR aging */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SectionPanel title="Cash Flow (6 Months)">
          <BarChart
            data={CASH_FLOW.map((m) => ({
              label: m.month,
              inflow: m.inflow,
              outflow: m.outflow,
            }))}
            labelKey="label"
            valueKey="inflow"
            secondaryKey="outflow"
            barColor="#166534"
            secondaryColor="#991B1B"
            height={150}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--status-success)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Inflow
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: "var(--status-danger)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Outflow
              </span>
            </div>
          </div>
        </SectionPanel>

        <TableCard
          title="Accounts Receivable Aging"
          actions={
            <ExportButton
              data={AR_AGING as unknown as Record<string, unknown>[]}
              filename="ar-aging-report"
              columns={[
                {
                  key: "bucket" as keyof Record<string, unknown>,
                  header: "Aging Bucket",
                },
                {
                  key: "amount" as keyof Record<string, unknown>,
                  header: "Amount",
                },
                {
                  key: "count" as keyof Record<string, unknown>,
                  header: "Invoices",
                },
              ]}
            />
          }
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Aging Bucket</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Invoices</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {AR_AGING.map((a) => (
                <tr key={a.bucket}>
                  <td style={tdStyle}>
                    <Badge label={a.bucket} bg={a.bg} color={a.color} />
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {fmt(a.amount)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{a.count}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {pct((a.amount / totalAR) * 100)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "var(--content-secondary)" }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                  {fmt(totalAR)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                  {AR_AGING.reduce((s, a) => s + a.count, 0)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Operations Reports ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function OperationsTab() {
  const totalInventory = INVENTORY_CATEGORIES.reduce((s, c) => s + c.value, 0);
  const avgTurnover =
    INVENTORY_CATEGORIES.reduce((s, c) => s + c.turnover, 0) /
    INVENTORY_CATEGORIES.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Inventory Value"
          value={fmt(totalInventory)}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Avg Turnover"
          value={`${avgTurnover.toFixed(1)}x`}
          subtitle="per year"
          accentColor="#166534"
        />
        <KPICard
          title="Order Fulfillment"
          value="96.8%"
          trend={{ value: "1.2%", positive: true }}
        />
        <KPICard
          title="Mfg Output (MTD)"
          value={fmtNum(MFG_OUTPUT[MFG_OUTPUT.length - 1].units)}
          subtitle="units produced"
        />
      </div>

      {/* Inventory + Manufacturing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SectionPanel title="Inventory by Category">
          <div style={{ marginBottom: 16 }}>
            {INVENTORY_CATEGORIES.map((c) => (
              <HorizontalBar
                key={c.category}
                label={c.category}
                value={c.value}
                max={Math.max(...INVENTORY_CATEGORIES.map((x) => x.value))}
                color={c.color}
              />
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "block",
                marginBottom: 10,
              }}
            >
              Turnover Rate by Category
            </span>
            <BarChart
              data={INVENTORY_CATEGORIES.map((c) => ({
                label:
                  c.category.length > 10
                    ? c.category.slice(0, 10) + ".."
                    : c.category,
                value: c.turnover,
              }))}
              labelKey="label"
              valueKey="value"
              barColor="#2ECC71"
              height={100}
            />
          </div>
        </SectionPanel>

        <SectionPanel title="Manufacturing Output (6 Months)">
          <BarChart
            data={MFG_OUTPUT.map((m) => ({ label: m.month, value: m.units }))}
            labelKey="label"
            valueKey="value"
            barColor="#F39C12"
            height={160}
          />
        </SectionPanel>
      </div>

      {/* Supplier performance */}
      <TableCard
        title="Supplier Performance"
        actions={
          <ExportButton
            data={SUPPLIER_PERF as unknown as Record<string, unknown>[]}
            filename="supplier-performance"
            columns={[
              {
                key: "supplier" as keyof Record<string, unknown>,
                header: "Supplier",
              },
              {
                key: "onTime" as keyof Record<string, unknown>,
                header: "On-Time %",
              },
              {
                key: "quality" as keyof Record<string, unknown>,
                header: "Quality %",
              },
              {
                key: "leadDays" as keyof Record<string, unknown>,
                header: "Lead Days",
              },
              {
                key: "rating" as keyof Record<string, unknown>,
                header: "Rating",
              },
            ]}
          />
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Supplier</th>
              <th style={{ ...thStyle, textAlign: "right" }}>On-Time %</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Quality %</th>
              <th style={{ ...thStyle, textAlign: "right" }}>
                Lead Time (days)
              </th>
              <th style={thStyle}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIER_PERF.map((s) => {
              const ratingColors: Record<
                string,
                { bg: string; color: string }
              > = {
                A: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
                B: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
                C: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
              };
              const rc = ratingColors[s.rating] ?? {
                bg: "var(--content-secondary)",
                color: "var(--text-secondary)",
              };
              return (
                <tr key={s.supplier}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{s.supplier}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        s.onTime >= 95
                          ? "#166534"
                          : s.onTime >= 85
                            ? "#92400E"
                            : "#991B1B",
                    }}
                  >
                    {s.onTime}%
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color:
                        s.quality >= 97
                          ? "#166534"
                          : s.quality >= 95
                            ? "var(--text-primary)"
                            : "#991B1B",
                    }}
                  >
                    {s.quality}%
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {s.leadDays}
                  </td>
                  <td style={tdStyle}>
                    <Badge
                      label={`Grade ${s.rating}`}
                      bg={rc.bg}
                      color={rc.color}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: HR Reports ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function HRTab() {
  const totalHeadcount = DEPT_HEADCOUNT.reduce((s, d) => s + d.count, 0);
  const totalPayroll = PAYROLL_SUMMARY[PAYROLL_SUMMARY.length - 1].amount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Total Headcount"
          value={String(totalHeadcount)}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Open Positions"
          value="8"
          subtitle="across 4 departments"
        />
        <KPICard
          title="Monthly Payroll"
          value={fmt(totalPayroll)}
          accentColor="#166534"
        />
        <KPICard title="Avg Tenure" value="2.8 yrs" subtitle="company-wide" />
      </div>

      {/* Headcount + Leave */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SectionPanel title="Headcount by Department">
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
              {DEPT_HEADCOUNT.map((d) => (
                <HorizontalBar
                  key={d.dept}
                  label={d.dept}
                  value={d.count}
                  max={Math.max(...DEPT_HEADCOUNT.map((x) => x.count))}
                  color={d.color}
                />
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <PieChart
              segments={DEPT_HEADCOUNT.map((d) => ({
                label: d.dept,
                value: d.count,
                color: d.color,
              }))}
              size={90}
            />
          </div>
        </SectionPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionPanel title="Leave Utilization">
            {LEAVE_UTIL.map((l) => (
              <div key={l.type} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    {l.type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {l.used} / {l.total} days
                  </span>
                </div>
                <div
                  style={{
                    height: 12,
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(l.used / l.total) * 100}%`,
                      height: "100%",
                      background: l.color,
                      borderRadius: 6,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            ))}
          </SectionPanel>

          <SectionPanel title="Hiring Pipeline">
            <FunnelChart stages={HIRING_PIPELINE} />
          </SectionPanel>
        </div>
      </div>

      {/* Payroll summary */}
      <TableCard
        title="Payroll Summary (Monthly)"
        actions={
          <ExportButton
            data={PAYROLL_SUMMARY as unknown as Record<string, unknown>[]}
            filename="payroll-summary"
            columns={[
              {
                key: "category" as keyof Record<string, unknown>,
                header: "Category",
              },
              {
                key: "amount" as keyof Record<string, unknown>,
                header: "Amount",
              },
            ]}
          />
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={{ ...thStyle, textAlign: "right" }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {PAYROLL_SUMMARY.map((p, i) => {
              const isTotal = i === PAYROLL_SUMMARY.length - 1;
              return (
                <tr
                  key={p.category}
                  style={{ background: isTotal ? "var(--content-secondary)" : "transparent" }}
                >
                  <td style={{ ...tdStyle, fontWeight: isTotal ? 700 : 400 }}>
                    {p.category}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: isTotal ? 700 : 600,
                    }}
                  >
                    {fmt(p.amount)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {isTotal ? "100%" : pct((p.amount / totalPayroll) * 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Custom Reports ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function CustomReportsTab() {
  const [module, setModule] = useState("sales");
  const [dateRange, setDateRange] = useState("last-30");
  const [groupBy, setGroupBy] = useState("month");
  const [metric, setMetric] = useState("revenue");

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    background: "var(--content-secondary)",
    outline: "none",
    fontSize: 13,
    color: "var(--text-primary)",
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
  };

  const modules = [
    { value: "sales", label: "Sales & CRM" },
    { value: "finance", label: "Finance" },
    { value: "hr", label: "Human Resources" },
    { value: "operations", label: "Operations & Inventory" },
    { value: "projects", label: "Projects & Issues" },
    { value: "marketing", label: "Marketing" },
    { value: "support", label: "Support & Tickets" },
  ];

  const dateRanges = [
    { value: "last-7", label: "Last 7 Days" },
    { value: "last-30", label: "Last 30 Days" },
    { value: "last-90", label: "Last 90 Days" },
    { value: "last-6m", label: "Last 6 Months" },
    { value: "last-12m", label: "Last 12 Months" },
    { value: "ytd", label: "Year to Date" },
    { value: "custom", label: "Custom Range" },
  ];

  const groupByOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "department", label: "Department" },
    { value: "category", label: "Category" },
    { value: "customer", label: "Customer" },
  ];

  const metricOptions: Record<
    string,
    Array<{ value: string; label: string }>
  > = {
    sales: [
      { value: "revenue", label: "Revenue" },
      { value: "orders", label: "Order Count" },
      { value: "aov", label: "Average Order Value" },
      { value: "leads", label: "Leads Generated" },
      { value: "win-rate", label: "Win Rate" },
    ],
    finance: [
      { value: "revenue", label: "Revenue" },
      { value: "expenses", label: "Expenses" },
      { value: "profit", label: "Net Profit" },
      { value: "margin", label: "Profit Margin" },
      { value: "ar", label: "Accounts Receivable" },
    ],
    hr: [
      { value: "headcount", label: "Headcount" },
      { value: "payroll", label: "Payroll Cost" },
      { value: "turnover", label: "Turnover Rate" },
      { value: "leave", label: "Leave Utilization" },
      { value: "hiring", label: "Hiring Pipeline" },
    ],
    operations: [
      { value: "inventory", label: "Inventory Value" },
      { value: "fulfillment", label: "Fulfillment Rate" },
      { value: "output", label: "Manufacturing Output" },
      { value: "turnover-rate", label: "Inventory Turnover" },
    ],
    projects: [
      { value: "active", label: "Active Projects" },
      { value: "issues", label: "Issue Count" },
      { value: "velocity", label: "Sprint Velocity" },
      { value: "completion", label: "Completion Rate" },
    ],
    marketing: [
      { value: "leads", label: "Leads" },
      { value: "cpl", label: "Cost per Lead" },
      { value: "campaigns", label: "Campaign Performance" },
      { value: "engagement", label: "Engagement Rate" },
    ],
    support: [
      { value: "tickets", label: "Ticket Count" },
      { value: "response-time", label: "Response Time" },
      { value: "resolution", label: "Resolution Rate" },
      { value: "satisfaction", label: "Customer Satisfaction" },
    ],
  };

  const currentMetrics = metricOptions[module] ?? metricOptions["sales"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Report builder form */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(6, 182, 212,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart3 size={18} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                display: "block",
              }}
            >
              Build Your Own Report
            </span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Select parameters below to generate a custom report
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {/* Module */}
          <div>
            <span style={labelStyle}>Module</span>
            <select aria-label="Select option"
              value={module}
              onChange={(e) => {
                setModule(e.target.value);
                setMetric(
                  metricOptions[e.target.value]?.[0]?.value ?? "revenue",
                );
              }}
              style={selectStyle}
            >
              {modules.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <span style={labelStyle}>Date Range</span>
            <select aria-label="Select option"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={selectStyle}
            >
              {dateRanges.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Group By */}
          <div>
            <span style={labelStyle}>Group By</span>
            <select aria-label="Select option"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              style={selectStyle}
            >
              {groupByOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric */}
          <div>
            <span style={labelStyle}>Metric</span>
            <select aria-label="Select option"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              style={selectStyle}
            >
              {currentMetrics.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate button */}
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(6, 182, 212,0.3)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 14px rgba(6, 182, 212,0.45)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(6, 182, 212,0.3)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            Generate Report
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Save as Template
          </button>
        </div>
      </div>

      {/* Coming Soon placeholder */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "2px dashed rgba(6, 182, 212,0.2)",
          borderRadius: 12,
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(6, 182, 212,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <BarChart3 size={28} style={{ color: "var(--vyne-purple)" }} />
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Custom Report Builder
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            maxWidth: 420,
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          The interactive query builder is coming soon. You will be able to
          create fully customizable reports with filters, pivot tables, and
          scheduled email delivery.
        </span>
        <Badge
          label="Coming Soon"
          bg="rgba(6, 182, 212,0.1)"
          color="var(--vyne-purple)"
        />

        {/* Preview of selected config */}
        <div
          style={{
            marginTop: 24,
            padding: "14px 20px",
            background: "var(--content-secondary)",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Module
            </span>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginTop: 2,
              }}
            >
              {modules.find((m) => m.value === module)?.label}
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Date Range
            </span>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginTop: 2,
              }}
            >
              {dateRanges.find((d) => d.value === dateRange)?.label}
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Group By
            </span>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginTop: 2,
              }}
            >
              {groupByOptions.find((g) => g.value === groupBy)?.label}
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Metric
            </span>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginTop: 2,
              }}
            >
              {currentMetrics.find((m) => m.value === metric)?.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Main Page ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function ReportingPage() {
  const [tab, setTab] = useState<ReportingTab>("dashboard");

  const tabs: { key: ReportingTab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "sales", label: "Sales Reports" },
    { key: "financial", label: "Financial Reports" },
    { key: "operations", label: "Operations Reports" },
    { key: "hr", label: "HR Reports" },
    { key: "custom", label: "Custom Reports" },
  ];

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
            style={{ background: "rgba(6, 182, 212,0.08)" }}
          >
            <BarChart3 size={18} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Reporting
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Cross-module analytics & custom reports
            </p>
          </div>
        </div>
      </header>

      {/* ─── Tabs ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--content-border)",
          paddingLeft: 24,
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        {tabs.map((t) => (
          <TabBtn
            key={t.key}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {/* ─── Content ────────────────────────────────── */}
      <div className="flex-1 overflow-auto content-scroll px-6 py-6">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "sales" && <SalesTab />}
        {tab === "financial" && <FinancialTab />}
        {tab === "operations" && <OperationsTab />}
        {tab === "hr" && <HRTab />}
        {tab === "custom" && <CustomReportsTab />}
      </div>
    </div>
  );
}
