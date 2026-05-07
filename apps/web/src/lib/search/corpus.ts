"use client";

import type { SearchableRecord } from "./core";
import { useCRMStore } from "@/lib/stores/crm";
import { useContactsStore } from "@/lib/stores/contacts";
import { useProjectsStore } from "@/lib/stores/projects";
import { useInvoicingStore } from "@/lib/stores/invoicing";
import { useDocsStore } from "@/lib/stores/docs";
import { useOpsStore } from "@/lib/stores/ops";

/**
 * Build the live searchable corpus by reading from every persisted
 * zustand store. Called fresh on every search keystroke (after debounce)
 * so the user sees today's data, not a stale snapshot.
 */

function safeGet<T>(getter: () => T): T | null {
  try {
    return getter();
  } catch {
    return null;
  }
}

export function buildGlobalCorpus(): SearchableRecord[] {
  const out: SearchableRecord[] = [];

  // CRM deals
  const crm = safeGet(() => useCRMStore.getState());
  if (crm?.deals) {
    for (const d of crm.deals) {
      out.push({
        id: d.id,
        type: "deal",
        title: d.company,
        subtitle: `${d.contactName} · $${d.value.toLocaleString()} · ${d.stage}`,
        href: `/crm?deal=${d.id}`,
        module: "crm",
        body: [d.contactName, d.email, d.notes, d.nextAction].filter(Boolean).join(" "),
        owner: d.assignee,
        updatedAt: d.lastActivity,
        tags: [d.stage, d.source].filter(Boolean) as string[],
      });
    }
  }

  // Contacts
  const contacts = safeGet(() => useContactsStore.getState());
  if (contacts?.contacts) {
    for (const c of contacts.contacts) {
      out.push({
        id: c.id,
        type: "contact",
        title: c.name,
        subtitle: c.company || c.email,
        href: `/contacts?id=${c.id}`,
        module: "contacts",
        body: [c.email, c.phone, c.title, c.department, c.company].filter(Boolean).join(" "),
        updatedAt: c.lastContact,
        tags: c.tags,
      });
    }
  }

  // Projects + tasks
  const projects = safeGet(() => useProjectsStore.getState());
  if (projects?.projects) {
    for (const p of projects.projects) {
      out.push({
        id: p.id,
        type: "project",
        title: p.name,
        subtitle: p.description,
        href: `/projects/${p.id}`,
        module: "projects",
        body: p.description,
        updatedAt: p.updatedAt,
        tags: [p.status, ...(p.tags ?? [])].filter(Boolean) as string[],
      });
    }
  }
  if (projects?.tasks) {
    for (const t of projects.tasks) {
      const project = projects.projects?.find((p) => p.id === t.projectId);
      out.push({
        id: t.id,
        type: "task",
        title: t.title,
        subtitle: `${project?.name ?? ""} · ${t.status}`,
        href: project ? `/projects/${project.id}?task=${t.id}` : "/projects",
        module: "projects",
        body: t.description,
        owner: t.assigneeId ?? undefined,
        updatedAt: t.updatedAt,
        tags: [t.status, t.priority, ...(t.tags ?? [])].filter(Boolean) as string[],
      });
      // 14.8 — surface attachments by name + uploader so users can find a
      // PDF or asset directly without remembering which task it lives on.
      // Real OCR (PDF/DOCX text extraction) plugs in here later via a
      // server-side enricher writing into a separate attachment store.
      for (const a of t.attachments ?? []) {
        out.push({
          id: a.id,
          type: "attachment",
          title: a.name,
          subtitle: `${a.type.toUpperCase()} · ${a.size} · on "${t.title}"`,
          href: project ? `/projects/${project.id}?task=${t.id}` : "/projects",
          module: "projects",
          body: `${a.uploadedBy} ${t.title}`,
          owner: a.uploadedBy,
          updatedAt: a.uploadedAt,
          tags: [a.type.toLowerCase()].filter(Boolean) as string[],
        });
      }
    }
  }

  // Invoicing
  const invoicing = safeGet(() => useInvoicingStore.getState());
  if (invoicing?.invoices) {
    for (const i of invoicing.invoices) {
      out.push({
        id: i.id,
        type: "invoice",
        title: `${i.number} · ${i.customer}`,
        subtitle: `$${i.amount.toLocaleString()} · ${i.status}`,
        href: `/invoicing?invoice=${i.id}`,
        module: "invoicing",
        body: i.notes,
        updatedAt: i.dueDate,
        tags: [i.status?.toLowerCase()].filter(Boolean) as string[],
      });
    }
  }

  // Docs (store key is `docs`)
  const docs = safeGet(() => useDocsStore.getState());
  if (docs?.docs) {
    for (const d of docs.docs) {
      out.push({
        id: d.id,
        type: "doc",
        title: d.title,
        subtitle: d.parentId ? "Sub-page" : "Doc",
        href: `/docs?doc=${d.id}`,
        module: "docs",
        body: typeof d.content === "string" ? d.content : undefined,
        owner: d.createdBy,
        updatedAt: d.updatedAt,
      });
    }
  }

  // Products
  const ops = safeGet(() => useOpsStore.getState());
  if (ops?.products) {
    for (const p of ops.products) {
      out.push({
        id: p.id,
        type: "product",
        title: p.name,
        subtitle: `SKU ${p.sku} · ${p.stockQty} in stock`,
        href: `/ops?product=${p.id}`,
        module: "ops",
        tags: [p.status?.toLowerCase(), p.categoryName?.toLowerCase()].filter(
          Boolean,
        ) as string[],
      });
    }
  }

  return out;
}

/** Vocabulary for did-you-mean — title tokens + tag values. */
export function buildVocabulary(): string[] {
  const corpus = buildGlobalCorpus();
  const set = new Set<string>();
  for (const rec of corpus) {
    for (const tok of rec.title.split(/\s+/)) {
      if (tok.length > 3) set.add(tok.toLowerCase());
    }
    for (const t of rec.tags ?? []) set.add(t.toLowerCase());
  }
  return Array.from(set);
}
