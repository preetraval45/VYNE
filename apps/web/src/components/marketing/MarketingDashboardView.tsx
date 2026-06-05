"use client";

import { useMemo } from "react";
import {
  Megaphone,
  Mail,
  Share2,
  TrendingUp,
  Target,
  DollarSign,
} from "lucide-react";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  AreaChart,
  BarChart,
  FunnelChart,
  Treemap,
  WeatherStrip,
  CHART_COLORS,
  fmtMoney,
  greetingFor,
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  syntheticMonthly,
} from "@/lib/dashboard/aggregations";

/* Marketing data lives inline in marketing/page.tsx (no dedicated store yet).
 * We re-declare a minimal demo dataset here so the dashboard renders without
 * coupling to the page module. When a `useMarketingStore` is introduced, swap
 * these constants for store hooks. */

interface DashCampaign {
  id: string;
  name: string;
  channel: "Email" | "Social" | "SEO" | "Paid Ads" | "Content";
  status: "Active" | "Paused" | "Completed";
  budget: number;
  spent: number;
  leadsGenerated: number;
  roi: number;
}

const DEMO_CAMPAIGNS: DashCampaign[] = [
  {
    id: "c1",
    name: "Spring Product Launch",
    channel: "Email",
    status: "Active",
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
    budget: 8500,
    spent: 4200,
    leadsGenerated: 189,
    roi: 2.8,
  },
  {
    id: "c3",
    name: "Webinar Q1",
    channel: "Content",
    status: "Completed",
    budget: 5500,
    spent: 5500,
    leadsGenerated: 410,
    roi: 4.1,
  },
  {
    id: "c4",
    name: "Google Ads Burst",
    channel: "Paid Ads",
    status: "Active",
    budget: 15000,
    spent: 11200,
    leadsGenerated: 281,
    roi: 2.1,
  },
  {
    id: "c5",
    name: "Blog SEO Push",
    channel: "SEO",
    status: "Active",
    budget: 4500,
    spent: 2100,
    leadsGenerated: 156,
    roi: 3.7,
  },
  {
    id: "c6",
    name: "Holiday Promo",
    channel: "Email",
    status: "Paused",
    budget: 6000,
    spent: 3500,
    leadsGenerated: 98,
    roi: 1.4,
  },
];

const CHANNEL_COLORS: Record<string, string> = {
  Email: "#06B6D4",
  Social: "#EC4899",
  SEO: "#22C55E",
  "Paid Ads": "#F59E0B",
  Content: "#8B5CF6",
};

export function MarketingDashboardView() {
  const campaigns = DEMO_CAMPAIGNS;

  const {
    byChannel,
    spentByChannel,
    leadsByChannel,
    byStatus,
    totalBudget,
    totalSpent,
    totalLeads,
    avgRoi,
    activeCount,
  } = useMemo(() => {
    const byChannel = countBy(campaigns, (c) => c.channel);
    const spentByChannel = sumBy(
      campaigns,
      (c) => c.channel,
      (c) => c.spent,
    );
    const leadsByChannel = sumBy(
      campaigns,
      (c) => c.channel,
      (c) => c.leadsGenerated,
    );
    const byStatus = countBy(campaigns, (c) => c.status);
    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
    const avgRoi =
      campaigns.length > 0
        ? Math.round(
            (campaigns.reduce((s, c) => s + c.roi, 0) / campaigns.length) * 10,
          ) / 10
        : 0;
    const activeCount = byStatus.get("Active") ?? 0;
    return {
      byChannel,
      spentByChannel,
      leadsByChannel,
      byStatus,
      totalBudget,
      totalSpent,
      totalLeads,
      avgRoi,
      activeCount,
    };
  }, []);

  const kpis = [
    {
      label: "Active Campaigns",
      value: activeCount.toString(),
      delta: `${campaigns.length} total`,
      positive: true,
      icon: <Megaphone size={16} />,
      accent: "#EC4899",
      sparkline: [2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, activeCount],
    },
    {
      label: "Spend (YTD)",
      value: fmtMoney(totalSpent),
      delta: `${Math.round((totalSpent / Math.max(totalBudget, 1)) * 100)}% of budget`,
      positive: totalSpent / Math.max(totalBudget, 1) < 0.9,
      icon: <DollarSign size={16} />,
      accent: "#F59E0B",
      sparkline: syntheticMonthly(totalSpent / 12 || 2000, 14, 0.04),
    },
    {
      label: "Leads Generated",
      value: totalLeads.toLocaleString(),
      delta: "+18%",
      positive: true,
      icon: <Target size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(totalLeads / 12 || 100, 14, 0.06),
    },
    {
      label: "Average ROI",
      value: `${avgRoi}×`,
      delta: avgRoi >= 2 ? "healthy" : "improve",
      positive: avgRoi >= 2,
      icon: <TrendingUp size={16} />,
      accent: "#6C47FF",
      sparkline: [
        1.8,
        2.0,
        2.1,
        2.3,
        2.5,
        2.7,
        2.6,
        2.8,
        3.0,
        3.1,
        2.9,
        avgRoi,
      ],
    },
  ];

  /* Funnel: synthetic — impressions → clicks → leads → conversions */
  const funnel = [
    {
      label: "Impressions",
      value: Math.round(totalLeads * 60),
      color: "#94A3B8",
    },
    { label: "Clicks", value: Math.round(totalLeads * 6), color: "#06B6D4" },
    { label: "Leads", value: totalLeads, color: "#A855F7" },
    {
      label: "Conversions",
      value: Math.round(totalLeads * 0.18),
      color: "#22C55E",
    },
  ];

  const channelDonut = Array.from(byChannel.entries()).map(
    ([label, value]) => ({
      label,
      value,
      color: CHANNEL_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const spendTreemap = Array.from(spentByChannel.entries()).map(
    ([label, value]) => ({
      label,
      value: Math.round(value / 1000),
      color: CHANNEL_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const roiBars = topN(campaigns, 6, (c) => c.roi).map((c) => ({
    label: c.name,
    value: Math.round(c.roi * 10) / 10,
    color: CHANNEL_COLORS[c.channel],
  }));

  const leadsByChannelBars = Array.from(leadsByChannel.entries()).map(
    ([label, value]) => ({
      label,
      value,
      color: CHANNEL_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const weatherItems = campaigns.slice(0, 6).map((c) => ({
    id: c.id,
    label: c.name,
    mood:
      c.roi >= 3
        ? ("sun" as const)
        : c.roi >= 2
          ? ("cloudsun" as const)
          : c.roi >= 1.5
            ? ("cloud" as const)
            : ("rain" as const),
    hint: `${c.roi}× ROI`,
  }));

  const spendTrend = syntheticMonthly(totalSpent / 12 || 2000, 12, 0.05);
  const leadsTrend = syntheticMonthly(totalLeads / 12 || 100, 12, 0.06);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "16px 20px 32px",
        background: "var(--content-bg-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <HeroBanner
        greeting={`${greetingFor()} — marketing pulse`}
        metrics={[
          { label: "Spend", value: fmtMoney(totalSpent) },
          { label: "Leads", value: totalLeads },
          { label: "ROI", value: `${avgRoi}×` },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {kpis.map((k) => (
          <GradientKpiTile key={k.label} {...k} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <Target size={13} /> Marketing Funnel
            </>
          }
        >
          <FunnelChart stages={funnel} />
        </Card>
        <Card
          title={
            <>
              <Share2 size={13} /> Channel Mix
            </>
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={channelDonut}
              centerValue={campaigns.length.toString()}
              centerLabel="Campaigns"
            />
            <Legend
              items={channelDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card
        title={
          <>
            <Mail size={13} /> Spend & Leads Trend (12 months)
          </>
        }
      >
        <AreaChart
          series={[
            {
              color: "#F59E0B",
              values: spendTrend.map((v) => Math.round(v / 100)),
            },
            {
              color: "#22C55E",
              values: leadsTrend.map((v) => Math.round(v / 10)),
            },
          ]}
          forecast={{ steps: 3, spread: 8 }}
          height={150}
        />
        <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
          <span style={{ color: "var(--text-secondary)" }}>
            <span
              style={{
                width: 8,
                height: 8,
                background: "#F59E0B",
                display: "inline-block",
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            Spend (×$100)
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            <span
              style={{
                width: 8,
                height: 8,
                background: "#22C55E",
                display: "inline-block",
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            Leads (×10)
          </span>
          <span style={{ color: "var(--text-tertiary)", marginLeft: "auto" }}>
            shaded = 3mo forecast
          </span>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Top Campaigns by ROI">
          <BarChart bars={roiBars} horizontal width={300} />
        </Card>
        <Card title="Spend by Channel ($K)">
          <Treemap items={spendTreemap} />
        </Card>
        <Card title="Leads by Channel">
          <BarChart bars={leadsByChannelBars} horizontal width={300} />
        </Card>
      </div>

      <Card title="Campaign Weather">
        <WeatherStrip items={weatherItems} />
      </Card>
    </div>
  );
}
