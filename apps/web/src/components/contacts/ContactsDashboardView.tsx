"use client";

import { useMemo } from "react";
import { Users, Building2, TrendingUp, Activity, Star } from "lucide-react";
import { useContactsStore } from "@/lib/stores/contacts";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  AreaChart,
  BarChart,
  Treemap,
  WeatherStrip,
  ActivityCalendar,
  CHART_COLORS,
  fmtMoney,
  greetingFor,
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  bucketByDayMap,
  syntheticMonthly,
} from "@/lib/dashboard/aggregations";

export function ContactsDashboardView() {
  const contacts = useContactsStore((s) => s.contacts);
  const accounts = useContactsStore((s) => s.accounts);

  const {
    byDept,
    byAccount,
    byIndustry,
    revenueByAccount,
    contactsPerAccount,
    totalRevenue,
    avgEmployees,
    activityMap,
    accountStatus,
  } = useMemo(() => {
    const byDept = countBy(contacts, (c) => c.department || "Unspecified");
    const byAccount = countBy(contacts, (c) => c.accountId);
    const byIndustry = countBy(accounts, (a) => a.industry);
    const revenueByAccount = sumBy(
      accounts,
      (a) => a.id,
      (a) => a.revenue,
    );
    const contactsPerAccount = sumBy(
      contacts,
      (c) => c.accountId,
      () => 1,
    );
    const totalRevenue = accounts.reduce((s, a) => s + a.revenue, 0);
    const avgEmployees =
      accounts.length > 0
        ? Math.round(
            accounts.reduce((s, a) => s + a.employees, 0) / accounts.length,
          )
        : 0;
    const activityMap = bucketByDayMap(contacts, (c) => c.lastContact);
    const accountStatus = countBy(accounts, (a) => a.status);
    return {
      byDept,
      byAccount,
      byIndustry,
      revenueByAccount,
      contactsPerAccount,
      totalRevenue,
      avgEmployees,
      activityMap,
      accountStatus,
    };
  }, [contacts, accounts]);

  /* Recently contacted: within last 30 days */
  const cutoff = Date.now() - 30 * 86400000;
  const recentlyContacted = contacts.filter((c) => {
    const t = new Date(c.lastContact).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  }).length;

  /* VIP contacts (tag includes 'vip' or 'important') */
  const vipCount = contacts.filter((c) =>
    c.tags?.some((t) => /vip|key|important/i.test(t.toString())),
  ).length;

  const kpis = [
    {
      label: "Total Contacts",
      value: contacts.length.toString(),
      delta: `${accounts.length} accounts`,
      positive: true,
      icon: <Users size={16} />,
      accent: "#6C47FF",
      sparkline: syntheticMonthly(contacts.length || 5, 14, 0.04),
    },
    {
      label: "Active Accounts",
      value: (accountStatus.get("Active") ?? 0).toString(),
      delta: `${accounts.length} total`,
      positive: true,
      icon: <Building2 size={16} />,
      accent: "#06B6D4",
      sparkline: [
        3,
        4,
        4,
        5,
        6,
        6,
        7,
        7,
        8,
        8,
        9,
        9,
        accountStatus.get("Active") ?? 0,
      ],
    },
    {
      label: "Recently Contacted (30d)",
      value: recentlyContacted.toString(),
      delta: `${Math.round((recentlyContacted / Math.max(contacts.length, 1)) * 100)}%`,
      positive: recentlyContacted / Math.max(contacts.length, 1) > 0.5,
      icon: <TrendingUp size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(recentlyContacted || 1, 14, 0.05),
    },
    {
      label: "Pipeline Revenue",
      value: fmtMoney(totalRevenue),
      delta: `avg ${avgEmployees} emp`,
      positive: true,
      icon: <Star size={16} />,
      accent: "#F59E0B",
      sparkline: syntheticMonthly(totalRevenue / 12 || 50000, 14, 0.03),
    },
  ];

  const deptDonut = Array.from(byDept.entries()).map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const industryDonut = Array.from(byIndustry.entries()).map(
    ([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[(i + 2) % CHART_COLORS.length],
    }),
  );

  const contactsByAccountTreemap = topN(
    Array.from(contactsPerAccount.entries()),
    8,
    ([, v]) => v,
  ).map(([accId, value], i) => {
    const acc = accounts.find((a) => a.id === accId);
    return {
      label: acc?.name ?? accId,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  const topAccountsBars = topN(accounts, 6, (a) => a.revenue).map((a) => ({
    label: a.name,
    value: Math.round(a.revenue / 1000),
  }));

  const accountWeather = accounts.slice(0, 8).map((a) => ({
    id: a.id,
    label: a.name,
    mood:
      a.status === "Active" && a.revenue > 5000000
        ? ("sun" as const)
        : a.status === "Active"
          ? ("cloudsun" as const)
          : a.status === "Prospect"
            ? ("cloud" as const)
            : ("rain" as const),
    hint: a.industry,
  }));

  const contactsTrend = syntheticMonthly(contacts.length / 6 || 1, 6, 0.06);
  const accountsTrend = syntheticMonthly(accounts.length / 6 || 1, 6, 0.04);

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
        greeting={`${greetingFor()} — contacts overview`}
        metrics={[
          { label: "Contacts", value: contacts.length },
          { label: "Accounts", value: accounts.length },
          { label: "VIP", value: vipCount },
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
        <Card title="Growth (contacts + accounts, 6mo)">
          <AreaChart
            series={[
              { color: "#6C47FF", values: contactsTrend },
              { color: "#06B6D4", values: accountsTrend },
            ]}
            height={140}
          />
          <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#6C47FF",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Contacts
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#06B6D4",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Accounts
            </span>
          </div>
        </Card>
        <Card title="Top Accounts ($K revenue)">
          {topAccountsBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No accounts.
            </p>
          ) : (
            <BarChart bars={topAccountsBars} horizontal width={300} />
          )}
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Contacts by Department">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={
                deptDonut.length
                  ? deptDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={contacts.length.toString()}
              centerLabel="Contacts"
            />
            <Legend
              items={deptDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Accounts by Industry">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={
                industryDonut.length
                  ? industryDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={accounts.length.toString()}
              centerLabel="Accounts"
            />
            <Legend
              items={industryDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Contacts per Account">
          {contactsByAccountTreemap.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No contacts linked.
            </p>
          ) : (
            <Treemap items={contactsByAccountTreemap} />
          )}
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: 10,
        }}
      >
        <Card title="Account Weather">
          <WeatherStrip items={accountWeather} />
        </Card>
        <Card
          title={
            <>
              <Activity size={13} /> Contact Activity (12 weeks)
            </>
          }
        >
          <ActivityCalendar data={activityMap} weeks={12} tone="#6C47FF" />
        </Card>
      </div>
    </div>
  );
}
