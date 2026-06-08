"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  // Where to land after save/cancel. The standalone /vendors page passes
  // ?return=/vendors so the flow stays coherent; defaults to Invoicing.
  const returnTo = searchParams.get("return") || "/invoicing";
  const addVendor = useInvoicingStore((s) => s.addVendor);

  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    website: "",
    category: "",
    paymentTerms: "",
    taxId: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = Object.values(form).some((v) => v.trim().length > 0);
  const canSubmit = form.name.trim().length > 0;

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addVendor({
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim() || undefined,
      category: form.category.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    toast.success(`Vendor "${form.name}" created`);
    router.push(returnTo);
  }

  return (
    <FormPageLayout
      title="New vendor"
      subtitle="Add a vendor for bills and payments"
      breadcrumbs={[
        { label: "Invoicing", href: "/invoicing" },
        { label: "New vendor" },
      ]}
      backHref={returnTo}
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push(returnTo)}
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
              onChange={set("name")}
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
              onChange={set("contact")}
              placeholder="Jane Smith"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField label="Email" htmlFor="vendor-email">
              <input
                id="vendor-email"
                type="email"
                value={form.email}
                onChange={set("email")}
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
                onChange={set("phone")}
                placeholder="+1 (555) 000-0000"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Details">
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField label="Website" htmlFor="vendor-website">
              <input
                id="vendor-website"
                type="text"
                value={form.website}
                onChange={set("website")}
                placeholder="vendor.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Category" htmlFor="vendor-category">
              <input
                id="vendor-category"
                type="text"
                value={form.category}
                onChange={set("category")}
                placeholder="Raw materials, Logistics, SaaS…"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Payment terms" htmlFor="vendor-terms">
              <input
                id="vendor-terms"
                type="text"
                value={form.paymentTerms}
                onChange={set("paymentTerms")}
                placeholder="Net 30"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Tax ID / EIN" htmlFor="vendor-taxid">
              <input
                id="vendor-taxid"
                type="text"
                value={form.taxId}
                onChange={set("taxId")}
                placeholder="12-3456789"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="vendor-address">
            <input
              id="vendor-address"
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="123 Industrial Way, Charlotte, NC"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Notes" htmlFor="vendor-notes">
            <textarea
              id="vendor-notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Preferred supplier, lead times, contract refs…"
              rows={3}
              className={inputClass}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </FormField>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
