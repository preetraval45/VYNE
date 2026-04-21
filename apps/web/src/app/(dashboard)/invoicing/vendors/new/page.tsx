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

export default function NewVendorPage() {
  const router = useRouter();
  const addVendor = useInvoicingStore((s) => s.addVendor);

  const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.contact || form.email || form.phone);
  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addVendor({
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    toast.success(`Vendor "${form.name}" created`);
    router.push("/invoicing");
  }

  return (
    <FormPageLayout
      title="New vendor"
      subtitle="Add a vendor for bills and payments"
      breadcrumbs={[{ label: "Invoicing", href: "/invoicing" }, { label: "New vendor" }]}
      backHref="/invoicing"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/invoicing")}
          primaryLabel="Create vendor"
          primaryForm="new-vendor-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-vendor-form" onSubmit={handleSubmit}>
        <FormSection title="Vendor">
          <FormField label="Company name" htmlFor="vendor-name" required>
            <input
              id="vendor-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Supplier Ltd."
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Primary contact" htmlFor="vendor-contact">
            <input
              id="vendor-contact"
              type="text"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="Jane Smith"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Email" htmlFor="vendor-email">
              <input
                id="vendor-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ap@vendor.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone" htmlFor="vendor-phone">
              <input
                id="vendor-phone"
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
