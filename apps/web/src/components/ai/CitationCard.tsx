"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectsStore } from "@/lib/stores/projects";
import { resolveCitationHref } from "@/lib/ai/vyne-context";

interface Props {
  kind: string;
  id: string;
}

/**
 * Live citation card. Hovering / focusing the chip pops a small panel
 * with the record's real status, assignee, due date, etc., pulled from
 * the local store. Clicking navigates.
 */
export function CitationCard({ kind, id }: Props) {
  const [open, setOpen] = useState(false);
  const tasks = useProjectsStore((s) => s.tasks);
  const projects = useProjectsStore((s) => s.projects);

  const href = resolveCitationHref(kind, id);
  const record = lookupRecord(kind, id, { tasks, projects });

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {href ? (
        <Link href={href} style={{ textDecoration: "none" }}>
          <Chip kind={kind} id={id} />
        </Link>
      ) : (
        <Chip kind={kind} id={id} />
      )}
      {open && record && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            minWidth: 240,
            maxWidth: 320,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            boxShadow: "var(--elev-3)",
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            animation: "fadeIn 0.12s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 12.5 }}>
              {record.title}
            </span>
            {record.status && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: record.statusColor ?? "var(--vyne-teal-soft)",
                  color: record.statusFg ?? "var(--vyne-teal)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {record.status}
              </span>
            )}
          </div>
          {record.subtitle && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              {record.subtitle}
            </div>
          )}
          {record.fields.map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11.5,
                marginTop: 3,
              }}
            >
              <span
                style={{
                  color: "var(--text-tertiary)",
                  width: 64,
                  flexShrink: 0,
                }}
              >
                {f.label}
              </span>
              <span style={{ color: "var(--text-primary)", flex: 1 }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function Chip({ kind, id }: { kind: string; id: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        marginInline: 2,
        borderRadius: 999,
        background: "var(--vyne-teal-soft)",
        color: "var(--vyne-teal)",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        cursor: "pointer",
      }}
    >
      {kind}:{id}
    </span>
  );
}

function lookupRecord(
  kind: string,
  id: string,
  state: {
    tasks: ReturnType<typeof useProjectsStore.getState>["tasks"];
    projects: ReturnType<typeof useProjectsStore.getState>["projects"];
  },
): null | {
  title: string;
  subtitle?: string;
  status?: string;
  statusColor?: string;
  statusFg?: string;
  fields: Array<{ label: string; value: string }>;
} {
  if (kind === "task") {
    const t = state.tasks?.find(
      (x) => x.key === id || x.id === id,
    );
    if (!t) return null;
    const project = state.projects?.find((p) => p.id === t.projectId);
    return {
      title: t.title,
      subtitle: project?.name,
      status: t.status,
      fields: [
        { label: "Priority", value: t.priority ?? "—" },
        {
          label: "Assignee",
          value: t.assigneeId ?? "Unassigned",
        },
        { label: "Due", value: t.dueDate ?? "—" },
        { label: "Key", value: t.key ?? t.id },
      ],
    };
  }
  if (kind === "project") {
    const p = state.projects?.find((x) => x.id === id);
    if (!p) return null;
    return {
      title: p.name,
      subtitle: p.description,
      status: (p as { status?: string }).status,
      fields: [
        {
          label: "Lead",
          value: (p as { leadId?: string }).leadId ?? "—",
        },
      ],
    };
  }
  return null;
}
