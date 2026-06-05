"use client";

import { useMemo } from "react";
import {
  Users,
  UserCheck,
  UserMinus,
  CalendarCheck,
  DollarSign,
  Award,
} from "lucide-react";
import { EMPLOYEES } from "@/lib/fixtures/hr";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  StackedBars,
  BarChart,
  Treemap,
  WeatherStrip,
  RadarChart,
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

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#6C47FF",
  Product: "#06B6D4",
  Sales: "#22C55E",
  Finance: "#F59E0B",
  Operations: "#EC4899",
};

export function HRDashboardView() {
  const {
    byDept,
    byStatus,
    salaryByDept,
    hoursByDept,
    avgVacation,
    onLeave,
    totalSalary,
    deptStatusGrid,
  } = useMemo(() => {
    const byDept = countBy(EMPLOYEES, (e) => e.department);
    const byStatus = countBy(EMPLOYEES, (e) => e.status);
    const salaryByDept = sumBy(
      EMPLOYEES,
      (e) => e.department,
      (e) => e.baseSalary,
    );
    const hoursByDept = sumBy(
      EMPLOYEES,
      (e) => e.department,
      (e) => e.hoursThisMonth,
    );
    const avgVacation = Math.round(
      EMPLOYEES.reduce((s, e) => s + e.vacationBalance, 0) /
        Math.max(EMPLOYEES.length, 1),
    );
    const onLeave = byStatus.get("On Leave") ?? 0;
    const totalSalary = EMPLOYEES.reduce((s, e) => s + e.baseSalary, 0);

    // Grid: dept × status
    const depts = Array.from(byDept.keys());
    const statuses = ["Active", "Remote", "On Leave"] as const;
    const deptStatusGrid = {
      groups: depts,
      segments: statuses.map((st, i) => ({
        label: st,
        color:
          st === "Active" ? "#22C55E" : st === "Remote" ? "#06B6D4" : "#F59E0B",
        values: depts.map(
          (d) =>
            EMPLOYEES.filter((e) => e.department === d && e.status === st)
              .length,
        ),
      })),
    };
    return {
      byDept,
      byStatus,
      salaryByDept,
      hoursByDept,
      avgVacation,
      onLeave,
      totalSalary,
      deptStatusGrid,
    };
  }, []);

  const kpis = [
    {
      label: "Headcount",
      value: EMPLOYEES.length.toString(),
      delta: "+2 this quarter",
      positive: true,
      icon: <Users size={16} />,
      accent: "#6C47FF",
      sparkline: syntheticMonthly(EMPLOYEES.length, 14, 0.02),
    },
    {
      label: "On Leave",
      value: onLeave.toString(),
      delta: `${Math.round((onLeave / Math.max(EMPLOYEES.length, 1)) * 100)}%`,
      positive: onLeave <= 2,
      icon: <UserMinus size={16} />,
      accent: "#F59E0B",
      sparkline: [1, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, onLeave],
    },
    {
      label: "Avg Vacation Bal.",
      value: `${avgVacation}d`,
      delta: avgVacation > 10 ? "use it" : "ok",
      positive: avgVacation <= 10,
      icon: <CalendarCheck size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(avgVacation, 14, 0.01),
    },
    {
      label: "Monthly Payroll",
      value: fmtMoney(totalSalary / 12),
      delta: "+1.4%",
      positive: false,
      icon: <DollarSign size={16} />,
      accent: "#EC4899",
      sparkline: syntheticMonthly(totalSalary / 144 || 50000, 14, 0.015),
    },
  ];

  /* ─── Dept donut ─── */
  const deptDonut = Array.from(byDept.entries()).map(([label, value], i) => ({
    label,
    value,
    color: DEPT_COLORS[label] ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  /* ─── Top earners (treemap) ─── */
  const topEarners = topN(EMPLOYEES, 8, (e) => e.baseSalary).map((e, i) => ({
    label: e.name,
    value: Math.round(e.baseSalary / 1000),
    color: DEPT_COLORS[e.department] ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  /* ─── Hours-this-month bars ─── */
  const hoursBars = Array.from(hoursByDept.entries())
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  /* ─── Status weather strip ─── */
  const employeeWeather = EMPLOYEES.slice(0, 8).map((e) => ({
    id: e.id,
    label: e.name,
    mood:
      e.status === "On Leave"
        ? ("rain" as const)
        : e.status === "Remote"
          ? ("cloudsun" as const)
          : e.usedLeaveThisYear > 15
            ? ("cloud" as const)
            : ("sun" as const),
    hint: e.department,
  }));

  /* ─── Department capacity radar ─── */
  const depts = Array.from(byDept.keys()).slice(0, 4);
  const radarAxes = [
    "Headcount",
    "Hours/mo",
    "Salary/mo",
    "Bonuses",
    "Retention",
  ];
  const radarSeries = depts.map((d, i) => {
    const dEmps = EMPLOYEES.filter((e) => e.department === d);
    const hc = dEmps.length;
    const hrs = dEmps.reduce((s, e) => s + e.hoursThisMonth, 0);
    const salary = dEmps.reduce((s, e) => s + e.baseSalary, 0);
    const bonus = dEmps.reduce((s, e) => s + e.bonus, 0);
    const retention =
      1 - dEmps.filter((e) => e.status === "On Leave").length / Math.max(hc, 1);
    return {
      name: d,
      color: DEPT_COLORS[d] ?? CHART_COLORS[i % CHART_COLORS.length],
      values: [
        Math.min(hc / 6, 1),
        Math.min(hrs / 800, 1),
        Math.min(salary / 500000, 1),
        Math.min(bonus / 50000, 1),
        retention,
      ],
    };
  });

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
        greeting={`${greetingFor()} — people overview`}
        metrics={[
          { label: "Headcount", value: EMPLOYEES.length },
          { label: "On Leave", value: onLeave },
          { label: "Payroll/mo", value: fmtMoney(totalSalary / 12) },
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
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <UserCheck size={13} /> Headcount by Department
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
              segments={deptDonut}
              centerValue={EMPLOYEES.length.toString()}
              centerLabel="Employees"
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
        <Card title="Department × Status">
          <StackedBars
            groups={deptStatusGrid.groups}
            segments={deptStatusGrid.segments}
            height={170}
          />
          <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
            {deptStatusGrid.segments.map((s) => (
              <span key={s.label} style={{ color: "var(--text-secondary)" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: s.color,
                    display: "inline-block",
                    borderRadius: 2,
                    marginRight: 4,
                  }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <Award size={13} /> Department Capacity Radar
            </>
          }
        >
          {radarSeries.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No data.
            </p>
          ) : (
            <>
              <RadarChart axes={radarAxes} series={radarSeries} />
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  gap: 8,
                  fontSize: 10.5,
                  flexWrap: "wrap",
                }}
              >
                {radarSeries.map((s) => (
                  <li key={s.name} style={{ color: "var(--text-secondary)" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: s.color,
                        display: "inline-block",
                        borderRadius: 2,
                        marginRight: 4,
                      }}
                    />
                    {s.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card title="Top Earners ($K)">
          <Treemap items={topEarners} />
        </Card>
        <Card title="Hours This Month by Dept">
          <BarChart bars={hoursBars} horizontal width={300} />
        </Card>
      </div>

      <Card title="Team Pulse (status)">
        <WeatherStrip items={employeeWeather} />
      </Card>
    </div>
  );
}
