import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "order",
  resource: "orders",
  events: {
    created: "order:created",
    updated: "order:updated",
    deleted: "order:deleted",
  },
  withDefaults: (b) => ({
    orderNumber: typeof b.orderNumber === "string" ? b.orderNumber : "",
    customerName: typeof b.customerName === "string" ? b.customerName : "",
    customerEmail: typeof b.customerEmail === "string" ? b.customerEmail : "",
    status: typeof b.status === "string" ? b.status : "draft",
    total: typeof b.total === "number" ? b.total : 0,
    lines: Array.isArray(b.lines) ? b.lines : [],
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
