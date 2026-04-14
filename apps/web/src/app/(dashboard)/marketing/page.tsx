"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";

// ─── Types ─────────────────────────────────────────────────────────
type MarketingTab = "campaigns" | "email" | "social" | "landing" | "analytics";
type CampaignChannel = "Email" | "Social" | "PPC" | "Content";
type CampaignStatus = "Draft" | "Active" | "Paused" | "Completed";
type EmailStatus = "Sent" | "Scheduled" | "Draft";
type LandingPageStatus = "Published" | "Draft";

interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  leadsGenerated: number;
  roi: number;
}

interface EmailCampaign {
  id: string;
  campaignName: string;
  subjectLine: string;
  recipients: number;
  sent: number;
  openRate: number;
  clickRate: number;
  bounced: number;
  status: EmailStatus;
}

interface SocialPlatform {
  id: string;
  platform: string;
  postCount: number;
  impressions: number;
  engagementRate: number;
  followers: number;
  lastPost: string;
}

interface LandingPage {
  id: string;
  pageName: string;
  url: string;
  visits: number;
  conversions: number;
  conversionRate: number;
  status: LandingPageStatus;
}

// ─── Mock Data ─────────────────────────────────────────────────────
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Spring Product Launch",
    channel: "Email",
    status: "Active",
    startDate: "2026-03-01",
    endDate: "2026-04-15",
    budget: 12000,
    spent: 7850,
    leadsGenerated: 342,
    roi: 3.2,
  },
  {
    id: "c2",
    name: "LinkedIn B2B Outreach",
    channel: "Social",
    status: "Active",
    startDate: "2026-02-15",
    endDate: "2026-05-15",
    budget: 8500,
    spent: 4200,
    leadsGenerated: 189,
    roi: 2.8,
  },
  {
    id: "c3",
    name: "Google Ads — Q1 Push",
    channel: "PPC",
    status: "Completed",
    startDate: "2026-01-01",
    endDate: "2026-03-15",
    budget: 25000,
    spent: 24800,
    leadsGenerated: 856,
    roi: 4.1,
  },
  {
    id: "c4",
    name: "Blog Content Series",
    channel: "Content",
    status: "Active",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    budget: 5000,
    spent: 2100,
    leadsGenerated: 124,
    roi: 2.4,
  },
  {
    id: "c5",
    name: "Summer Webinar Campaign",
    channel: "Email",
    status: "Draft",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    budget: 6500,
    spent: 0,
    leadsGenerated: 0,
    roi: 0,
  },
  {
    id: "c6",
    name: "Instagram Brand Awareness",
    channel: "Social",
    status: "Paused",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    budget: 4200,
    spent: 1900,
    leadsGenerated: 67,
    roi: 1.6,
  },
  {
    id: "c7",
    name: "Retargeting — Cart Abandonment",
    channel: "PPC",
    status: "Active",
    startDate: "2026-03-10",
    endDate: "2026-04-30",
    budget: 3800,
    spent: 1250,
    leadsGenerated: 98,
    roi: 3.7,
  },
  {
    id: "c8",
    name: "Whitepaper Lead Magnet",
    channel: "Content",
    status: "Completed",
    startDate: "2025-11-01",
    endDate: "2026-02-28",
    budget: 3200,
    spent: 3200,
    leadsGenerated: 215,
    roi: 5.2,
  },
];

const MOCK_EMAIL_CAMPAIGNS: EmailCampaign[] = [
  {
    id: "e1",
    campaignName: "Spring Launch Announcement",
    subjectLine: "Introducing our newest features...",
    recipients: 12500,
    sent: 12480,
    openRate: 34.2,
    clickRate: 8.7,
    bounced: 20,
    status: "Sent",
  },
  {
    id: "e2",
    campaignName: "Weekly Newsletter #47",
    subjectLine: "This Week in VYNE: Updates & Tips",
    recipients: 8200,
    sent: 8190,
    openRate: 28.5,
    clickRate: 5.2,
    bounced: 10,
    status: "Sent",
  },
  {
    id: "e3",
    campaignName: "Product Demo Invite",
    subjectLine: "Join our live demo — March 25",
    recipients: 3400,
    sent: 3398,
    openRate: 41.3,
    clickRate: 15.8,
    bounced: 2,
    status: "Sent",
  },
  {
    id: "e4",
    campaignName: "Customer Onboarding Drip #1",
    subjectLine: "Welcome to VYNE — Getting Started",
    recipients: 560,
    sent: 558,
    openRate: 62.1,
    clickRate: 24.3,
    bounced: 2,
    status: "Sent",
  },
  {
    id: "e5",
    campaignName: "April Promo Preview",
    subjectLine: "Exclusive early access for you...",
    recipients: 15000,
    sent: 0,
    openRate: 0,
    clickRate: 0,
    bounced: 0,
    status: "Scheduled",
  },
  {
    id: "e6",
    campaignName: "Re-engagement Series",
    subjectLine: "We miss you — here's 20% off",
    recipients: 4800,
    sent: 0,
    openRate: 0,
    clickRate: 0,
    bounced: 0,
    status: "Draft",
  },
];

const MOCK_SOCIAL: SocialPlatform[] = [
  {
    id: "s1",
    platform: "LinkedIn",
    postCount: 48,
    impressions: 125000,
    engagementRate: 4.8,
    followers: 12400,
    lastPost: "2026-03-21",
  },
  {
    id: "s2",
    platform: "Twitter",
    postCount: 124,
    impressions: 89000,
    engagementRate: 2.1,
    followers: 8700,
    lastPost: "2026-03-22",
  },
  {
    id: "s3",
    platform: "Instagram",
    postCount: 36,
    impressions: 67000,
    engagementRate: 5.6,
    followers: 6200,
    lastPost: "2026-03-20",
  },
  {
    id: "s4",
    platform: "Facebook",
    postCount: 28,
    impressions: 34000,
    engagementRate: 1.9,
    followers: 4100,
    lastPost: "2026-03-19",
  },
];

const MOCK_LANDING_PAGES: LandingPage[] = [
  {
    id: "l1",
    pageName: "Spring Product Launch",
    url: "/launch-spring-2026",
    visits: 4520,
    conversions: 342,
    conversionRate: 7.6,
    status: "Published",
  },
  {
    id: "l2",
    pageName: "Free Trial Signup",
    url: "/free-trial",
    visits: 8900,
    conversions: 1230,
    conversionRate: 13.8,
    status: "Published",
  },
  {
    id: "l3",
    pageName: "Webinar Registration",
    url: "/webinar-march",
    visits: 2100,
    conversions: 560,
    conversionRate: 26.7,
    status: "Published",
  },
  {
    id: "l4",
    pageName: "Enterprise Demo Request",
    url: "/enterprise-demo",
    visits: 1800,
    conversions: 145,
    conversionRate: 8.1,
    status: "Published",
  },
  {
    id: "l5",
    pageName: "Summer Campaign (WIP)",
    url: "/summer-2026",
    visits: 0,
    conversions: 0,
    conversionRate: 0,
    status: "Draft",
  },
];

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

// ─── Status / Channel badges ──────────────────────────────────────
function campaignStatusStyle(s: CampaignStatus): { bg: string; color: string } {
  const map: Record<CampaignStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Paused: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Completed: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  return map[s];
}

function channelStyle(c: CampaignChannel): { bg: string; color: string } {
  const map: Record<CampaignChannel, { bg: string; color: string }> = {
    Email: { bg: "#EFF6FF", color: "#1E40AF" },
    Social: { bg: "#F5F3FF", color: "#5B21B6" },
    PPC: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Content: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  };
  return map[c];
}

function emailStatusStyle(s: EmailStatus): { bg: string; color: string } {
  const map: Record<EmailStatus, { bg: string; color: string }> = {
    Sent: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Scheduled: { bg: "#EFF6FF", color: "#1E40AF" },
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
  };
  return map[s];
}

function landingStatusStyle(s: LandingPageStatus): {
  bg: string;
  color: string;
} {
  const map: Record<LandingPageStatus, { bg: string; color: string }> = {
    Published: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
  };
  return map[s];
}

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
}: Readonly<{
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
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
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accentColor ?? "var(--text-primary)",
        }}
      >
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {subtitle}
        </span>
      )}
    </div>
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

// ─── Bar Chart (CSS-only) ──────────────────────────────────────────
function BarChart({
  data,
  barColor,
  labelKey,
  valueKey,
  height = 140,
}: Readonly<{
  data: Array<Record<string, unknown>>;
  barColor?: string;
  labelKey: string;
  valueKey: string;
  height?: number;
}>) {
  const values = data.map((d) => Number(d[valueKey]));
  const maxVal = Math.max(...values, 1);
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
          <span
            style={{
              fontSize: 9,
              color: "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            {fmtNum(Number(d[valueKey]))}
          </span>
          <div
            style={{
              width: "100%",
              background: barColor ?? "var(--vyne-purple)",
              borderRadius: "4px 4px 0 0",
              height: `${(Number(d[valueKey]) / maxVal) * (height - 40)}px`,
              opacity: 0.85,
              minHeight: 4,
            }}
            title={`${d[labelKey]}: ${fmtNum(Number(d[valueKey]))}`}
          />
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {String(d[labelKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal bar (for channel performance) ─────────────────────
function HorizontalBar({
  label,
  value,
  max,
  color,
}: Readonly<{
  label: string;
  value: number;
  max: number;
  color: string;
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
          width: 70,
          flexShrink: 0,
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
          width: 40,
          textAlign: "right",
        }}
      >
        {value}
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
              {seg.label}: {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Campaigns ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function CampaignsTab() {
  const activeCampaigns = MOCK_CAMPAIGNS.filter(
    (c) => c.status === "Active",
  ).length;
  const totalBudget = MOCK_CAMPAIGNS.reduce((s, c) => s + c.budget, 0);
  const totalLeads = MOCK_CAMPAIGNS.reduce((s, c) => s + c.leadsGenerated, 0);
  const avgRoi =
    MOCK_CAMPAIGNS.filter((c) => c.roi > 0).reduce((s, c) => s + c.roi, 0) /
    MOCK_CAMPAIGNS.filter((c) => c.roi > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Active Campaigns"
          value={String(activeCampaigns)}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Total Budget"
          value={fmt(totalBudget)}
          subtitle={`${fmt(MOCK_CAMPAIGNS.reduce((s, c) => s + c.spent, 0))} spent`}
        />
        <KPICard
          title="Leads Generated"
          value={fmtNum(totalLeads)}
          accentColor="#166534"
        />
        <KPICard
          title="Avg ROI"
          value={`${avgRoi.toFixed(1)}x`}
          accentColor="var(--status-info)"
        />
      </div>

      {/* Campaign table */}
      <TableCard
        title="All Campaigns"
        actions={
          <ExportButton
            data={
              MOCK_CAMPAIGNS.map((c) => ({
                ...c,
                budget: c.budget,
                spent: c.spent,
              })) as unknown as Record<string, unknown>[]
            }
            filename="marketing-campaigns"
            columns={[
              { key: "name" as keyof Record<string, unknown>, header: "Name" },
              {
                key: "channel" as keyof Record<string, unknown>,
                header: "Channel",
              },
              {
                key: "status" as keyof Record<string, unknown>,
                header: "Status",
              },
              {
                key: "startDate" as keyof Record<string, unknown>,
                header: "Start Date",
              },
              {
                key: "endDate" as keyof Record<string, unknown>,
                header: "End Date",
              },
              {
                key: "budget" as keyof Record<string, unknown>,
                header: "Budget",
              },
              {
                key: "spent" as keyof Record<string, unknown>,
                header: "Spent",
              },
              {
                key: "leadsGenerated" as keyof Record<string, unknown>,
                header: "Leads",
              },
              { key: "roi" as keyof Record<string, unknown>, header: "ROI" },
            ]}
          />
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Channel</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Start Date</th>
              <th style={thStyle}>End Date</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Budget</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Spent</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Leads</th>
              <th style={{ ...thStyle, textAlign: "right" }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CAMPAIGNS.map((c) => {
              const cs = campaignStatusStyle(c.status);
              const ch = channelStyle(c.channel);
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid var(--content-border)" }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                  <td style={tdStyle}>
                    <Badge label={c.channel} bg={ch.bg} color={ch.color} />
                  </td>
                  <td style={tdStyle}>
                    <Badge label={c.status} bg={cs.bg} color={cs.color} />
                  </td>
                  <td style={tdSecondary}>{c.startDate}</td>
                  <td style={tdSecondary}>{c.endDate}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmt(c.budget)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmt(c.spent)}
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {c.leadsGenerated > 0 ? fmtNum(c.leadsGenerated) : "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        c.roi >= 3
                          ? "#166534"
                          : c.roi > 0
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                    }}
                  >
                    {c.roi > 0 ? `${c.roi.toFixed(1)}x` : "—"}
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
// ─── Tab: Email Marketing ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function EmailMarketingTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Total Recipients"
          value={fmtNum(
            MOCK_EMAIL_CAMPAIGNS.reduce((s, e) => s + e.recipients, 0),
          )}
        />
        <KPICard
          title="Emails Sent"
          value={fmtNum(MOCK_EMAIL_CAMPAIGNS.reduce((s, e) => s + e.sent, 0))}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Avg Open Rate"
          value={`${(
            MOCK_EMAIL_CAMPAIGNS.filter((e) => e.openRate > 0).reduce(
              (s, e) => s + e.openRate,
              0,
            ) / MOCK_EMAIL_CAMPAIGNS.filter((e) => e.openRate > 0).length
          ).toFixed(1)}%`}
          accentColor="#166534"
        />
        <KPICard
          title="Avg Click Rate"
          value={`${(
            MOCK_EMAIL_CAMPAIGNS.filter((e) => e.clickRate > 0).reduce(
              (s, e) => s + e.clickRate,
              0,
            ) / MOCK_EMAIL_CAMPAIGNS.filter((e) => e.clickRate > 0).length
          ).toFixed(1)}%`}
          accentColor="var(--status-info)"
        />
      </div>

      {/* Email campaigns table */}
      <TableCard
        title="Email Campaigns"
        actions={
          <ExportButton
            data={MOCK_EMAIL_CAMPAIGNS as unknown as Record<string, unknown>[]}
            filename="email-campaigns"
            columns={[
              {
                key: "campaignName" as keyof Record<string, unknown>,
                header: "Campaign",
              },
              {
                key: "subjectLine" as keyof Record<string, unknown>,
                header: "Subject",
              },
              {
                key: "recipients" as keyof Record<string, unknown>,
                header: "Recipients",
              },
              { key: "sent" as keyof Record<string, unknown>, header: "Sent" },
              {
                key: "openRate" as keyof Record<string, unknown>,
                header: "Open Rate",
              },
              {
                key: "clickRate" as keyof Record<string, unknown>,
                header: "Click Rate",
              },
              {
                key: "bounced" as keyof Record<string, unknown>,
                header: "Bounced",
              },
              {
                key: "status" as keyof Record<string, unknown>,
                header: "Status",
              },
            ]}
          />
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Campaign Name</th>
              <th style={thStyle}>Subject Line</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Recipients</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Open Rate</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Click Rate</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Bounced</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EMAIL_CAMPAIGNS.map((e) => {
              const es = emailStatusStyle(e.status);
              return (
                <tr key={e.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {e.campaignName}
                  </td>
                  <td
                    style={{
                      ...tdSecondary,
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.subjectLine}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmtNum(e.recipients)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {e.sent > 0 ? fmtNum(e.sent) : "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        e.openRate >= 30
                          ? "#166534"
                          : e.openRate > 0
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                    }}
                  >
                    {e.openRate > 0 ? `${e.openRate}%` : "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        e.clickRate >= 10
                          ? "#166534"
                          : e.clickRate > 0
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                    }}
                  >
                    {e.clickRate > 0 ? `${e.clickRate}%` : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {e.bounced > 0 ? e.bounced : "—"}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={e.status} bg={es.bg} color={es.color} />
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
// ─── Tab: Social Media ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function SocialMediaTab() {
  const platformColors: Record<string, string> = {
    LinkedIn: "#0A66C2",
    Twitter: "#1DA1F2",
    Instagram: "#E4405F",
    Facebook: "#1877F2",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Overview cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Total Followers"
          value={fmtNum(MOCK_SOCIAL.reduce((s, p) => s + p.followers, 0))}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Total Posts"
          value={String(MOCK_SOCIAL.reduce((s, p) => s + p.postCount, 0))}
        />
        <KPICard
          title="Total Impressions"
          value={fmtNum(MOCK_SOCIAL.reduce((s, p) => s + p.impressions, 0))}
          accentColor="var(--status-info)"
        />
        <KPICard
          title="Avg Engagement"
          value={`${(MOCK_SOCIAL.reduce((s, p) => s + p.engagementRate, 0) / MOCK_SOCIAL.length).toFixed(1)}%`}
          accentColor="#166534"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Platform table */}
        <TableCard
          title="Platform Metrics"
          actions={
            <ExportButton
              data={MOCK_SOCIAL as unknown as Record<string, unknown>[]}
              filename="social-media-metrics"
              columns={[
                {
                  key: "platform" as keyof Record<string, unknown>,
                  header: "Platform",
                },
                {
                  key: "postCount" as keyof Record<string, unknown>,
                  header: "Posts",
                },
                {
                  key: "impressions" as keyof Record<string, unknown>,
                  header: "Impressions",
                },
                {
                  key: "engagementRate" as keyof Record<string, unknown>,
                  header: "Engagement %",
                },
                {
                  key: "followers" as keyof Record<string, unknown>,
                  header: "Followers",
                },
                {
                  key: "lastPost" as keyof Record<string, unknown>,
                  header: "Last Post",
                },
              ]}
            />
          }
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Platform</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Posts</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Impressions</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Engage %</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Followers</th>
                <th style={thStyle}>Last Post</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SOCIAL.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <span
                      style={{
                        color:
                          platformColors[p.platform] ?? "var(--text-primary)",
                      }}
                    >
                      {p.platform}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {p.postCount}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmtNum(p.impressions)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color:
                        p.engagementRate >= 4
                          ? "#166534"
                          : "var(--text-primary)",
                    }}
                  >
                    {p.engagementRate}%
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmtNum(p.followers)}
                  </td>
                  <td style={tdSecondary}>{p.lastPost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        {/* Followers by platform chart */}
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
              marginBottom: 16,
              display: "block",
            }}
          >
            Followers by Platform
          </span>
          <div style={{ marginTop: 12 }}>
            {MOCK_SOCIAL.map((p) => (
              <HorizontalBar
                key={p.id}
                label={p.platform}
                value={p.followers}
                max={Math.max(...MOCK_SOCIAL.map((s) => s.followers))}
                color={platformColors[p.platform] ?? "#6C47FF"}
              />
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 12,
                display: "block",
              }}
            >
              Impressions by Platform
            </span>
            <PieChart
              segments={MOCK_SOCIAL.map((p) => ({
                label: p.platform,
                value: p.impressions,
                color: platformColors[p.platform] ?? "#6C47FF",
              }))}
              size={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Landing Pages ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function LandingPagesTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <KPICard
          title="Published Pages"
          value={String(
            MOCK_LANDING_PAGES.filter((l) => l.status === "Published").length,
          )}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Total Visits"
          value={fmtNum(MOCK_LANDING_PAGES.reduce((s, l) => s + l.visits, 0))}
        />
        <KPICard
          title="Total Conversions"
          value={fmtNum(
            MOCK_LANDING_PAGES.reduce((s, l) => s + l.conversions, 0),
          )}
          accentColor="#166534"
        />
        <KPICard
          title="Avg Conversion Rate"
          value={`${(
            MOCK_LANDING_PAGES.filter((l) => l.conversionRate > 0).reduce(
              (s, l) => s + l.conversionRate,
              0,
            ) / MOCK_LANDING_PAGES.filter((l) => l.conversionRate > 0).length
          ).toFixed(1)}%`}
          accentColor="var(--status-info)"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Landing pages table */}
        <TableCard
          title="Landing Pages"
          actions={
            <ExportButton
              data={MOCK_LANDING_PAGES as unknown as Record<string, unknown>[]}
              filename="landing-pages"
              columns={[
                {
                  key: "pageName" as keyof Record<string, unknown>,
                  header: "Page",
                },
                { key: "url" as keyof Record<string, unknown>, header: "URL" },
                {
                  key: "visits" as keyof Record<string, unknown>,
                  header: "Visits",
                },
                {
                  key: "conversions" as keyof Record<string, unknown>,
                  header: "Conversions",
                },
                {
                  key: "conversionRate" as keyof Record<string, unknown>,
                  header: "Conv Rate %",
                },
                {
                  key: "status" as keyof Record<string, unknown>,
                  header: "Status",
                },
              ]}
            />
          }
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Page Name</th>
                <th style={thStyle}>URL</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Visits</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Conversions</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Conv Rate</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_LANDING_PAGES.map((l) => {
                const ls = landingStatusStyle(l.status);
                return (
                  <tr key={l.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {l.pageName}
                    </td>
                    <td style={tdSecondary}>
                      <code
                        style={{
                          fontSize: 11,
                          background: "rgba(0,0,0,0.04)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {l.url}
                      </code>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {l.visits > 0 ? fmtNum(l.visits) : "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {l.conversions > 0 ? fmtNum(l.conversions) : "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 600,
                        color:
                          l.conversionRate >= 10
                            ? "#166534"
                            : l.conversionRate > 0
                              ? "var(--text-primary)"
                              : "var(--text-tertiary)",
                      }}
                    >
                      {l.conversionRate > 0 ? `${l.conversionRate}%` : "—"}
                    </td>
                    <td style={tdStyle}>
                      <Badge label={l.status} bg={ls.bg} color={ls.color} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>

        {/* Conversion rate chart */}
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
            Conversion Rate by Page
          </span>
          <BarChart
            data={MOCK_LANDING_PAGES.filter((l) => l.conversionRate > 0).map(
              (l) => ({
                label:
                  l.pageName.length > 12
                    ? l.pageName.slice(0, 12) + "..."
                    : l.pageName,
                value: l.conversionRate,
              }),
            )}
            labelKey="label"
            valueKey="value"
            barColor="#166534"
            height={160}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Tab: Analytics ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const totalLeads = MOCK_CAMPAIGNS.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalSpent = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spent, 0);
  const costPerLead = totalSpent / totalLeads;
  const overallConvRate = 4.8; // simulated

  // Channel performance data
  const channels: CampaignChannel[] = ["Email", "Social", "PPC", "Content"];
  const channelPerf = channels.map((ch) => {
    const campaignsInChannel = MOCK_CAMPAIGNS.filter((c) => c.channel === ch);
    const leads = campaignsInChannel.reduce((s, c) => s + c.leadsGenerated, 0);
    const spent = campaignsInChannel.reduce((s, c) => s + c.spent, 0);
    return { channel: ch, leads, spent, cpl: leads > 0 ? spent / leads : 0 };
  });

  // Monthly lead trend (simulated)
  const monthlyLeads = [
    { month: "Oct", leads: 280 },
    { month: "Nov", leads: 345 },
    { month: "Dec", leads: 190 },
    { month: "Jan", leads: 420 },
    { month: "Feb", leads: 510 },
    { month: "Mar", leads: 648 },
  ];

  const channelColors: Record<string, string> = {
    Email: "#1E40AF",
    Social: "#5B21B6",
    PPC: "#991B1B",
    Content: "#166534",
  };

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
          title="Total Leads"
          value={fmtNum(totalLeads)}
          accentColor="var(--vyne-purple)"
        />
        <KPICard
          title="Cost per Lead"
          value={fmt(Math.round(costPerLead))}
          subtitle="across all channels"
        />
        <KPICard
          title="Conversion Rate"
          value={`${overallConvRate}%`}
          accentColor="#166534"
        />
        <KPICard
          title="Total Spend"
          value={fmt(totalSpent)}
          subtitle={`of ${fmt(MOCK_CAMPAIGNS.reduce((s, c) => s + c.budget, 0))} budget`}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Lead trend chart */}
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
            Lead Generation Trend (6 Months)
          </span>
          <BarChart
            data={monthlyLeads.map((m) => ({ label: m.month, value: m.leads }))}
            labelKey="label"
            valueKey="value"
            barColor="var(--vyne-purple)"
            height={160}
          />
        </div>

        {/* Channel performance */}
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
            Channel Performance (Leads)
          </span>
          <div style={{ marginBottom: 16 }}>
            {channelPerf.map((cp) => (
              <HorizontalBar
                key={cp.channel}
                label={cp.channel}
                value={cp.leads}
                max={Math.max(...channelPerf.map((x) => x.leads))}
                color={channelColors[cp.channel] ?? "#6C47FF"}
              />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                display: "block",
                marginBottom: 10,
              }}
            >
              Budget Allocation
            </span>
            <PieChart
              segments={channelPerf.map((cp) => ({
                label: cp.channel,
                value: cp.spent,
                color: channelColors[cp.channel] ?? "#6C47FF",
              }))}
              size={90}
            />
          </div>
        </div>
      </div>

      {/* Cost per lead by channel */}
      <TableCard title="Cost per Lead by Channel">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Channel</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Leads</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Spend</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cost / Lead</th>
              <th style={thStyle}>Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {channelPerf.map((cp) => {
              const efficiency =
                cp.cpl <= 20
                  ? "Excellent"
                  : cp.cpl <= 35
                    ? "Good"
                    : cp.cpl <= 50
                      ? "Average"
                      : "Needs Improvement";
              const effColor =
                cp.cpl <= 20
                  ? "#166534"
                  : cp.cpl <= 35
                    ? "#1E40AF"
                    : cp.cpl <= 50
                      ? "#92400E"
                      : "var(--badge-danger-text)";
              const effBg =
                cp.cpl <= 20
                  ? "#F0FDF4"
                  : cp.cpl <= 35
                    ? "#EFF6FF"
                    : cp.cpl <= 50
                      ? "#FFFBEB"
                      : "#FEF2F2";
              return (
                <tr key={cp.channel}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <Badge
                      label={cp.channel}
                      bg={channelStyle(cp.channel as CampaignChannel).bg}
                      color={channelStyle(cp.channel as CampaignChannel).color}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{cp.leads}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmt(cp.spent)}
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {cp.cpl > 0 ? fmt(Math.round(cp.cpl)) : "—"}
                  </td>
                  <td style={tdStyle}>
                    {cp.leads > 0 && (
                      <Badge label={efficiency} bg={effBg} color={effColor} />
                    )}
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
// ─── Main Page ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function MarketingPage() {
  const [tab, setTab] = useState<MarketingTab>("campaigns");

  const tabs: { key: MarketingTab; label: string }[] = [
    { key: "campaigns", label: "Campaigns" },
    { key: "email", label: "Email Marketing" },
    { key: "social", label: "Social Media" },
    { key: "landing", label: "Landing Pages" },
    { key: "analytics", label: "Analytics" },
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
            style={{ background: "rgba(108,71,255,0.08)" }}
          >
            <Megaphone size={18} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Marketing
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Campaigns, email, social & analytics
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
        {tab === "campaigns" && <CampaignsTab />}
        {tab === "email" && <EmailMarketingTab />}
        {tab === "social" && <SocialMediaTab />}
        {tab === "landing" && <LandingPagesTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
