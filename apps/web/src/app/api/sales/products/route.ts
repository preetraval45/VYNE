import { createCrudHandlers } from "@/lib/api/crud";

// /api/sales/products — sales catalog (what we *can* sell), distinct
// from /api/products (Ops inventory — current on-hand stock).

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesProduct",
  resource: "products",
  events: {
    created: "sales-product:created",
    updated: "sales-product:updated",
    deleted: "sales-product:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled product",
    sku: typeof b.sku === "string" ? b.sku : "",
    category: typeof b.category === "string" ? b.category : "",
    price: typeof b.price === "number" ? Math.round(b.price) : 0,
    stock: typeof b.stock === "number" ? b.stock : 0,
    status: typeof b.status === "string" ? b.status : "Active",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
