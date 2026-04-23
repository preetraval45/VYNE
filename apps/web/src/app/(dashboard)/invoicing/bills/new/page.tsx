"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useInvoicingStore, type BillLineItem } from "@/lib/stores/invoicing";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const emptyItem: BillLineItem = { description: "", qty: 1, rate: 0 };

export default function NewBillPage() {
  const router = useRouter();
  const vendors = useInvoicingStore((s) => s.vendors);
  const addBill = useInvoicingStore((s) => s.addBill);

  const [vendor, setVendor] = useState(vendors[0]?.name ?? "");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<BillLineItem[]>([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);

  const validItems = lineItems.filter((li) => li.description.trim().length > 0);
  const canSubmit = vendor.trim().length > 0 && validItems.length > 0 && dueDate.length > 0;
  const subtotal = validItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const dirty = !!vendor || !!dueDate || lineItems.some((li) => li.description || li.rate > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addBill({ vendor: vendor.trim(), items: validItems, dueDate });
    toast.success(`Bill from ${vendor} recorded`);
    router.push("/invoicing");
  }

  function updateItem(idx: number, patch: Partial<BillLineItem>) {
    setLineItems((items) => items.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  }
  function removeItem(idx: number) {
    setLineItems((items) => items.filter((_, i) => i !== idx));
  }
  function addItem() {
    setLineItems((items) => [...items, { ...emptyItem }]);
  }

  return (
    <FormPageLayout
      title="New bill"
      subtitle="Record a bill received from a vendor"
      breadcrumbs={[{ label: "Invoicing", href: "/invoicing" }, { label: "New bill" }]}
      backHref="/invoicing"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/invoicing")}
          primaryLabel="Record bill"
          primaryForm="new-bill-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div style={{ background: "var(--content-bg)", border: "1px solid var(--content-border)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Bill total
          </h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{vendor || "Vendor"}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {validItems.length} line item{validItems.length !== 1 ? "s" : ""} · Due {dueDate || "—"}
          </div>
          <div style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Subtotal</p>
        </div>
      }
    >
      <form id="new-bill-form" onSubmit={handleSubmit}>
        <FormSection title="Vendor">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 14 }}>
            <FormField label="Vendor" htmlFor="bill-vendor" required>
              {vendors.length > 0 ? (
                <select
                  id="bill-vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  style={inputStyle}
                >
                  {vendors.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              ) : (
                <input
                  id="bill-vendor"
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Vendor name"
                  required
                  className={inputClass}
                  style={inputStyle}
                />
              )}
            </FormField>
            <FormField label="Due date" htmlFor="bill-due" required>
              <input
                id="bill-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                aria-label="Bill due date"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Line items">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lineItems.map((li, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 36px", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Description"
                  aria-label={`Line item ${idx + 1} description`}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={1}
                  value={li.qty}
                  onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 1 })}
                  aria-label={`Line item ${idx + 1} quantity`}
                  className={`${inputClass} text-center`}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={li.rate}
                  onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })}
                  aria-label={`Line item ${idx + 1} rate`}
                  className={inputClass}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={lineItems.length === 1}
                  aria-label={`Remove line item ${idx + 1}`}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: "1px solid var(--content-border)",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    cursor: lineItems.length === 1 ? "not-allowed" : "pointer",
                    opacity: lineItems.length === 1 ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", marginTop: 8,
              fontSize: 12.5, fontWeight: 500,
              color: "var(--vyne-purple)",
              background: "rgba(6, 182, 212,0.08)",
              border: "1px dashed rgba(6, 182, 212,0.3)",
              borderRadius: 8,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <Plus size={13} /> Add line item
          </button>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
