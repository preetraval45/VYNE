import { createCrudHandlers } from "@/lib/api/crud";

// /api/sales/orders — distinct from /api/orders (which is Ops.Order, the
// fulfilment/inventory side). Sales.Order tracks the deal-side order
// state (confirmed quotes that haven't yet flowed into Ops).

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesOrder",
  resource: "orders",
  events: {
    created: "sales-order:created",
    updated: "sales-order:updated",
    deleted: "sales-order:deleted",
  },
  withDefaults: (b) => ({
    number: typeof b.number === "string" ? b.number : `SO-${Date.now()}`,
    customer: typeof b.customer === "string" ? b.customer : "",
    date:
      typeof b.date === "string"
        ? b.date
        : new Date().toISOString().slice(0, 10),
    amount: typeof b.amount === "number" ? Math.round(b.amount) : 0,
    status: typeof b.status === "string" ? b.status : "New",
    tracking: typeof b.tracking === "string" ? b.tracking : "",
    items:
      typeof b.items === "number"
        ? b.items
        : Array.isArray(b.lineItems)
          ? b.lineItems.length
          : 0,
    lineItems: Array.isArray(b.lineItems) ? b.lineItems : [],
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
