"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ERPProduct,
  ERPOrder,
  ERPSupplier,
  ERPBOM,
  ERPWorkOrder,
} from "@/lib/api/client";
import {
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_SUPPLIERS,
  MOCK_BOMS,
  MOCK_WORK_ORDERS,
} from "@/lib/fixtures/ops";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";
import { subscribe as rtSubscribe, isRealtimeEnabled } from "@/lib/realtime";

// ─── Remote mirror helpers (Postgres via /api/products) ──────────
// Products are persisted to Postgres. Orders/Suppliers/BOMs/WorkOrders
// stay in localStorage for this pass — schema follows in the next batch.
function mirrorProductCreate(p: ERPProduct) {
  void fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  }).catch(() => {});
}
function mirrorProductUpdate(id: string, patch: Partial<ERPProduct>) {
  void fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorProductDelete(id: string) {
  void fetch(`/api/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

interface OpsState {
  products: ERPProduct[];
  orders: ERPOrder[];
  suppliers: ERPSupplier[];
  boms: ERPBOM[];
  workOrders: ERPWorkOrder[];
  productsHydrated: boolean;

  setProducts: (v: ERPProduct[]) => void;
  addProduct: (p: ERPProduct) => void;
  updateProduct: (id: string, patch: Partial<ERPProduct>) => void;
  deleteProduct: (id: string) => void;
  hydrateProductsFromServer: () => Promise<void>;

  setOrders: (v: ERPOrder[]) => void;
  addOrder: (o: ERPOrder) => void;
  updateOrder: (id: string, patch: Partial<ERPOrder>) => void;
  deleteOrder: (id: string) => void;

  setSuppliers: (v: ERPSupplier[]) => void;
  addSupplier: (s: ERPSupplier) => void;
  updateSupplier: (id: string, patch: Partial<ERPSupplier>) => void;
  deleteSupplier: (id: string) => void;

  setBoms: (v: ERPBOM[]) => void;
  addBom: (b: ERPBOM) => void;
  updateBom: (id: string, patch: Partial<ERPBOM>) => void;
  deleteBom: (id: string) => void;

  setWorkOrders: (v: ERPWorkOrder[]) => void;
  addWorkOrder: (w: ERPWorkOrder) => void;
  updateWorkOrder: (id: string, patch: Partial<ERPWorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;
}

export const useOpsStore = create<OpsState>()(
  persist(
    (set, get) => ({
      products: seedOrEmpty(MOCK_PRODUCTS),
      orders: seedOrEmpty(MOCK_ORDERS),
      suppliers: seedOrEmpty(MOCK_SUPPLIERS),
      boms: seedOrEmpty(MOCK_BOMS),
      workOrders: seedOrEmpty(MOCK_WORK_ORDERS),
      productsHydrated: false,

      setProducts: (products) => set({ products }),
      addProduct: (p) => {
        set((s) => ({ products: [p, ...s.products] }));
        mirrorProductCreate(p);
      },
      updateProduct: (id, patch) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        mirrorProductUpdate(id, patch);
      },
      deleteProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        mirrorProductDelete(id);
      },

      hydrateProductsFromServer: async () => {
        try {
          const res = await fetch("/api/products", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { products?: ERPProduct[] };
          if (Array.isArray(body.products) && body.products.length > 0) {
            set({ products: body.products, productsHydrated: true });
          } else if (Array.isArray(body.products)) {
            if (shouldSeedFixtures()) {
              set({ products: MOCK_PRODUCTS, productsHydrated: true });
            } else {
              set({ products: [], productsHydrated: true });
            }
          }
        } catch {
          if (!get().productsHydrated) set({ productsHydrated: false });
        }
      },

      setOrders: (orders) => set({ orders }),
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateOrder: (id, patch) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      deleteOrder: (id) =>
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),

      setSuppliers: (suppliers) => set({ suppliers }),
      addSupplier: (sup) => set((s) => ({ suppliers: [sup, ...s.suppliers] })),
      updateSupplier: (id, patch) =>
        set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSupplier: (id) =>
        set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) })),

      setBoms: (boms) => set({ boms }),
      addBom: (b) => set((s) => ({ boms: [b, ...s.boms] })),
      updateBom: (id, patch) =>
        set((s) => ({ boms: s.boms.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      deleteBom: (id) =>
        set((s) => ({ boms: s.boms.filter((b) => b.id !== id) })),

      setWorkOrders: (workOrders) => set({ workOrders }),
      addWorkOrder: (w) => set((s) => ({ workOrders: [w, ...s.workOrders] })),
      updateWorkOrder: (id, patch) =>
        set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      deleteWorkOrder: (id) =>
        set((s) => ({ workOrders: s.workOrders.filter((w) => w.id !== id) })),
    }),
    { name: "vyne-ops" },
  ),
);

// ── Realtime subscription ──────────────────────────────────────────
let _opsRtBound = false;
export function bindOpsRealtime(orgId = "demo") {
  if (_opsRtBound || !isRealtimeEnabled()) return;
  _opsRtBound = true;
  rtSubscribe<ERPProduct>(`org-${orgId}`, "product:created", (p) => {
    useOpsStore.setState((s) => {
      if (s.products.some((x) => x.id === p.id)) return s;
      return { products: [p, ...s.products] };
    });
  });
  rtSubscribe<ERPProduct>(`org-${orgId}`, "product:updated", (p) => {
    useOpsStore.setState((s) => ({
      products: s.products.map((x) => (x.id === p.id ? { ...x, ...p } : x)),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "product:deleted", ({ id }) => {
    useOpsStore.setState((s) => ({
      products: s.products.filter((p) => p.id !== id),
    }));
  });
}
