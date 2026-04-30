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
import { useSalesStore, type QuoteLineItem } from "@/lib/stores/sales";
import { checkCreateAllowed } from "@/lib/planGate";
import { AiFormFill } from "@/components/shared/AiFormFill";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const emptyItem: QuoteLineItem = { productName: "", quantity: 1, unitPrice: 0 };

export default function NewQuotePage() {
  const router = useRouter();
  const addQuotation = useSalesStore((s) => s.addQuotation);

  const [customer, setCustomer] = useState("");
  const [expiry, setExpiry] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([{ ...emptyItem }]);
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    customer.length > 0 ||
    expiry.length > 0 ||
    lineItems.some((li) => li.productName || li.unitPrice > 0);

  const validItems = lineItems.filter((li) => li.productName.trim().length > 0);
  const canSubmit = customer.trim().length > 0 && validItems.length > 0;

  const subtotal = validItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const allowed = await checkCreateAllowed(
      "quotes",
      useSalesStore.getState().quotations.length,
    );
    if (!allowed) return;
    setSubmitting(true);
    addQuotation({
      customer: customer.trim(),
      expiry,
      lineItems: validItems,
    });
    toast.success(`Quote for ${customer} created`);
    router.push("/sales");
  }

  function updateItem(idx: number, patch: Partial<QuoteLineItem>) {
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
      title="New quote"
      subtitle="Create a quotation for a customer"
      breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "New quote" }]}
      backHref="/sales"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/sales")}
          primaryLabel="Create quote"
          primaryForm="new-quote-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Quote summary
          </h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
            {customer || "No customer"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {validItems.length} line item{validItems.length !== 1 ? "s" : ""}
          </div>
          <div style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Subtotal</p>
        </div>
      }
    >
      <form id="new-quote-form" onSubmit={handleSubmit}>
        <AiFormFill
          title="Describe the quote — AI will fill customer + expiry"
          placeholder="e.g. Quote for Acme Corp, expires April 30 2026"
          fields={[
            { key: "customer", label: "Customer" },
            { key: "expiry", label: "Expiry date", hint: "ISO YYYY-MM-DD" },
          ]}
          onApply={(values) => {
            if (typeof values.customer === "string") setCustomer(values.customer);
            if (typeof values.expiry === "string") setExpiry(values.expiry);
          }}
        />
        <FormSection title="Customer">
          <FormField label="Customer name" htmlFor="quote-customer" required>
            <input
              id="quote-customer"
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Acme Corp"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Expiry date" htmlFor="quote-expiry-new">
            <input
              id="quote-expiry-new"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              aria-label="Quote expiry date"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <FormSection title="Line items" description="Add at least one product or service.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lineItems.map((li, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 110px 36px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={li.productName}
                  onChange={(e) => updateItem(idx, { productName: e.target.value })}
                  placeholder="Product / service"
                  aria-label={`Line item ${idx + 1} name`}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                  placeholder="Qty"
                  aria-label={`Line item ${idx + 1} quantity`}
                  className={`${inputClass} text-center`}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={li.unitPrice}
                  onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                  placeholder="Price"
                  aria-label={`Line item ${idx + 1} unit price`}
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
              color: "var(--vyne-accent, var(--vyne-purple))",
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
              border: "1px dashed rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)",
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
