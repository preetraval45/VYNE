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
import { useContactsStore, type ContactTag } from "@/lib/stores/contacts";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const AVAILABLE_TAGS: ContactTag[] = ["VIP", "Decision Maker", "Technical", "Billing", "Primary"];

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams<{ contactId: string }>();
  const contactId = params?.contactId as string;

  const contact = useContactsStore((s) => s.contacts.find((c) => c.id === contactId));
  const accounts = useContactsStore((s) => s.accounts);
  const updateContact = useContactsStore((s) => s.updateContact);
  const deleteContact = useContactsStore((s) => s.deleteContact);

  const [form, setForm] = useState(() => ({
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    accountId: contact?.accountId ?? accounts[0]?.id ?? "",
    title: contact?.title ?? "",
    department: contact?.department ?? "",
    tags: (contact?.tags ?? []) as ContactTag[],
  }));
  const [submitting, setSubmitting] = useState(false);

  if (!contact) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>Contact not found.</p>
        <Link href="/contacts" style={{ display: "inline-block", padding: "8px 14px", borderRadius: 8, background: "var(--vyne-purple)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Back to contacts
        </Link>
      </div>
    );
  }

  const account = accounts.find((a) => a.id === form.accountId);

  const dirty =
    form.name !== contact.name ||
    form.email !== contact.email ||
    form.phone !== contact.phone ||
    form.accountId !== contact.accountId ||
    form.title !== contact.title ||
    form.department !== contact.department ||
    JSON.stringify(form.tags) !== JSON.stringify(contact.tags);

  const canSubmit = form.name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    updateContact(contactId, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: account?.name ?? "",
      accountId: form.accountId,
      title: form.title.trim(),
      department: form.department.trim(),
      tags: form.tags,
    });
    toast.success("Contact updated");
    router.push("/contacts");
  }

  function handleDelete() {
    if (!confirm(`Delete contact "${contact!.name}"? This cannot be undone.`)) return;
    deleteContact(contactId);
    toast.success("Contact deleted");
    router.push("/contacts");
  }

  function toggleTag(tag: ContactTag) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  return (
    <FormPageLayout
      title={`Edit ${contact.name}`}
      subtitle="Update contact details"
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: contact.name },
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
          Delete contact
        </button>
      }
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/contacts")}
          primaryLabel="Save changes"
          primaryForm="edit-contact-form"
          primaryDisabled={!canSubmit || !dirty}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-contact-form" onSubmit={handleSubmit}>
        <FormSection title="Person">
          <FormField label="Full name" htmlFor="c-name" required>
            <input
              id="c-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Email" htmlFor="c-email">
              <input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Phone" htmlFor="c-phone">
              <input
                id="c-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Role">
          <FormField label="Account" htmlFor="c-account">
            <select
              id="c-account"
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
            >
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Title" htmlFor="c-title">
              <input
                id="c-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Department" htmlFor="c-department">
              <input
                id="c-department"
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AVAILABLE_TAGS.map((tag) => {
              const active = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background: active ? "rgba(6, 182, 212,0.08)" : "transparent",
                    color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
