"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useCRMStore } from "@/lib/stores/crm";
import { useCustomFieldsStore } from "@/lib/stores/customFields";
import { CustomFieldsForm } from "@/components/shared/CustomFieldsRenderer";
import {
  STAGES,
  SOURCES,
  ASSIGNEES,
  type Stage,
  type Source,
  type Deal,
} from "@/lib/fixtures/crm";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

function NewDealPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultStage = (searchParams.get("stage") as Stage) || "Lead";
  const addDeal = useCRMStore((s) => s.addDeal);

  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    value: "",
    stage: defaultStage as Stage,
    source: "website" as Source,
    assignee: ASSIGNEES[0],
    notes: "",
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Admin-defined CRM custom fields. Read directly off the schemas map
  // (same pattern as projects/page.tsx) so React only rerenders when
  // someone updates the schema, not on every store change.
  const customFields =
    useCustomFieldsStore((s) => s.schemas["crm"]?.fields) ?? [];

  const dirty = !!(
    form.company ||
    form.contactName ||
    form.email ||
    form.value ||
    form.notes
  );
  const canSubmit = form.company.trim() && form.contactName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const id = `d${Date.now()}`;
    const deal: Deal = {
      id,
      company: form.company.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      stage: form.stage,
      value: Number.parseInt(form.value, 10) || 0,
      probability: 15,
      assignee: form.assignee,
      lastActivity: new Date().toISOString(),
      nextAction: "",
      source: form.source,
      notes: form.notes,
      customFields:
        Object.keys(customValues).length > 0 ? customValues : undefined,
    };
    addDeal(deal);
    toast.success(`Deal "${form.company}" created`);
    router.push(`/crm/deals/${id}`);
  }

  return (
    <FormPageLayout
      title="New deal"
      subtitle="Add a deal to your pipeline"
      breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "New deal" }]}
      backHref="/crm"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/crm")}
          primaryLabel="Create deal"
          primaryForm="new-deal-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-deal-form" onSubmit={handleSubmit}>
        <FormSection title="Company" description="Who is this deal with?">
          <FormField label="Company name" htmlFor="deal-company" required>
            <input
              id="deal-company"
              type="text"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              placeholder="Acme Corp"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField label="Contact name" htmlFor="deal-contact" required>
              <input
                id="deal-contact"
                type="text"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                placeholder="Jane Smith"
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Email" htmlFor="deal-email">
              <input
                id="deal-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="jane@company.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Pipeline"
          description="Where is this deal in your sales process?"
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField label="Deal value" htmlFor="deal-value" hint="USD">
              <input
                id="deal-value"
                type="number"
                min={0}
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                placeholder="50000"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Stage" htmlFor="deal-stage">
              <select
                id="deal-stage"
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
            <FormField label="Source" htmlFor="deal-source">
              <select
                id="deal-source"
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
            <FormField label="Assignee" htmlFor="deal-assignee">
              <select
                id="deal-assignee"
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
          </div>
        </FormSection>

        <FormSection
          title="Notes"
          description="Optional context about this deal."
        >
          <FormField label="Notes" htmlFor="deal-notes">
            <textarea
              id="deal-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Decision maker, timeline, budget, pain points…"
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

export default function NewDealPage() {
  return (
    <Suspense fallback={null}>
      <NewDealPageInner />
    </Suspense>
  );
}
