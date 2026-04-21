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

  setSuppliers: (v: ERPSupplier[]) => void;
  addSupplier: (s: ERPSupplier) => void;

  setBoms: (v: ERPBOM[]) => void;
  addBom: (b: ERPBOM) => void;

  setWorkOrders: (v: ERPWorkOrder[]) => void;
  addWorkOrder: (w: ERPWorkOrder) => void;
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

      setSuppliers: (suppliers) => set({ suppliers }),
      addSupplier: (sup) => set((s) => ({ suppliers: [sup, ...s.suppliers] })),

      setBoms: (boms) => set({ boms }),
      addBom: (b) => set((s) => ({ boms: [b, ...s.boms] })),

      setWorkOrders: (workOrders) => set({ workOrders }),
      addWorkOrder: (w) => set((s) => ({ workOrders: [w, ...s.workOrders] })),
    }),
    { name: "vyne-ops" },
  ),
);
