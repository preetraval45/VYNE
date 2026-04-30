"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useContactsStore, type AccountStatus } from "@/lib/stores/contacts";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const STATUSES: AccountStatus[] = ["Active", "Prospect", "Inactive"];
const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Retail",
  "Manufacturing", "Education", "Real Estate", "Other",
];

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params?.accountId as string;

  const account = useContactsStore((s) => s.accounts.find((a) => a.id === accountId));
  const updateAccount = useContactsStore((s) => s.updateAccount);
  const deleteAccount = useContactsStore((s) => s.deleteAccount);

  const [form, setForm] = useState(() => ({
    name: account?.name ?? "",
    industry: account?.industry ?? INDUSTRIES[0],
    website: account?.website ?? "",
    phone: account?.phone ?? "",
    revenue: String(account?.revenue ?? ""),
    employees: String(account?.employees ?? ""),
    owner: account?.owner ?? "",
    status: account?.status ?? "Prospect" as AccountStatus,
  }));
  const [submitting, setSubmitting] = useState(false);

  if (!account) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>Account not found.</p>
        <Link href="/contacts" style={{ display: "inline-block", padding: "8px 14px", borderRadius: 8, background: "var(--vyne-accent, var(--vyne-purple))", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Back to contacts
        </Link>
      </div>
    );
  }

  const dirty =
    form.name !== account.name ||
    form.industry !== account.industry ||
    form.website !== account.website ||
    form.phone !== account.phone ||
    form.revenue !== String(account.revenue) ||
    form.employees !== String(account.employees) ||
    form.owner !== account.owner ||
    form.status !== account.status;

  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    updateAccount(accountId, {
      name: form.name.trim(),
      industry: form.industry,
      website: form.website.trim(),
      phone: form.phone.trim(),
      revenue: Number.parseInt(form.revenue, 10) || 0,
      employees: Number.parseInt(form.employees, 10) || 0,
      owner: form.owner.trim(),
      status: form.status,
    });
    toast.success("Account updated");
    router.push("/contacts");
  }

  function handleDelete() {
    if (!confirm(`Delete account "${account!.name}"? This cannot be undone.`)) return;
    deleteAccount(accountId);
    toast.success("Account deleted");
    router.push("/contacts");
  }

  return (
    <FormPageLayout
      title={`Edit ${account.name}`}
      subtitle="Update account details"
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: account.name },
        { label: "Edit" },
      ]}
      backHref="/contacts"
      dirty={dirty}
      headerActions={
        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8,
            fontSize: 12.5, fontWeight: 500,
            color: "var(--status-danger)",
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.06)",
            cursor: "pointer",
          }}
        >
          Delete account
        </button>
      }
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/contacts")}
          primaryLabel="Save changes"
          primaryForm="edit-account-form"
          primaryDisabled={!canSubmit || !dirty}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-account-form" onSubmit={handleSubmit}>
        <FormSection title="Company">
          <FormField label="Account name" htmlFor="acc-name" required>
            <input
              id="acc-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
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

        <FormSection title="Contact">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Website" htmlFor="acc-website">
              <input
                id="acc-website"
                type="text"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
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
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Annual revenue (USD)" htmlFor="acc-revenue">
              <input
                id="acc-revenue"
                type="number"
                min={0}
                value={form.revenue}
                onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
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
