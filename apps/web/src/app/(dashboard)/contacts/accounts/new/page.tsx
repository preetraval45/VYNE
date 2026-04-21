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
import { useContactsStore, type AccountStatus } from "@/lib/stores/contacts";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const STATUSES: AccountStatus[] = ["Active", "Prospect", "Inactive"];
const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Other",
];

export default function NewAccountPage() {
  const router = useRouter();
  const addAccount = useContactsStore((s) => s.addAccount);

  const [form, setForm] = useState({
    name: "",
    industry: INDUSTRIES[0],
    website: "",
    phone: "",
    revenue: "",
    employees: "",
    owner: "",
    status: "Prospect" as AccountStatus,
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.name || form.website || form.phone || form.revenue || form.owner);
  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    addAccount({
      name: form.name.trim(),
      industry: form.industry,
      website: form.website.trim(),
      phone: form.phone.trim(),
      revenue: Number.parseInt(form.revenue, 10) || 0,
      employees: Number.parseInt(form.employees, 10) || 0,
      owner: form.owner.trim(),
      status: form.status,
    });
    toast.success(`Account "${form.name}" created`);
    router.push("/contacts");
  }

  return (
    <FormPageLayout
      title="New account"
      subtitle="Add a new company or organization"
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: "New account" },
      ]}
      backHref="/contacts"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/contacts")}
          primaryLabel="Create account"
          primaryForm="new-account-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-account-form" onSubmit={handleSubmit}>
        <FormSection title="Company" description="Who are you creating this account for?">
          <FormField label="Account name" htmlFor="acc-name" required>
            <input
              id="acc-name"
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
            <FormField label="Industry" htmlFor="acc-industry">
              <select
                id="acc-industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="acc-status">
              <select
                id="acc-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AccountStatus }))}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Contact" description="How do you reach them?">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Website" htmlFor="acc-website">
              <input
                id="acc-website"
                type="text"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="acme.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone" htmlFor="acc-phone">
              <input
                id="acc-phone"
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

        <FormSection title="Details" description="Size, ownership, revenue.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Annual revenue (USD)" htmlFor="acc-revenue">
              <input
                id="acc-revenue"
                type="number"
                min={0}
                value={form.revenue}
                onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
                placeholder="1000000"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Employees" htmlFor="acc-employees">
              <input
                id="acc-employees"
                type="number"
                min={0}
                value={form.employees}
                onChange={(e) => setForm((f) => ({ ...f, employees: e.target.value }))}
                placeholder="50"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Account owner" htmlFor="acc-owner">
              <input
                id="acc-owner"
                type="text"
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                placeholder="Alex Rivera"
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
