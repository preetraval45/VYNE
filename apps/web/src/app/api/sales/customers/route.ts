import { createCrudHandlers } from "@/lib/api/crud";

// /api/sales/customers — sales-relationship view, distinct from
// /api/customers (Invoicing.Customer, the AR side).

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesCustomer",
  resource: "customers",
  events: {
    created: "sales-customer:created",
    updated: "sales-customer:updated",
    deleted: "sales-customer:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled customer",
    email: typeof b.email === "string" ? b.email : "",
    totalOrders: typeof b.totalOrders === "number" ? b.totalOrders : 0,
    totalRevenue:
      typeof b.totalRevenue === "number" ? Math.round(b.totalRevenue) : 0,
    lastOrder: typeof b.lastOrder === "string" ? b.lastOrder : "",
    status: typeof b.status === "string" ? b.status : "Active",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
