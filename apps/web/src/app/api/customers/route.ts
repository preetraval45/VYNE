import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "customer",
  resource: "customers",
  events: {
    created: "customer:created",
    updated: "customer:updated",
    deleted: "customer:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    email: typeof b.email === "string" ? b.email : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    totalRevenue: typeof b.totalRevenue === "number" ? b.totalRevenue : 0,
    outstandingBalance:
      typeof b.outstandingBalance === "number" ? b.outstandingBalance : 0,
    lastInvoice: typeof b.lastInvoice === "string" ? b.lastInvoice : "",
    status: typeof b.status === "string" ? b.status : "Active",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
