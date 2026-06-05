import { createCrudHandlers } from "@/lib/api/crud";

// /api/sales/opportunities — PH-A. CRUD for SalesOpportunity backed by
// Postgres. Tenant-scoped + rate-limited via the shared factory.

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesOpportunity",
  resource: "opportunities",
  events: {
    created: "sales-opportunity:created",
    updated: "sales-opportunity:updated",
    deleted: "sales-opportunity:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled opportunity",
    company: typeof b.company === "string" ? b.company : "",
    contact: typeof b.contact === "string" ? b.contact : "",
    value: typeof b.value === "number" ? Math.round(b.value) : 0,
    probability:
      typeof b.probability === "number" ? Math.round(b.probability) : 0,
    stage: typeof b.stage === "string" ? b.stage : "Prospecting",
    expectedClose: typeof b.expectedClose === "string" ? b.expectedClose : null,
    assignee: typeof b.assignee === "string" ? b.assignee : "",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
