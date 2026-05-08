// Server-side workspace seed (UI_UPGRADE_PLAN.md 1.5).
//
// When a real user signs up, populate their Postgres-backed workspace
// with a small representative dataset so they can explore every list +
// dashboard before adding their own data. Idempotent — re-runs are
// no-ops because we check for existing rows scoped to the same orgId.
//
// Each entity gets 3-5 hand-curated rows. We deliberately do NOT import
// the client-side fixture modules here because those carry a "use client"
// directive + heavy mock arrays (~1k entries) the seed doesn't need.

import { prisma } from "@/lib/prisma";

interface SeedSummary {
  orgId: string;
  inserted: Record<string, number>;
  skipped: string[];
}

/**
 * Insert demo data scoped to `orgId`. Skips entities that already have
 * rows under the same orgId so re-running on an existing workspace is
 * safe. Returns a per-entity insertion count.
 */
export async function seedDemoWorkspace(
  orgId: string,
): Promise<SeedSummary> {
  const inserted: Record<string, number> = {};
  const skipped: string[] = [];

  async function seedIf<T extends { orgId?: string }>(
    label: string,
    count: () => Promise<number>,
    rows: T[],
    insert: (rows: T[]) => Promise<{ count: number }>,
  ): Promise<void> {
    try {
      const existing = await count();
      if (existing > 0) {
        skipped.push(label);
        return;
      }
      const result = await insert(rows);
      inserted[label] = result.count;
    } catch {
      // Swallow per-entity failure so one missing table doesn't kill
      // the whole seed; the rest still run.
      skipped.push(`${label} (error)`);
    }
  }

  // ── Deals ────────────────────────────────────────────────────────
  await seedIf(
    "deals",
    () => prisma.deal.count({ where: { orgId } }),
    [
      {
        orgId,
        company: "Acme Corp",
        contactName: "Sarah Chen",
        email: "sarah@acme.com",
        stage: "Proposal",
        value: 48000,
        probability: 60,
        assignee: "Alex",
        source: "inbound",
        nextAction: "Send revised proposal",
        notes: "Price-sensitive; needs CFO approval.",
      },
      {
        orgId,
        company: "Globex Industries",
        contactName: "Marcus Patel",
        email: "marcus@globex.io",
        stage: "Qualified",
        value: 72000,
        probability: 35,
        assignee: "Priya",
        source: "outbound",
        nextAction: "Schedule discovery call",
        notes: "First-time buyer, evaluating 3 vendors.",
      },
      {
        orgId,
        company: "Initech LLC",
        contactName: "Diana Wong",
        email: "diana@initech.com",
        stage: "Negotiation",
        value: 24000,
        probability: 80,
        assignee: "Alex",
        source: "referral",
        nextAction: "Close by end of quarter",
        notes: "Ready to sign once legal reviews MSA.",
      },
    ],
    (rows) => prisma.deal.createMany({ data: rows }),
  );

  // ── Contacts ─────────────────────────────────────────────────────
  await seedIf(
    "contacts",
    () => prisma.contact.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "Sarah Chen",
        email: "sarah@acme.com",
        phone: "(415) 555-0101",
        company: "Acme Corp",
        title: "VP Engineering",
        department: "Engineering",
      },
      {
        orgId,
        name: "Marcus Patel",
        email: "marcus@globex.io",
        phone: "(312) 555-0202",
        company: "Globex Industries",
        title: "Director of Ops",
        department: "Operations",
      },
      {
        orgId,
        name: "Diana Wong",
        email: "diana@initech.com",
        phone: "(512) 555-0303",
        company: "Initech LLC",
        title: "CFO",
        department: "Finance",
      },
    ],
    (rows) => prisma.contact.createMany({ data: rows }),
  );

  // ── Accounts ─────────────────────────────────────────────────────
  await seedIf(
    "accounts",
    () => prisma.account.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "Acme Corp",
        industry: "Technology",
        website: "acme.com",
        revenue: 12_500_000,
        employees: 340,
        owner: "Alex",
        status: "Active",
      },
      {
        orgId,
        name: "Globex Industries",
        industry: "Manufacturing",
        website: "globex.io",
        revenue: 8_400_000,
        employees: 520,
        owner: "Priya",
        status: "Active",
      },
    ],
    (rows) => prisma.account.createMany({ data: rows }),
  );

  // ── Customers (invoicing) ────────────────────────────────────────
  await seedIf(
    "customers",
    () => prisma.customer.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "Acme Corp",
        email: "billing@acme.com",
        phone: "(415) 555-0101",
        totalRevenue: 248_500,
        outstandingBalance: 12_400,
        lastInvoice: new Date().toISOString().slice(0, 10),
        status: "Active",
      },
      {
        orgId,
        name: "Globex Industries",
        email: "ap@globex.io",
        phone: "(312) 555-0202",
        totalRevenue: 187_200,
        outstandingBalance: 0,
        lastInvoice: new Date().toISOString().slice(0, 10),
        status: "Active",
      },
    ],
    (rows) => prisma.customer.createMany({ data: rows }),
  );

  // ── Invoices ─────────────────────────────────────────────────────
  await seedIf(
    "invoices",
    () => prisma.invoice.count({ where: { orgId } }),
    [
      {
        orgId,
        number: "INV-DEMO-001",
        customer: "Acme Corp",
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .slice(0, 10),
        amount: 12_400,
        items: [
          { description: "Monthly subscription", qty: 1, rate: 12_400 },
        ] as unknown as never,
        notes: "",
        status: "Sent",
      },
      {
        orgId,
        number: "INV-DEMO-002",
        customer: "Globex Industries",
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .slice(0, 10),
        amount: 34_200,
        items: [
          {
            description: "Annual license renewal",
            qty: 1,
            rate: 34_200,
          },
        ] as unknown as never,
        notes: "",
        status: "Paid",
      },
    ],
    (rows) => prisma.invoice.createMany({ data: rows }),
  );

  // ── Products ─────────────────────────────────────────────────────
  await seedIf(
    "products",
    () => prisma.product.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "Wireless Mouse",
        sku: "DEMO-MS-001",
        price: 49,
        costPrice: 18,
        stockQty: 124,
        uom: "ea",
        categoryId: "cat-peripherals",
        categoryName: "Peripherals",
        status: "in_stock",
      },
      {
        orgId,
        name: "USB-C Hub",
        sku: "DEMO-HUB-002",
        price: 89,
        costPrice: 31,
        stockQty: 38,
        uom: "ea",
        categoryId: "cat-peripherals",
        categoryName: "Peripherals",
        status: "in_stock",
      },
      {
        orgId,
        name: "Mechanical Keyboard",
        sku: "DEMO-KB-003",
        price: 159,
        costPrice: 64,
        stockQty: 7,
        uom: "ea",
        categoryId: "cat-peripherals",
        categoryName: "Peripherals",
        status: "low_stock",
      },
    ],
    (rows) => prisma.product.createMany({ data: rows }),
  );

  // ── Suppliers ────────────────────────────────────────────────────
  await seedIf(
    "suppliers",
    () => prisma.supplier.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "TechSupply Co",
        contactName: "Raj Patel",
        email: "sales@techsupply.com",
        phone: "(555) 100-0003",
        category: "Hardware",
        status: "Active",
      },
      {
        orgId,
        name: "CloudHost Pro",
        contactName: "Sarah Chen",
        email: "billing@cloudhostpro.com",
        phone: "(555) 100-0001",
        category: "Infrastructure",
        status: "Active",
      },
    ],
    (rows) => prisma.supplier.createMany({ data: rows }),
  );

  // ── Orders ───────────────────────────────────────────────────────
  await seedIf(
    "orders",
    () => prisma.order.count({ where: { orgId } }),
    [
      {
        orgId,
        orderNumber: "ORD-DEMO-001",
        customerName: "Acme Corp",
        customerEmail: "ops@acme.com",
        status: "confirmed",
        total: 437,
        lines: [
          { productId: "demo-ms-001", quantity: 5, unitPrice: 49 },
          { productId: "demo-kb-003", quantity: 1, unitPrice: 159 },
        ] as unknown as never,
      },
    ],
    (rows) => prisma.order.createMany({ data: rows }),
  );

  // ── Projects ─────────────────────────────────────────────────────
  await seedIf(
    "projects",
    () => prisma.project.count({ where: { orgId } }),
    [
      {
        orgId,
        name: "Q1 Launch",
        identifier: "Q1L",
        description: "Ship the v2 product launch by end of Q1.",
        color: "#6C47FF",
        icon: "🚀",
        status: "active",
        memberIds: [],
        leadId: "",
        priority: "high",
        tags: ["launch", "marketing"],
      },
      {
        orgId,
        name: "Onboarding Revamp",
        identifier: "ONB",
        description:
          "Reduce time-to-value for new signups from 7d → 1d.",
        color: "#22C55E",
        icon: "✨",
        status: "active",
        memberIds: [],
        leadId: "",
        priority: "medium",
        tags: ["activation", "ux"],
      },
    ],
    (rows) => prisma.project.createMany({ data: rows }),
  );

  // ── Tasks ────────────────────────────────────────────────────────
  await seedIf(
    "tasks",
    () => prisma.task.count({ where: { orgId } }),
    [
      {
        orgId,
        projectId: "demo-q1l",
        taskKey: "Q1L-1",
        title: "Finalize launch copy",
        description: "Pin headline + 3 bullets + CTA",
        status: "in_progress",
        priority: "high",
        tags: ["copy"],
        taskOrder: 0,
        subtasks: [] as unknown as never,
      },
      {
        orgId,
        projectId: "demo-q1l",
        taskKey: "Q1L-2",
        title: "Schedule press briefing",
        description: "Reach out to 3 outlets",
        status: "todo",
        priority: "medium",
        tags: ["pr"],
        taskOrder: 1,
        subtasks: [] as unknown as never,
      },
      {
        orgId,
        projectId: "demo-onb",
        taskKey: "ONB-1",
        title: "Audit current onboarding flow",
        description: "Map every step + drop-off",
        status: "in_review",
        priority: "high",
        tags: ["research"],
        taskOrder: 0,
        subtasks: [] as unknown as never,
      },
    ],
    (rows) => prisma.task.createMany({ data: rows }),
  );

  // ── Journal entries ──────────────────────────────────────────────
  await seedIf(
    "journalEntries",
    () => prisma.journalEntry.count({ where: { orgId } }),
    [
      {
        orgId,
        entryNumber: "JE-DEMO-001",
        description: "Subscription revenue — Acme Corp",
        postingDate: new Date(),
        status: "posted",
        totalDebits: 12_400,
        memo: "Invoice INV-DEMO-001",
        lines: [
          {
            account: "Accounts Receivable",
            debit: 12_400,
            credit: 0,
          },
          { account: "Revenue", debit: 0, credit: 12_400 },
        ] as unknown as never,
      },
    ],
    (rows) =>
      prisma.journalEntry.createMany({
        data: rows.map((r) => ({
          ...r,
          postingDate: r.postingDate as Date,
        })),
      }),
  );

  return { orgId, inserted, skipped };
}
