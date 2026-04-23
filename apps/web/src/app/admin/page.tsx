"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────
type Plan = "Starter" | "Growth" | "Enterprise";
type ServiceHealth = "green" | "yellow" | "red";

interface RecentTenant {
  readonly name: string;
  readonly plan: Plan;
  readonly date: string;
  readonly email: string;
}

interface ServiceStatus {
  readonly name: string;
  readonly status: ServiceHealth;
  readonly uptime: string;
}

// ─── Mock data ────────────────────────────────────────────────────
const REVENUE_DATA = [
  { month: "Oct", value: 4800 },
  { month: "Nov", value: 5200 },
  { month: "Dec", value: 5900 },
  { month: "Jan", value: 6400 },
  { month: "Feb", value: 6850 },
  { month: "Mar", value: 7019 },
];

const RECENT_SIGNUPS: RecentTenant[] = [
  {
    name: "NovaTech Solutions",
    plan: "Growth",
    date: "Mar 18, 2026",
    email: "admin@novatech.io",
  },
  {
    name: "Pinnacle Dynamics",
    plan: "Enterprise",
    date: "Mar 15, 2026",
    email: "ops@pinnacle.com",
  },
  {
    name: "DataFlow Analytics",
    plan: "Starter",
    date: "Mar 12, 2026",
    email: "admin@dataflow.ai",
  },
  {
    name: "Meridian Group",
    plan: "Growth",
    date: "Mar 8, 2026",
    email: "it@meridian.co",
  },
  {
    name: "Apex Retail Corp",
    plan: "Starter",
    date: "Mar 5, 2026",
    email: "tech@apexretail.com",
  },
];

const SERVICES: ServiceStatus[] = [
  { name: "API Gateway", status: "green", uptime: "99.98%" },
  { name: "Projects Service", status: "green", uptime: "99.95%" },
  { name: "Messaging Service", status: "green", uptime: "99.99%" },
  { name: "AI Service", status: "yellow", uptime: "99.2%" },
  { name: "Code Service", status: "green", uptime: "99.97%" },
  { name: "ERP Service", status: "green", uptime: "99.94%" },
  { name: "Notification Service", status: "green", uptime: "99.99%" },
  { name: "Observability Service", status: "green", uptime: "99.96%" },
  { name: "Auth Service", status: "green", uptime: "99.99%" },
];

// ─── Helpers ──────────────────────────────────────────────────────
function statusColor(s: ServiceHealth): string {
  if (s === "green") return "#22C55E";
  if (s === "yellow") return "#F59E0B";
  return "#EF4444";
}

function statusLabel(s: ServiceHealth): string {
  if (s === "green") return "Healthy";
  if (s === "yellow") return "Degraded";
  return "Down";
}

function planColor(plan: Plan): { bg: string; color: string } {
  if (plan === "Starter")
    return { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" };
  if (plan === "Growth")
    return { bg: "rgba(34,197,94,0.12)", color: "#4ADE80" };
  return { bg: "rgba(6, 182, 212,0.12)", color: "#67E8F9" };
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  change,
  changePositive,
  accent,
}: Readonly<{
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  accent: string;
}>) {
  return (
    <div
      style={{
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}40`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6060A0",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#E8E8F8",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: changePositive ? "#4ADE80" : "#F87171",
          marginTop: 8,
          fontWeight: 500,
        }}
      >
        {changePositive ? "↑" : "↓"} {change}
        <span style={{ color: "#6060A0", marginLeft: 6, fontWeight: 400 }}>
          vs last month
        </span>
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────
function RevenueChart({ data }: Readonly<{ data: typeof REVENUE_DATA }>) {
  const max = Math.max(...data.map((d) => d.value));
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div
      style={{
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "22px 24px",
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
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
            Monthly recurring revenue (last 6 months)
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#06B6D4",
            letterSpacing: "-0.03em",
          }}
        >
          ${data.at(-1)?.value.toLocaleString()}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 160,
          padding: "0 4px",
        }}
      >
        {data.map((d, i) => {
          const height = (d.value / max) * 140;
          const isHovered = hoveredIdx === i;
          const isLast = i === data.length - 1;

          let barBg = "rgba(6, 182, 212,0.25)";
          if (isLast) barBg = "linear-gradient(180deg, #8B68FF, #06B6D4)";
          else if (isHovered) barBg = "rgba(6, 182, 212,0.5)";

          return (
            <figure
              key={d.month}
              aria-label={`${d.month}: $${d.value.toLocaleString()}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "default",
                margin: 0,
              }}
            >
              {isHovered && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#E8E8F8",
                    background: "#252538",
                    padding: "3px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  ${d.value.toLocaleString()}
                </div>
              )}
              <div
                style={{
                  width: "100%",
                  maxWidth: 48,
                  height,
                  borderRadius: "8px 8px 4px 4px",
                  background: barBg,
                  transition: "all 0.2s",
                  transform: isHovered ? "scaleY(1.03)" : "none",
                  transformOrigin: "bottom",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: isLast ? "#67E8F9" : "#6060A0",
                  fontWeight: isLast ? 600 : 400,
                }}
              >
                {d.month}
              </span>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Signups ───────────────────────────────────────────────
function RecentSignups({
  tenants,
}: Readonly<{ tenants: readonly RecentTenant[] }>) {
  const router = useRouter();

  return (
    <div
      style={{
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
          Recent Signups
        </div>
        <button
          onClick={() => router.push("/admin/tenants")}
          style={{
            border: "none",
            background: "rgba(6, 182, 212,0.12)",
            color: "#67E8F9",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          View All
        </button>
      </div>
      <div>
        {tenants.map((t, idx) => {
          const pc = planColor(t.plan);
          return (
            <div
              key={t.name}
              style={{
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderTop:
                  idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${pc.color}30, ${pc.color}10)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: pc.color,
                  flexShrink: 0,
                }}
              >
                {t.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#E8E8F8" }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "#6060A0", marginTop: 1 }}>
                  {t.email}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 600,
                    background: pc.bg,
                    color: pc.color,
                  }}
                >
                  {t.plan}
                </span>
                <div style={{ fontSize: 10, color: "#6060A0", marginTop: 4 }}>
                  {t.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── System Health Summary ────────────────────────────────────────
function SystemHealthSummary({
  services,
}: Readonly<{ services: readonly ServiceStatus[] }>) {
  const router = useRouter();
  const greenCount = services.filter((s) => s.status === "green").length;
  const yellowCount = services.filter((s) => s.status === "yellow").length;
  const redCount = services.filter((s) => s.status === "red").length;

  return (
    <div
      style={{
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
          System Health
        </div>
        <button
          onClick={() => router.push("/admin/system")}
          style={{
            border: "none",
            background: "rgba(6, 182, 212,0.12)",
            color: "#67E8F9",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Details
        </button>
      </div>

      {/* Summary badges */}
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(34,197,94,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: "#4ADE80" }}>
            {greenCount}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#4ADE80",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            Healthy
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(245,158,11,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: "#FCD34D" }}>
            {yellowCount}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#FCD34D",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            Degraded
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F87171" }}>
            {redCount}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#F87171",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            Down
          </div>
        </div>
      </div>

      {/* Service list */}
      <div style={{ padding: "8px 12px" }}>
        {services.map((svc) => (
          <div
            key={svc.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 8px",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor(svc.status),
                boxShadow: `0 0 6px ${statusColor(svc.status)}40`,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 12, color: "#C8C8E0" }}>
              {svc.name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#6060A0",
                fontFamily: "monospace",
              }}
            >
              {svc.uptime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────
export default function AdminDashboardPage() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#E8E8F8",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#6060A0", margin: "4px 0 0" }}>
          Platform overview as of March 21, 2026
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Total Tenants"
          value="6"
          change="2 new this month"
          changePositive
          accent="#06B6D4"
        />
        <KPICard
          label="Total Users"
          value="168"
          change="12% growth"
          changePositive
          accent="#3B82F6"
        />
        <KPICard
          label="MRR"
          value="$7,019"
          change="2.5% from $6,850"
          changePositive
          accent="#22C55E"
        />
        <KPICard
          label="Active Now"
          value="43"
          change="8 more than avg"
          changePositive
          accent="#F59E0B"
        />
      </div>

      {/* Revenue Chart */}
      <div style={{ marginBottom: 24 }}>
        <RevenueChart data={REVENUE_DATA} />
      </div>

      {/* Bottom row: Recent Signups + System Health */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <RecentSignups tenants={RECENT_SIGNUPS} />
        <SystemHealthSummary services={SERVICES} />
      </div>
    </div>
  );
}
