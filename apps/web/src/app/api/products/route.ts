import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "product",
  resource: "products",
  events: {
    created: "product:created",
    updated: "product:updated",
    deleted: "product:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    sku: typeof b.sku === "string" ? b.sku : "",
    price: typeof b.price === "number" ? b.price : 0,
    costPrice: typeof b.costPrice === "number" ? b.costPrice : 0,
    stockQty: typeof b.stockQty === "number" ? b.stockQty : 0,
    uom: typeof b.uom === "string" ? b.uom : "",
    categoryId: typeof b.categoryId === "string" ? b.categoryId : "",
    categoryName: typeof b.categoryName === "string" ? b.categoryName : "",
    status: typeof b.status === "string" ? b.status : "in_stock",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
