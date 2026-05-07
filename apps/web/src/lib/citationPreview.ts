"use client";

/**
 * Citation hover preview helpers (28.2.9).
 *
 * AI replies cite records as `[deal:DEAL-42]` / `[doc:doc-9]`. The
 * existing `<CitationCard>` pops a record summary on hover; this
 * helper resolves the citation to a full preview payload + a
 * "Open in module" deep-link the side panel renders.
 *
 *   const preview = resolveCitation("deal:DEAL-42");
 *   // → { title, subtitle, body, href, timestamps, owner }
 */

import { resolveCitationHref } from "@/lib/ai/vyne-context";

export interface CitationPreview {
  ref: string;
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  href?: string;
  timestamps?: Record<string, string>;
  owner?: string;
  /** Module the citation lives in. */
  module?: string;
  /** Stable colour hint (per-type). */
  color?: string;
}

const COLOR_BY_TYPE: Record<string, string> = {
  deal: "#22C55E",
  task: "#3B82F6",
  project: "#8B5CF6",
  invoice: "#F59E0B",
  contact: "#06B6D4",
  product: "#EC4899",
  doc: "#14B8A6",
  message: "#A855F7",
  channel: "#0EA5E9",
  attachment: "#64748B",
};

/**
 * Resolve a `type:id` citation into a preview payload. Reads the
 * appropriate Zustand store at call time (each `import` is lazy so
 * the citation card doesn't drag every store into the bundle).
 *
 * Returns null when the citation can't be resolved (record deleted,
 * type unknown). The host should fall back to rendering the raw
 * citation text in that case.
 */
export async function resolveCitation(
  ref: string,
): Promise<CitationPreview | null> {
  const [type, id] = parseRef(ref);
  if (!type || !id) return null;
  const href = resolveCitationHref(type, id) ?? undefined;
  const color = COLOR_BY_TYPE[type];

  switch (type) {
    case "deal": {
      const mod = await import("@/lib/stores/crm").catch(() => null);
      const deal = mod?.useCRMStore.getState().deals.find((d) => d.id === id);
      if (!deal) return null;
      return {
        ref,
        type,
        id,
        title: deal.company,
        subtitle: `${deal.stage} · $${deal.value.toLocaleString()}`,
        body: deal.contactName ? `Contact: ${deal.contactName}` : undefined,
        href,
        owner: deal.assignee ?? undefined,
        module: "crm",
        color,
      };
    }
    case "task": {
      const mod = await import("@/lib/stores/projects").catch(() => null);
      const task = mod?.useProjectsStore
        .getState()
        .tasks.find((t) => t.id === id);
      if (!task) return null;
      return {
        ref,
        type,
        id,
        title: task.title,
        subtitle: `${task.status} · ${task.priority ?? "P3"}`,
        body: task.description,
        href,
        owner: task.assigneeId ?? undefined,
        module: "projects",
        color,
      };
    }
    case "project": {
      const mod = await import("@/lib/stores/projects").catch(() => null);
      const project = mod?.useProjectsStore
        .getState()
        .projects.find((p) => p.id === id);
      if (!project) return null;
      return {
        ref,
        type,
        id,
        title: project.name,
        subtitle: project.status,
        href,
        module: "projects",
        color,
      };
    }
    case "invoice": {
      const mod = await import("@/lib/stores/invoicing").catch(() => null);
      const inv = mod?.useInvoicingStore
        .getState()
        .invoices.find((i) => i.id === id);
      if (!inv) return null;
      return {
        ref,
        type,
        id,
        title: inv.number,
        subtitle: `${inv.customer} · ${inv.status}`,
        body: `$${inv.amount.toLocaleString()} due ${inv.dueDate}`,
        href,
        module: "invoicing",
        color,
      };
    }
    case "contact": {
      // Contacts live in their own store with a different shape than CRM deals.
      const mod = await import("@/lib/stores/contacts").catch(() => null);
      type ContactRow = {
        id: string;
        name?: string;
        title?: string;
        company?: string;
        email?: string;
      };
      const list = (mod?.useContactsStore.getState() as { contacts?: ContactRow[] } | undefined)
        ?.contacts;
      const c = list?.find((x: ContactRow) => x.id === id);
      if (!c) return null;
      return {
        ref,
        type,
        id,
        title: c.name ?? id,
        subtitle: c.title ? `${c.title} · ${c.company ?? ""}` : c.company,
        body: c.email,
        href,
        module: "contacts",
        color,
      };
    }
    case "doc": {
      const mod = await import("@/hooks/useDocs").catch(() => null);
      // Hook-based store; fall back to a generic preview when offline.
      void mod;
      return {
        ref,
        type,
        id,
        title: id,
        href,
        module: "docs",
        color,
      };
    }
    default:
      return {
        ref,
        type,
        id,
        title: id,
        subtitle: type,
        href,
        color: color ?? "var(--text-tertiary)",
      };
  }
}

function parseRef(ref: string): [string, string] {
  const idx = ref.indexOf(":");
  if (idx < 0) return ["", ""];
  return [ref.slice(0, idx), ref.slice(idx + 1)];
}
