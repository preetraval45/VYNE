"use client";

import { useCRMStore } from "@/lib/stores/crm";
import { useProjectsStore } from "@/lib/stores/projects";
import { useContactsStore } from "@/lib/stores/contacts";
import { useOpsStore } from "@/lib/stores/ops";
import { useInvoicingStore } from "@/lib/stores/invoicing";
import type { Deal, Stage } from "@/lib/fixtures/crm";

// Vyne AI tool executor — runs server-emitted tool calls against the
// client's Zustand stores. Returns a result object that the chat UI
// renders as a "tool chip" under the assistant message.

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  rationale?: string;
}

export interface ToolResult {
  tool: string;
  ok: boolean;
  label: string;
  detail?: string;
  /** Optional href so the chip can deep-link to the new/updated record. */
  href?: string;
}

function uid(prefix = "x") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function asEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.tool) {
      case "createDeal": {
        const a = call.args;
        const company = asString(a.company);
        if (!company) return { tool: call.tool, ok: false, label: "createDeal", detail: "Missing company" };
        const deal: Deal = {
          id: uid("d"),
          company,
          contactName: asString(a.contactName),
          email: asString(a.email),
          stage: asEnum<Stage>(
            a.stage,
            ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
            "Lead",
          ),
          value: asNumber(a.value),
          probability: asNumber(a.probability),
          assignee: asString(a.assignee, "Alex"),
          lastActivity: new Date().toISOString(),
          nextAction: asString(a.nextAction, "Follow up"),
          source: asEnum(a.source, ["website", "referral", "outbound", "inbound"] as const, "inbound"),
          notes: asString(a.notes),
        };
        useCRMStore.getState().addDeal(deal);
        return {
          tool: call.tool,
          ok: true,
          label: `Created deal — ${company}`,
          detail: deal.value ? `$${deal.value.toLocaleString()} · ${deal.stage}` : deal.stage,
          href: "/crm",
        };
      }

      case "updateDeal": {
        const id = asString(call.args.id);
        const patch = (call.args.patch as Partial<Deal>) ?? {};
        if (!id) return { tool: call.tool, ok: false, label: "updateDeal", detail: "Missing id" };
        const existing = useCRMStore.getState().deals.find((d) => d.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "updateDeal", detail: "Deal not found" };
        useCRMStore.getState().updateDeal(id, { ...patch, lastActivity: new Date().toISOString() });
        return {
          tool: call.tool,
          ok: true,
          label: `Updated deal — ${existing.company}`,
          detail: Object.keys(patch).slice(0, 3).join(", "),
          href: "/crm",
        };
      }

      case "deleteDeal": {
        const id = asString(call.args.id);
        const existing = useCRMStore.getState().deals.find((d) => d.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "deleteDeal", detail: "Deal not found" };
        useCRMStore.getState().deleteDeal(id);
        return { tool: call.tool, ok: true, label: `Deleted deal — ${existing.company}` };
      }

      case "createTask": {
        const a = call.args;
        const projectName = asString(a.projectName);
        const title = asString(a.title);
        if (!projectName || !title)
          return { tool: call.tool, ok: false, label: "createTask", detail: "Missing project or title" };
        const project = useProjectsStore.getState().projects.find(
          (p) => p.name.toLowerCase() === projectName.toLowerCase() ||
                 p.identifier?.toLowerCase() === projectName.toLowerCase(),
        );
        if (!project)
          return { tool: call.tool, ok: false, label: "createTask", detail: `No project "${projectName}"` };
        const members = useProjectsStore.getState().teamMembers;
        const assigneeName = asString(a.assigneeName);
        const matchedAssignee = assigneeName
          ? members.find((m) => m.name.toLowerCase() === assigneeName.toLowerCase())
          : undefined;
        useProjectsStore.getState().addTask(project.id, {
          title,
          description: asString(a.description),
          status: asEnum(a.status, ["todo", "in_progress", "in_review", "done", "blocked"] as const, "todo"),
          priority: asEnum(a.priority, ["low", "medium", "high", "urgent"] as const, "medium"),
          assigneeId: matchedAssignee?.id ?? null,
          startDate: null,
          dueDate: asString(a.dueDate) || null,
          estimatedHours: null,
          timeSpent: null,
          tags: [],
          subtasks: [],
          comments: [],
        });
        return {
          tool: call.tool,
          ok: true,
          label: `Created task — ${title}`,
          detail: project.name,
          href: `/projects/${project.id}`,
        };
      }

      case "updateTask": {
        const id = asString(call.args.id);
        const patch = (call.args.patch as Record<string, unknown>) ?? {};
        const existing = useProjectsStore.getState().tasks.find((t) => t.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "updateTask", detail: "Task not found" };
        useProjectsStore.getState().updateTask(id, patch as never);
        return { tool: call.tool, ok: true, label: `Updated task — ${existing.title}` };
      }

      case "deleteTask": {
        const id = asString(call.args.id);
        const existing = useProjectsStore.getState().tasks.find((t) => t.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "deleteTask", detail: "Task not found" };
        useProjectsStore.getState().deleteTask(id);
        return { tool: call.tool, ok: true, label: `Deleted task — ${existing.title}` };
      }

      case "createContact": {
        const a = call.args;
        const name = asString(a.name);
        if (!name) return { tool: call.tool, ok: false, label: "createContact", detail: "Missing name" };
        useContactsStore.getState().addContact({
          name,
          email: asString(a.email),
          phone: asString(a.phone),
          company: asString(a.company),
          accountId: "",
          title: asString(a.title),
          department: "",
          lastContact: new Date().toISOString().slice(0, 10),
          tags: [],
        });
        return { tool: call.tool, ok: true, label: `Created contact — ${name}`, href: "/contacts" };
      }

      case "updateContact": {
        const id = asString(call.args.id);
        const patch = (call.args.patch as Record<string, unknown>) ?? {};
        const existing = useContactsStore.getState().contacts.find((c) => c.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "updateContact", detail: "Contact not found" };
        useContactsStore.getState().updateContact(id, patch as never);
        return { tool: call.tool, ok: true, label: `Updated contact — ${existing.name}` };
      }

      case "deleteContact": {
        const id = asString(call.args.id);
        const existing = useContactsStore.getState().contacts.find((c) => c.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "deleteContact", detail: "Contact not found" };
        useContactsStore.getState().deleteContact(id);
        return { tool: call.tool, ok: true, label: `Deleted contact — ${existing.name}` };
      }

      case "createProduct": {
        const a = call.args;
        const name = asString(a.name);
        if (!name) return { tool: call.tool, ok: false, label: "createProduct", detail: "Missing name" };
        const stockQty = asNumber(a.stockQty);
        useOpsStore.getState().addProduct({
          id: uid("p"),
          name,
          sku: asString(a.sku, `SKU-${uid("").slice(2, 8).toUpperCase()}`),
          price: asNumber(a.price),
          costPrice: asNumber(a.costPrice),
          stockQty,
          uom: asString(a.uom, "pcs"),
          categoryName: asString(a.categoryName, "General"),
          status: stockQty > 10 ? "in_stock" : stockQty > 0 ? "low_stock" : "out_of_stock",
        });
        return { tool: call.tool, ok: true, label: `Created product — ${name}`, href: "/ops" };
      }

      case "updateProduct": {
        const id = asString(call.args.id);
        const patch = (call.args.patch as Record<string, unknown>) ?? {};
        const existing = useOpsStore.getState().products.find((p) => p.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "updateProduct", detail: "Product not found" };
        useOpsStore.getState().updateProduct(id, patch as never);
        return { tool: call.tool, ok: true, label: `Updated product — ${existing.name}` };
      }

      case "deleteProduct": {
        const id = asString(call.args.id);
        const existing = useOpsStore.getState().products.find((p) => p.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "deleteProduct", detail: "Product not found" };
        useOpsStore.getState().deleteProduct(id);
        return { tool: call.tool, ok: true, label: `Deleted product — ${existing.name}` };
      }

      case "createInvoice": {
        const a = call.args;
        const customerName = asString(a.customerName);
        const total = asNumber(a.total);
        if (!customerName || !total)
          return { tool: call.tool, ok: false, label: "createInvoice", detail: "Need customer + total" };
        const due = asString(a.dueDate) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        useInvoicingStore.getState().addInvoice({
          customer: customerName,
          dueDate: due,
          items: [{ description: "Services", qty: 1, rate: total }],
          notes: asString(a.notes),
        });
        return { tool: call.tool, ok: true, label: `Created invoice — ${customerName}`, detail: `$${total.toLocaleString()}`, href: "/invoicing" };
      }

      case "updateInvoice": {
        const id = asString(call.args.id);
        const patch = (call.args.patch as Record<string, unknown>) ?? {};
        const existing = useInvoicingStore.getState().invoices.find((i) => i.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "updateInvoice", detail: "Invoice not found" };
        useInvoicingStore.getState().updateInvoice(id, patch as never);
        return { tool: call.tool, ok: true, label: `Updated invoice — ${existing.number}` };
      }

      case "deleteInvoice": {
        const id = asString(call.args.id);
        const existing = useInvoicingStore.getState().invoices.find((i) => i.id === id);
        if (!existing) return { tool: call.tool, ok: false, label: "deleteInvoice", detail: "Invoice not found" };
        useInvoicingStore.getState().deleteInvoice(id);
        return { tool: call.tool, ok: true, label: `Deleted invoice — ${existing.number}` };
      }

      case "createSupplier": {
        const a = call.args;
        const name = asString(a.name);
        if (!name) return { tool: call.tool, ok: false, label: "createSupplier", detail: "Missing name" };
        useOpsStore.getState().addSupplier({
          id: uid("s"),
          name,
          contactName: asString(a.contactName),
          email: asString(a.email),
          phone: asString(a.phone),
          status: asEnum(a.status, ["active", "inactive"] as const, "active"),
        });
        return { tool: call.tool, ok: true, label: `Created supplier — ${name}`, href: "/ops" };
      }

      case "createWorkOrder": {
        const a = call.args;
        const productName = asString(a.productName);
        const qtyToProduce = asNumber(a.qtyToProduce);
        if (!productName || !qtyToProduce)
          return { tool: call.tool, ok: false, label: "createWorkOrder", detail: "Need product + qty" };
        useOpsStore.getState().addWorkOrder({
          id: uid("w"),
          productName,
          qtyToProduce,
          status: asEnum(a.status, ["planned", "in_progress", "done"] as const, "planned"),
          scheduledDate: asString(a.scheduledDate, new Date().toISOString()),
          dueDate: asString(a.dueDate, new Date(Date.now() + 7 * 86400000).toISOString()),
        });
        return { tool: call.tool, ok: true, label: `Created work order — ${productName}`, detail: `${qtyToProduce} units`, href: "/manufacturing" };
      }

      default:
        return { tool: call.tool, ok: false, label: call.tool, detail: "Unknown tool" };
    }
  } catch (err) {
    return {
      tool: call.tool,
      ok: false,
      label: call.tool,
      detail: err instanceof Error ? err.message : "Tool failed",
    };
  }
}

export async function executeToolCalls(calls: ToolCall[]): Promise<ToolResult[]> {
  const out: ToolResult[] = [];
  for (const c of calls) {
    out.push(await executeToolCall(c));
  }
  return out;
}
