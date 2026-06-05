import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesQuote",
  resource: "quotes",
  events: {
    created: "sales-quote:created",
    updated: "sales-quote:updated",
    deleted: "sales-quote:deleted",
  },
  withDefaults: (b) => ({
    number: typeof b.number === "string" ? b.number : `Q-${Date.now()}`,
    customer: typeof b.customer === "string" ? b.customer : "",
    date:
      typeof b.date === "string"
        ? b.date
        : new Date().toISOString().slice(0, 10),
    expiry: typeof b.expiry === "string" ? b.expiry : "",
    amount: typeof b.amount === "number" ? Math.round(b.amount) : 0,
    status: typeof b.status === "string" ? b.status : "Draft",
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
