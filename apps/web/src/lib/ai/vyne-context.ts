"use client";

// ─── Vyne AI workspace context collector ──────────────────────────
//
// Reads the user's Zustand stores and returns a compact, de-identified
// snapshot the Vyne AI route can ground on. Called from the Vyne AI
// chat page on every question (cheap — all stores are in memory).
//
// Intentionally keeps the payload small: only the fields an assistant
// actually needs to answer common questions. Per-record prose (e.g.
// full task descriptions, rich-text docs) is NOT shipped — the
// question routing can pull those in on demand later.

import { useProjectsStore } from "@/lib/stores/projects";
import { useCRMStore } from "@/lib/stores/crm";
import { useContactsStore } from "@/lib/stores/contacts";
import { useOpsStore } from "@/lib/stores/ops";
import { useInvoicingStore } from "@/lib/stores/invoicing";
import { useCustomFieldsStore } from "@/lib/stores/customFields";
import { getMember } from "@/lib/fixtures/projects";

export interface VyneContext {
  org?: { name?: string; plan?: string };
  projects?: Array<{
    id: string;
    name: string;
    identifier?: string;
    status?: string;
    leadName?: string;
    memberCount?: number;
    taskCount?: number;
    doneTaskCount?: number;
    updatedAt?: string;
  }>;
  tasks?: Array<{
    id: string;
    key?: string;
    title: string;
    projectName?: string;
    status: string;
    priority: string;
    assigneeName?: string | null;
    dueDate?: string | null;
    tags?: string[];
  }>;
  contacts?: Array<{
    id: string;
    name: string;
    email?: string;
    company?: string;
  }>;
  deals?: Array<{
    id: string;
    company: string;
    stage: string;
    value: number;
    probability?: number;
    assignee?: string;
    nextAction?: string;
  }>;
  products?: Array<{
    id: string;
    name: string;
    sku?: string;
    stock?: number;
    price?: number;
    status?: string;
  }>;
  invoices?: Array<{
    id: string;
    number?: string;
    customer?: string;
    status?: string;
    total?: number;
    dueDate?: string;
  }>;
  employees?: Array<{ id: string; name: string; role?: string; department?: string }>;
  customStatuses?: Array<{ module: string; id: string; label: string }>;
  customFields?: Array<{ module: string; id: string; label: string; type: string }>;
}

/**
 * Snapshot every relevant store. Safe to call from render; all stores
 * return references, no subscriptions happen here.
 */
export function collectVyneContext(): VyneContext {
  const p = useProjectsStore.getState();
  const c = useCRMStore.getState();
  const co = useContactsStore.getState();
  const o = useOpsStore.getState();
  const inv = useInvoicingStore.getState();
  const sch = useCustomFieldsStore.getState();

  const projectNames = new Map(p.projects.map((pr) => [pr.id, pr.name]));

  return {
    org: { name: "Your workspace" },
    projects: p.projects.slice(0, 50).map((pr) => ({
      id: pr.id,
      name: pr.name,
      identifier: pr.identifier,
      status: pr.status,
      leadName: pr.leadId ? getMember(pr.leadId)?.name : undefined,
      memberCount: pr.memberIds.length,
      taskCount: p.tasks.filter((t) => t.projectId === pr.id).length,
      doneTaskCount: p.tasks.filter((t) => t.projectId === pr.id && t.status === "done").length,
      updatedAt: pr.updatedAt,
    })),
    tasks: p.tasks.slice(0, 100).map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      projectName: projectNames.get(t.projectId),
      status: t.status,
      priority: t.priority,
      assigneeName: t.assigneeId ? getMember(t.assigneeId)?.name ?? null : null,
      dueDate: t.dueDate,
      tags: t.tags,
    })),
    contacts: co.contacts.slice(0, 50).map((ct) => {
      const acc = co.accounts.find((a) => a.id === ct.accountId);
      return {
        id: ct.id,
        name: ct.name,
        email: ct.email,
        company: acc?.name,
      };
    }),
    deals: c.deals.slice(0, 50).map((d) => ({
      id: d.id,
      company: d.company,
      stage: d.stage,
      value: d.value,
      probability: d.probability,
      assignee: d.assignee,
      nextAction: d.nextAction,
    })),
    products: o.products.slice(0, 50).map((pr) => ({
      id: pr.id,
      name: pr.name,
      sku: pr.sku,
      stock: pr.stockQty,
      price: pr.price,
      status: pr.status,
    })),
    invoices: inv.invoices.slice(0, 50).map((i) => ({
      id: i.id,
      number: i.number,
      customer: i.customer,
      status: i.status,
      total: i.amount,
      dueDate: i.dueDate,
    })),
    customStatuses: Object.entries(sch.schemas).flatMap(([moduleId, s]) =>
      s.statuses.map((st) => ({ module: moduleId, id: st.id, label: st.label })),
    ),
    customFields: Object.entries(sch.schemas).flatMap(([moduleId, s]) =>
      s.fields.map((f) => ({ module: moduleId, id: f.id, label: f.label, type: f.type })),
    ),
  };
}

/** Resolve a citation like [task:VYNE-42] to an in-app link. */
export function resolveCitationHref(kind: string, id: string): string | null {
  switch (kind) {
    case "project":
      return `/projects/${id}`;
    case "task": {
      // task cite = key (VYNE-42) not id; look it up
      const { tasks } = useProjectsStore.getState();
      const t = tasks.find((t) => t.key === id || t.id === id);
      if (!t) return null;
      return `/projects/${t.projectId}/tasks/${t.id}`;
    }
    case "deal":
      return `/crm`;
    case "contact":
      return `/contacts`;
    case "product":
      return `/ops`;
    case "invoice":
      return `/invoicing`;
    case "employee":
      return `/hr`;
    default:
      return null;
  }
}
