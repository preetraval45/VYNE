"use client";

import { useMemo } from "react";
import {
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Wrench,
  Activity,
} from "lucide-react";
import { useFieldJobs, useTechnicians } from "@/lib/stores/fieldService";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  BarChart,
  FunnelChart,
  Treemap,
  USRegionMap,
  RadarChart,
  ActivityCalendar,
  CHART_COLORS,
  greetingFor,
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  bucketByDayMap,
} from "@/lib/dashboard/aggregations";

// PH-F typecheck fix — match the FieldJobStatus enum from the store
// ("scheduled" | "dispatched" | "in_progress" | "on_site" | "completed"
// | "cancelled"); the dashboard's local labels follow the same set.
const STATUS_ORDER = [
  "scheduled",
  "dispatched",
  "in_progress",
  "on_site",
  "completed",
] as const;
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#06B6D4",
  dispatched: "#8B5CF6",
  in_progress: "#F59E0B",
  on_site: "#A855F7",
  completed: "#22C55E",
  cancelled: "#EF4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F59E0B",
  normal: "#06B6D4",
  low: "#94A3B8",
};

export function FieldServiceDashboardView() {
  const jobs = useFieldJobs();
  const techs = useTechnicians();

  const {
    byStatus,
    byPriority,
    bySkill,
    byTechnician,
    byRegion,
    hoursByTech,
    inProgressCount,
    completedToday,
    urgentCount,
    activityMap,
  } = useMemo(() => {
    const byStatus = countBy(jobs, (j) => j.status);
    const byPriority = countBy(jobs, (j) => j.priority);
    const bySkill = countBy(jobs, (j) => j.skill);
    const byTechnician = countBy(
      jobs.filter((j) => j.technicianId),
      (j) => j.technicianId!,
    );
    const byRegion = countBy(jobs, (j) => j.region);
    const hoursByTech = sumBy(
      jobs,
      (j) => j.technicianId ?? "_unassigned",
      (j) => j.estimatedHours,
    );
    const inProgressCount = byStatus.get("in_progress") ?? 0;
    const today = new Date().toISOString().slice(0, 10);
    const completedToday = jobs.filter(
      (j) => j.status === "completed" && j.updatedAt?.startsWith(today),
    ).length;
    const urgentCount = byPriority.get("urgent") ?? 0;
    const activityMap = bucketByDayMap(jobs, (j) => j.scheduledStart);
    return {
      byStatus,
      byPriority,
      bySkill,
      byTechnician,
      byRegion,
      hoursByTech,
      inProgressCount,
      completedToday,
      urgentCount,
      activityMap,
    };
  }, [jobs]);

  const kpis = [
    {
      label: "Active Jobs",
      value: jobs.length.toString(),
      delta: `${inProgressCount} in progress`,
      positive: true,
      icon: <Truck size={16} />,
      accent: "#06B6D4",
      sparkline: [4, 6, 5, 7, 8, 7, 9, 10, 8, 11, 12, 10, jobs.length],
    },
    {
      label: "Completed Today",
      value: completedToday.toString(),
      delta: completedToday > 3 ? "great pace" : "ramp up",
      positive: completedToday > 3,
      icon: <CheckCircle2 size={16} />,
      accent: "#22C55E",
      sparkline: [2, 3, 2, 4, 3, 5, 4, 6, 5, 4, 6, 7, completedToday],
    },
    {
      label: "Urgent",
      value: urgentCount.toString(),
      delta: urgentCount === 0 ? "all clear" : "watch",
      positive: urgentCount === 0,
      icon: <AlertTriangle size={16} />,
      accent: "#EF4444",
      sparkline: [1, 0, 1, 2, 1, 0, 2, 1, 3, 2, 1, 1, urgentCount],
    },
    {
      label: "Technicians",
      value: techs.length.toString(),
      delta: "field crew",
      positive: true,
      icon: <Users size={16} />,
      accent: "#6C47FF",
      sparkline: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, techs.length],
    },
  ];

  const funnelStages = STATUS_ORDER.map((s) => ({
    label: s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: byStatus.get(s) ?? 0,
    color: STATUS_COLORS[s],
  })).filter((s) => s.value > 0);

  const statusDonut = Array.from(byStatus.entries()).map(([label, value]) => ({
    label: label.replace("_", " "),
    value,
    color: STATUS_COLORS[label] ?? CHART_COLORS[0],
  }));

  const priorityDonut = Array.from(byPriority.entries()).map(
    ([label, value]) => ({
      label,
      value,
      color: PRIORITY_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const skillTreemap = Array.from(bySkill.entries()).map(
    ([label, value], i) => ({
      label,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  const techJobBars = topN(techs, 8, (t) => byTechnician.get(t.id) ?? 0).map(
    (t) => ({
      label: t.name,
      value: byTechnician.get(t.id) ?? 0,
      color: t.color,
    }),
  );

  /* PH-F: FieldRegion is "north" | "south" | "east" | "west" | "central"
   * — there's no "midwest" in the source enum. Map north → midwest
   * proxy on the display side. */
  const regionMapped = {
    west: byRegion.get("west") ?? 0,
    midwest: byRegion.get("north") ?? 0,
    south: (byRegion.get("south") ?? 0) + (byRegion.get("central") ?? 0),
    northeast: byRegion.get("east") ?? 0,
  };

  /* Radar: tech capacity across axes */
  const radarTechs = techs.slice(0, 5);
  const radarAxes = [
    "Job Load",
    "Hours Booked",
    "Skills",
    "Coverage",
    "Capacity",
  ];
  const radarSeries = radarTechs.map((t, i) => {
    const jobLoad = byTechnician.get(t.id) ?? 0;
    const hours = hoursByTech.get(t.id) ?? 0;
    return {
      name: t.name,
      color: t.color || CHART_COLORS[i % CHART_COLORS.length],
      values: [
        Math.min(jobLoad / 8, 1),
        Math.min(hours / Math.max(t.weeklyCapacityHours, 1), 1),
        Math.min(t.skills.length / 4, 1),
        1, // coverage placeholder
        Math.max(0, 1 - hours / Math.max(t.weeklyCapacityHours, 1)),
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
        greeting={`${greetingFor()} — field ops`}
        metrics={[
          { label: "Open jobs", value: jobs.length },
          { label: "Techs", value: techs.length },
          { label: "Urgent", value: urgentCount },
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
        <Card title="Job Flow">
          {funnelStages.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No jobs yet.
            </p>
          ) : (
            <FunnelChart stages={funnelStages} />
          )}
        </Card>
        <Card
          title={
            <>
              <MapPin size={13} /> Jobs by Region
            </>
          }
        >
          <USRegionMap counts={regionMapped} />
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Status">
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
                statusDonut.length
                  ? statusDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={jobs.length.toString()}
              centerLabel="Jobs"
            />
            <Legend
              items={statusDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Priority Mix">
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
                priorityDonut.length
                  ? priorityDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={jobs.length.toString()}
              centerLabel="Total"
            />
            <Legend
              items={priorityDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card
          title={
            <>
              <Wrench size={13} /> Jobs by Skill
            </>
          }
        >
          {skillTreemap.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No skills tagged.
            </p>
          ) : (
            <Treemap items={skillTreemap} />
          )}
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 10,
        }}
      >
        <Card title="Technician Workload">
          {techJobBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No assignments.
            </p>
          ) : (
            <BarChart bars={techJobBars} horizontal width={320} />
          )}
        </Card>
        <Card title="Technician Capacity Radar">
          {radarSeries.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Add technicians to see capacity.
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
      </div>

      <Card
        title={
          <>
            <Activity size={13} /> Scheduled Heatmap (12 weeks)
          </>
        }
      >
        <ActivityCalendar data={activityMap} weeks={12} tone="#06B6D4" />
      </Card>
    </div>
  );
}
