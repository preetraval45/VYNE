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
import type { ERPSupplier } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function NewSupplierPage() {
  const router = useRouter();
  const addSupplier = useOpsStore((s) => s.addSupplier);

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.contactName || form.email || form.phone);
  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const supplier: ERPSupplier = {
      id: `sup${Date.now()}`,
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
    };
    addSupplier(supplier);
    toast.success(`Supplier "${form.name}" created`);
    router.push("/ops");
  }

  return (
    <FormPageLayout
      title="New supplier"
      subtitle="Register a new supplier for procurement"
      breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "New supplier" }]}
      backHref="/ops"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/ops")}
          primaryLabel="Create supplier"
          primaryForm="new-supplier-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-supplier-form" onSubmit={handleSubmit}>
        <FormSection title="Supplier">
          <FormField label="Company name" htmlFor="sup-name" required>
            <input
              id="sup-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Components Inc."
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Primary contact" htmlFor="sup-contact">
            <input
              id="sup-contact"
              type="text"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              placeholder="Jane Smith"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Email" htmlFor="sup-email">
              <input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="orders@supplier.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone" htmlFor="sup-phone">
              <input
                id="sup-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
          <FormField label="Status" htmlFor="sup-status">
            <select
              id="sup-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="pending">Pending review</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
