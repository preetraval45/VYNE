"use client";

import Link from "next/link";
import { useProjectsStore } from "@/lib/stores/projects";
import { useSalesStore } from "@/lib/stores/sales";
import { useContactsStore } from "@/lib/stores/contacts";

// Recognized @-mention syntaxes:
//   @VYNE-50            → task by key
//   @deal:acme-q4       → deal by id
//   @contact:c1         → contact by id
const TASK_RE = /@([A-Z]{2,6}-\d+)/g;
const KIND_RE = /@(deal|contact|project):([A-Za-z0-9_-]+)/g;

export interface ParsedMention {
  kind: "task" | "deal" | "contact" | "project";
  id: string;
}

export function extractTaskMentions(text: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const taskRe = new RegExp(TASK_RE);
  while ((m = taskRe.exec(text)) !== null) {
    const key = `task:${m[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "task", id: m[1] });
  }
  const kindRe = new RegExp(KIND_RE);
  while ((m = kindRe.exec(text)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: m[1] as ParsedMention["kind"], id: m[2] });
  }
  return out.slice(0, 4);
}

export function MentionPreview({ kind, id }: ParsedMention) {
  const tasks = useProjectsStore((s) => s.tasks);
  const projects = useProjectsStore((s) => s.projects);
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactsStore((s) => s.contacts);

  if (kind === "task") {
    const t = tasks?.find((x) => x.key === id);
    if (!t) return null;
    const project = projects?.find((p) => p.id === t.projectId);
    return (
      <MentionCard
        href={`/projects/${t.projectId}/tasks/${t.id}`}
        chip={t.key ?? id}
        title={t.title}
        subtitle={`${project?.name ?? "Project"} · ${t.priority ?? "—"}`}
        status={t.status}
      />
    );
  }
  if (kind === "deal") {
    const d = deals?.find((x) => x.id === id);
    if (!d) return null;
    return (
      <MentionCard
        href={`/crm/deals/${d.id}`}
        chip={`deal:${d.id}`}
        title={d.company ?? d.id}
        subtitle={`$${(d.value ?? 0).toLocaleString()} · ${d.stage ?? ""}`}
        status={d.stage}
      />
    );
  }
  if (kind === "contact") {
    const c = contacts?.find((x) => x.id === id);
    if (!c) return null;
    return (
      <MentionCard
        href={`/contacts/people/${c.id}`}
        chip={`contact:${c.id}`}
        title={c.name ?? id}
        subtitle={c.email ?? c.company ?? "Contact"}
      />
    );
  }
  if (kind === "project") {
    const p = projects?.find((x) => x.id === id);
    if (!p) return null;
    return (
      <MentionCard
        href={`/projects/${p.id}`}
        chip={`project:${p.id}`}
        title={p.name}
        subtitle={p.description?.slice(0, 80) ?? "Project"}
      />
    );
  }
  return null;
}

function MentionCard({
  href,
  chip,
  title,
  subtitle,
  status,
}: {
  href: string;
  chip: string;
  title: string;
  subtitle?: string;
  status?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid var(--vyne-teal-ring)",
        background: "var(--vyne-teal-soft)",
        textDecoration: "none",
        marginTop: 6,
        maxWidth: 380,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--vyne-teal)",
          padding: "2px 7px",
          borderRadius: 999,
          background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)",
          flexShrink: 0,
        }}
      >
        {chip}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            {subtitle}
          </span>
        )}
      </span>
      {status && (
        <span
          style={{
            fontSize: 10.5,
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--content-border)",
            fontWeight: 600,
          }}
        >
          {status}
        </span>
      )}
    </Link>
  );
}
