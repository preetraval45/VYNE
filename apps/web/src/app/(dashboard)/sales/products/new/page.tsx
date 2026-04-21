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
import { useSalesStore } from "@/lib/stores/sales";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const CATEGORIES = ["Software", "Add-ons", "Services", "Training", "Hardware"];

export default function NewProductPage() {
  const router = useRouter();
  const addProduct = useSalesStore((s) => s.addProduct);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: CATEGORIES[0],
    price: "",
    stock: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.sku || form.price || form.stock);
  const canSubmit = form.name.trim() && form.sku.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addProduct({
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
    });
    toast.success(`Product "${form.name}" created`);
    router.push("/sales");
  }

  return (
    <FormPageLayout
      title="New product"
      subtitle="Add a product or service to your catalog"
      breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "New product" }]}
      backHref="/sales"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/sales")}
          primaryLabel="Create product"
          primaryForm="new-product-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-product-form" onSubmit={handleSubmit}>
        <FormSection title="Product">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <FormField label="Name" htmlFor="prod-name" required>
              <input
                id="prod-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Pro plan"
                required
                autoFocus
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="SKU" htmlFor="prod-sku" required>
              <input
                id="prod-sku"
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                placeholder="PRO-001"
                required
                className={`${inputClass} font-mono uppercase`}
                style={inputStyle}
              />
            </FormField>
          </div>
          <FormField label="Category" htmlFor="prod-category">
            <select
              id="prod-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Pricing & inventory">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Unit price (USD)" htmlFor="prod-price" required>
              <input
                id="prod-price"
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
            <FormField label="Stock" htmlFor="prod-stock" hint="Status auto-derived: ≤0 Out, ≤10 Low, otherwise Active">
              <input
                id="prod-stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
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
