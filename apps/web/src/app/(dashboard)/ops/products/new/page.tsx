"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useOpsStore } from "@/lib/stores/ops";
import type { ERPProduct } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

function deriveStatus(stock: number): ERPProduct["status"] {
  if (stock <= 0) return "out_of_stock";
  if (stock <= 10) return "low_stock";
  return "in_stock";
}

export default function NewOpsProductPage() {
  const router = useRouter();
  const addProduct = useOpsStore((s) => s.addProduct);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    costPrice: "",
    stockQty: "",
    uom: "each",
    categoryName: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.sku || form.price || form.costPrice || form.stockQty);
  const canSubmit = form.name.trim() && form.sku.trim();
  const stockNum = Number(form.stockQty) || 0;
  const margin =
    Number(form.price) > 0 && Number(form.costPrice) > 0
      ? Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const id = `p${Date.now()}`;
    const product: ERPProduct = {
      id,
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price) || 0,
      costPrice: Number(form.costPrice) || 0,
      stockQty: stockNum,
      uom: form.uom || "each",
      categoryName: form.categoryName.trim() || undefined,
      status: deriveStatus(stockNum),
    };
    addProduct(product);
    toast.success(`Product "${form.name}" created`);
    router.push("/ops");
  }

  return (
    <FormPageLayout
      title="New product"
      subtitle="Add a product to the operations catalog"
      breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "New product" }]}
      backHref="/ops"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/ops")}
          primaryLabel="Create product"
          primaryForm="new-ops-product-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div className="surface-elevated" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Margin
          </h3>
          <div className="text-aurora" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1 }}>
            {margin}%
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
            {Number(form.price) > 0 && Number(form.costPrice) > 0
              ? `$${(Number(form.price) - Number(form.costPrice)).toFixed(2)} per unit`
              : "Enter price and cost to see margin"}
          </p>
          <div style={{ height: 1, background: "var(--content-border)", margin: "16px 0" }} />
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Stock status
          </h3>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              background:
                stockNum <= 0
                  ? "rgba(239,68,68,0.12)"
                  : stockNum <= 10
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(34,197,94,0.12)",
              color:
                stockNum <= 0
                  ? "var(--status-danger)"
                  : stockNum <= 10
                    ? "var(--status-warning)"
                    : "var(--status-success)",
            }}
          >
            {stockNum <= 0 ? "Out of stock" : stockNum <= 10 ? "Low stock" : "In stock"}
          </span>
        </div>
      }
    >
      <form id="new-ops-product-form" onSubmit={handleSubmit}>
        <FormSection title="Product" description="Identification.">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <FormField label="Name" htmlFor="op-name" required>
              <input
                id="op-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Widget Mk II"
                required
                autoFocus
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="SKU" htmlFor="op-sku" required>
              <input
                id="op-sku"
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                placeholder="WDGT-002"
                required
                className={`${inputClass} font-mono uppercase`}
                style={inputStyle}
              />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 14 }}>
            <FormField label="Category" htmlFor="op-category">
              <input
                id="op-category"
                type="text"
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                placeholder="Widgets"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Unit of measure" htmlFor="op-uom">
              <select
                id="op-uom"
                value={form.uom}
                onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                <option value="each">each</option>
                <option value="box">box</option>
                <option value="kg">kg</option>
                <option value="liter">liter</option>
                <option value="hour">hour</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Pricing & stock">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FormField label="Sell price (USD)" htmlFor="op-price" required>
              <input
                id="op-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="99.00"
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Cost price (USD)" htmlFor="op-cost">
              <input
                id="op-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                placeholder="45.00"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Stock qty" htmlFor="op-stock">
              <input
                id="op-stock"
                type="number"
                min={0}
                value={form.stockQty}
                onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                placeholder="100"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
