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

interface OpsState {
  products: ERPProduct[];
  orders: ERPOrder[];
  suppliers: ERPSupplier[];
  boms: ERPBOM[];
  workOrders: ERPWorkOrder[];

  setProducts: (v: ERPProduct[]) => void;
  addProduct: (p: ERPProduct) => void;
  updateProduct: (id: string, patch: Partial<ERPProduct>) => void;
  deleteProduct: (id: string) => void;

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
    (set) => ({
      products: MOCK_PRODUCTS,
      orders: MOCK_ORDERS,
      suppliers: MOCK_SUPPLIERS,
      boms: MOCK_BOMS,
      workOrders: MOCK_WORK_ORDERS,

      setProducts: (products) => set({ products }),
      addProduct: (p) => set((s) => ({ products: [p, ...s.products] })),
      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

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
