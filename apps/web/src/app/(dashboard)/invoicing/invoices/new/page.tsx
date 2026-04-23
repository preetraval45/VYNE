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
import { useInvoicingStore, type InvoiceLineItem } from "@/lib/stores/invoicing";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const emptyItem: InvoiceLineItem = { description: "", qty: 1, rate: 0 };

export default function NewInvoicePage() {
  const router = useRouter();
  const customers = useInvoicingStore((s) => s.customers);
  const addInvoice = useInvoicingStore((s) => s.addInvoice);

  const [customer, setCustomer] = useState(customers[0]?.name ?? "");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);

  const validItems = lineItems.filter((li) => li.description.trim().length > 0);
  const canSubmit = customer.trim().length > 0 && validItems.length > 0 && dueDate.length > 0;
  const subtotal = validItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const dirty = !!customer || !!dueDate || !!notes || lineItems.some((li) => li.description || li.rate > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addInvoice({
      customer: customer.trim(),
      items: validItems,
      dueDate,
      notes: notes.trim(),
    });
    toast.success(`Invoice for ${customer} created`);
    router.push("/invoicing");
  }

  function updateItem(idx: number, patch: Partial<InvoiceLineItem>) {
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
      title="New invoice"
      subtitle="Create an invoice for a customer"
      breadcrumbs={[{ label: "Invoicing", href: "/invoicing" }, { label: "New invoice" }]}
      backHref="/invoicing"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/invoicing")}
          primaryLabel="Create invoice"
          primaryForm="new-invoice-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div style={{ background: "var(--content-bg)", border: "1px solid var(--content-border)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Invoice total
          </h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{customer || "Customer"}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {validItems.length} line item{validItems.length !== 1 ? "s" : ""} · Due {dueDate || "—"}
          </div>
          <div style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Subtotal (excl. tax)</p>
        </div>
      }
    >
      <form id="new-invoice-form" onSubmit={handleSubmit}>
        <FormSection title="Bill to">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 14 }}>
            <FormField label="Customer" htmlFor="inv-customer" required>
              {customers.length > 0 ? (
                <select
                  id="inv-customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  style={inputStyle}
                >
                  {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input
                  id="inv-customer"
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Customer name"
                  required
                  className={inputClass}
                  style={inputStyle}
                />
              )}
            </FormField>
            <FormField label="Due date" htmlFor="inv-due" required>
              <input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                aria-label="Invoice due date"
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
                  placeholder="Qty"
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
                  placeholder="Rate"
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

        <FormSection title="Notes">
          <FormField label="Notes" htmlFor="inv-notes" hint="Appears on the invoice PDF.">
            <textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, etc."
              rows={3}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </FormField>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
