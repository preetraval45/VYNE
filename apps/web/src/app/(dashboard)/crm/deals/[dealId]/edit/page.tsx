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
import { useCRMStore, useDealById } from "@/lib/stores/crm";
import { useCustomFieldsStore } from "@/lib/stores/customFields";
import { CustomFieldsForm } from "@/components/shared/CustomFieldsRenderer";
import {
  STAGES,
  SOURCES,
  ASSIGNEES,
  type Stage,
  type Source,
} from "@/lib/fixtures/crm";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function EditDealPage() {
  const params = useParams<{ dealId: string }>();
  const router = useRouter();
  const dealId = params?.dealId as string;
  const deal = useDealById(dealId);
  const updateDeal = useCRMStore((s) => s.updateDeal);

  const [form, setForm] = useState(() => ({
    company: deal?.company ?? "",
    contactName: deal?.contactName ?? "",
    email: deal?.email ?? "",
    value: String(deal?.value ?? ""),
    probability: String(deal?.probability ?? 15),
    stage: (deal?.stage ?? "Lead") as Stage,
    source: (deal?.source ?? "website") as Source,
    assignee: deal?.assignee ?? ASSIGNEES[0],
    nextAction: deal?.nextAction ?? "",
    notes: deal?.notes ?? "",
  }));
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    () => deal?.customFields ?? {},
  );
  const [submitting, setSubmitting] = useState(false);

  const customFields =
    useCustomFieldsStore((s) => s.schemas["crm"]?.fields) ?? [];

  if (!deal) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          Deal not found.
        </p>
        <Link
          href="/crm"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to CRM
        </Link>
      </div>
    );
  }

  const dirty =
    form.company !== deal.company ||
    form.contactName !== deal.contactName ||
    form.email !== deal.email ||
    form.value !== String(deal.value) ||
    form.probability !== String(deal.probability) ||
    form.stage !== deal.stage ||
    form.source !== deal.source ||
    form.assignee !== deal.assignee ||
    form.nextAction !== deal.nextAction ||
    form.notes !== deal.notes;

  const canSubmit = form.company.trim() && form.contactName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    updateDeal(dealId, {
      company: form.company.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      value: Number.parseInt(form.value, 10) || 0,
      probability: Math.max(
        0,
        Math.min(100, Number.parseInt(form.probability, 10) || 0),
      ),
      stage: form.stage,
      source: form.source,
      assignee: form.assignee,
      nextAction: form.nextAction,
      notes: form.notes,
      lastActivity: new Date().toISOString(),
      customFields:
        Object.keys(customValues).length > 0 ? customValues : undefined,
    });
    toast.success("Deal updated");
    router.push(`/crm/deals/${dealId}`);
  }

  return (
    <FormPageLayout
      title="Edit deal"
      subtitle={`Update ${deal.company}`}
      breadcrumbs={[
        { label: "CRM", href: "/crm" },
        { label: deal.company, href: `/crm/deals/${dealId}` },
        { label: "Edit" },
      ]}
      backHref={`/crm/deals/${dealId}`}
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push(`/crm/deals/${dealId}`)}
          primaryLabel="Save changes"
          primaryForm="edit-deal-form"
          primaryDisabled={!canSubmit || !dirty}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-deal-form" onSubmit={handleSubmit}>
        <FormSection title="Company">
          <FormField label="Company name" htmlFor="edit-deal-company" required>
            <input
              id="edit-deal-company"
              type="text"
              title="Company name"
              aria-label="Company name"
              placeholder="Acme Corp"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              required
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField
              label="Contact name"
              htmlFor="edit-deal-contact"
              required
            >
              <input
                id="edit-deal-contact"
                type="text"
                title="Contact name"
                aria-label="Contact name"
                placeholder="Jane Smith"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Email" htmlFor="edit-deal-email">
              <input
                id="edit-deal-email"
                type="email"
                title="Email"
                aria-label="Email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Pipeline">
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField label="Deal value" htmlFor="edit-deal-value" hint="USD">
              <input
                id="edit-deal-value"
                type="number"
                title="Deal value (USD)"
                aria-label="Deal value"
                placeholder="50000"
                min={0}
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField
              label="Probability"
              htmlFor="edit-deal-probability"
              hint="0–100"
            >
              <input
                id="edit-deal-probability"
                type="number"
                title="Probability (0–100)"
                aria-label="Probability"
                placeholder="50"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) =>
                  setForm((f) => ({ ...f, probability: e.target.value }))
                }
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Stage" htmlFor="edit-deal-stage">
              <select
                id="edit-deal-stage"
                title="Stage"
                aria-label="Stage"
                value={form.stage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stage: e.target.value as Stage }))
                }
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Source" htmlFor="edit-deal-source">
              <select
                id="edit-deal-source"
                title="Source"
                aria-label="Source"
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: e.target.value as Source }))
                }
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Assignee" htmlFor="edit-deal-assignee">
              <select
                id="edit-deal-assignee"
                title="Assignee"
                aria-label="Assignee"
                value={form.assignee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assignee: e.target.value }))
                }
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Next action" htmlFor="edit-deal-next">
              <input
                id="edit-deal-next"
                type="text"
                value={form.nextAction}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nextAction: e.target.value }))
                }
                placeholder="e.g. Follow-up call"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Notes">
          <FormField label="Notes" htmlFor="edit-deal-notes">
            <textarea
              id="edit-deal-notes"
              title="Notes"
              aria-label="Notes"
              placeholder="Decision maker, timeline, budget…"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={4}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <CustomFieldsForm
          fields={customFields}
          values={customValues}
          onChange={(id, v) =>
            setCustomValues((prev) => ({ ...prev, [id]: v }))
          }
        />
      </form>
    </FormPageLayout>
  );
}
