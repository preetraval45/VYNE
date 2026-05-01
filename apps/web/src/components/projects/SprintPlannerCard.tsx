"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Users } from "lucide-react";
import { useProjectsStore, useTeamMembers } from "@/lib/stores/projects";
import type { Task } from "@/lib/fixtures/projects";

const PRIORITY_HOURS: Record<Task["priority"], number> = {
  urgent: 6,
  high: 5,
  medium: 4,
  low: 3,
};

const SPRINT_HOURS_PER_PERSON = 30;

interface RecommendedSprint {
  capacity: number;
  recommended: Task[];
  recommendedHours: number;
  riskLevel: "ok" | "tight" | "over";
}

function recommend(tasks: Task[], teamSize: number): RecommendedSprint {
  const open = tasks.filter((t) => t.status !== "done");
  // Score: priority weight × (1 / age penalty); cap at urgent first.
  const scored = open
    .map((t) => {
      const age =
        (Date.now() - new Date(t.createdAt ?? t.updatedAt ?? Date.now()).getTime()) /
        86400000;
      const baseHours = t.estimatedHours ?? PRIORITY_HOURS[t.priority];
      const score =
        (t.priority === "urgent" ? 100 : t.priority === "high" ? 75 : t.priority === "medium" ? 50 : 25) +
        Math.min(age, 20);
      return { task: t, hours: baseHours, score };
    })
    .sort((a, b) => b.score - a.score);

  const capacity = Math.max(1, teamSize) * SPRINT_HOURS_PER_PERSON;
  const recommended: Task[] = [];
  let usedHours = 0;
  for (const item of scored) {
    if (usedHours + item.hours > capacity) continue;
    recommended.push(item.task);
    usedHours += item.hours;
    if (recommended.length >= 12) break;
  }

  const utilization = usedHours / capacity;
  const riskLevel: RecommendedSprint["riskLevel"] =
    utilization > 0.95 ? "over" : utilization > 0.8 ? "tight" : "ok";

  return { capacity, recommended, recommendedHours: usedHours, riskLevel };
}

export function SprintPlannerCard({ projectId }: { projectId?: string }) {
  const allTasks = useProjectsStore((s) => s.tasks);
  const members = useTeamMembers();
  const projects = useProjectsStore((s) => s.projects);

  const tasks = useMemo(() => {
    if (!projectId) return allTasks;
    return allTasks.filter((t) => t.projectId === projectId);
  }, [allTasks, projectId]);

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const teamSize = project ? Math.max(1, project.memberIds.length) : Math.max(1, members.length);

  const plan = useMemo(() => recommend(tasks, teamSize), [tasks, teamSize]);

  if (plan.recommended.length === 0) return null;

  const utilizationPct = Math.round((plan.recommendedHours / plan.capacity) * 100);
  const riskColor =
    plan.riskLevel === "over" ? "#B91C1C" : plan.riskLevel === "tight" ? "#C2410C" : "#0F9D58";
  const riskLabel =
    plan.riskLevel === "over" ? "over capacity" : plan.riskLevel === "tight" ? "tight" : "balanced";

  return (
    <section
      aria-label="AI sprint planner"
      style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.07), rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.05))",
        border: "1px solid rgba(108,71,255,0.16)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(108,71,255,0.14)",
              color: "var(--vyne-accent, var(--vyne-purple))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              AI sprint planner
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                }}
              >
                AI
              </span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-tertiary)",
                marginTop: 2,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Users size={11} /> {teamSize} member{teamSize === 1 ? "" : "s"} ·{" "}
              {plan.recommended.length} task{plan.recommended.length === 1 ? "" : "s"} ·{" "}
              <span style={{ color: riskColor, fontWeight: 600 }}>
                {utilizationPct}% load · {riskLabel}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/ai?prompt=Help%20me%20plan%20the%20next%20sprint%20based%20on%20open%20tasks%20and%20team%20capacity."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: "#fff",
            background: "var(--vyne-accent, var(--vyne-purple))",
            textDecoration: "none",
          }}
        >
          Refine with AI <ArrowRight size={11} />
        </Link>
      </header>

      <ol style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
        {plan.recommended.slice(0, 6).map((t) => {
          const assignee = members.find((m) => m.id === t.assigneeId);
          return (
            <li
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "2px 6px",
                  borderRadius: 4,
                  color: t.priority === "urgent" || t.priority === "high" ? "#B91C1C" : "var(--text-tertiary)",
                  background:
                    t.priority === "urgent" || t.priority === "high"
                      ? "rgba(220,38,38,0.08)"
                      : "var(--content-secondary)",
                }}
              >
                {t.priority}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--text-primary)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.title}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>
                {t.estimatedHours ?? PRIORITY_HOURS[t.priority]}h
                {assignee ? ` · ${assignee.name.split(" ")[0]}` : ""}
              </span>
            </li>
          );
        })}
        {plan.recommended.length > 6 && (
          <li style={{ fontSize: 11.5, color: "var(--text-tertiary)", paddingLeft: 12 }}>
            + {plan.recommended.length - 6} more task{plan.recommended.length - 6 === 1 ? "" : "s"} fit in budget
          </li>
        )}
      </ol>
    </section>
  );
}
