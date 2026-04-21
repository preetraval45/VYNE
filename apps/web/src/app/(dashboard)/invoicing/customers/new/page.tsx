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
import { useInvoicingStore } from "@/lib/stores/invoicing";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function NewCustomerPage() {
  const router = useRouter();
  const addCustomer = useInvoicingStore((s) => s.addCustomer);

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.email || form.phone);
  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addCustomer({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    toast.success(`Customer "${form.name}" created`);
    router.push("/invoicing");
  }

  return (
    <FormPageLayout
      title="New customer"
      subtitle="Add a customer to invoice"
      breadcrumbs={[{ label: "Invoicing", href: "/invoicing" }, { label: "New customer" }]}
      backHref="/invoicing"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/invoicing")}
          primaryLabel="Create customer"
          primaryForm="new-customer-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-customer-form" onSubmit={handleSubmit}>
        <FormSection title="Contact">
          <FormField label="Customer name" htmlFor="cust-name" required>
            <input
              id="cust-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme Corp"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Email" htmlFor="cust-email">
              <input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="billing@company.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone" htmlFor="cust-phone">
              <input
                id="cust-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
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
