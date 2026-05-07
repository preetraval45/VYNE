import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "account",
  resource: "accounts",
  events: {
    created: "account:created",
    updated: "account:updated",
    deleted: "account:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    industry: typeof b.industry === "string" ? b.industry : "",
    website: typeof b.website === "string" ? b.website : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    revenue: typeof b.revenue === "number" ? b.revenue : 0,
    employees: typeof b.employees === "number" ? b.employees : 0,
    owner: typeof b.owner === "string" ? b.owner : "",
    status: typeof b.status === "string" ? b.status : "Active",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
