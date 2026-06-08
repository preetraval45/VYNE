"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useSalesStore, type OpportunityStage } from "@/lib/stores/sales";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const STAGES: OpportunityStage[] = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];
const ASSIGNEES = ["Alex Rivera", "Priya Shah", "Sam Chen", "Jordan Lee"];

export default function NewOpportunityPage() {
  const router = useRouter();
  const addDeal = useSalesStore((s) => s.addDeal);

  const [form, setForm] = useState({
    name: "",
    company: "",
    contact: "",
    value: "",
    probability: "25",
    stage: "Qualification" as OpportunityStage,
    expectedClose: "",
    assignee: ASSIGNEES[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; company?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  const dirty = !!(
    form.name ||
    form.company ||
    form.contact ||
    form.value ||
    form.expectedClose
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Inline validation with focus-on-error instead of a silently-disabled
    // button (the QA report: submitting without Company gave no feedback).
    const nextErrors: { name?: string; company?: string } = {};
    if (!form.name.trim()) nextErrors.name = "Opportunity name is required.";
    if (!form.company.trim()) nextErrors.company = "Company is required.";
    if (nextErrors.name || nextErrors.company) {
      setErrors(nextErrors);
      const target = nextErrors.name ? nameRef.current : companyRef.current;
      target?.focus();
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    addDeal({
      name: form.name.trim(),
      company: form.company.trim(),
      contact: form.contact.trim(),
      value: Number(form.value) || 0,
      probability: Math.max(0, Math.min(100, Number(form.probability) || 0)),
      stage: form.stage,
      expectedClose: form.expectedClose,
      assignee: form.assignee,
    });
    toast.success(`Opportunity "${form.name}" created`);
    router.push("/sales");
  }

  return (
    <FormPageLayout
      title="New opportunity"
      subtitle="Add an opportunity to your sales pipeline"
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "New opportunity" },
      ]}
      backHref="/sales"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/sales")}
          primaryLabel="Create opportunity"
          primaryForm="new-opportunity-form"
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-opportunity-form" onSubmit={handleSubmit}>
        <FormSection
          title="Opportunity"
          description="Deal name and the company it's with."
        >
          <FormField
            label="Opportunity name"
            htmlFor="opp-name"
            required
            error={errors.name}
          >
            <input
              ref={nameRef}
              id="opp-name"
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="e.g. Q1 Enterprise expansion"
              autoFocus
              aria-invalid={!!errors.name}
              className={inputClass}
              style={{
                ...inputStyle,
                border: errors.name
                  ? "1px solid var(--status-danger, #EF4444)"
                  : inputStyle.border,
              }}
            />
          </FormField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <FormField
              label="Company"
              htmlFor="opp-company"
              required
              error={errors.company}
            >
              <input
                ref={companyRef}
                id="opp-company"
                type="text"
                value={form.company}
                onChange={(e) => {
                  setForm((f) => ({ ...f, company: e.target.value }));
                  if (errors.company)
                    setErrors((p) => ({ ...p, company: undefined }));
                }}
                placeholder="Acme Corp"
                aria-invalid={!!errors.company}
                className={inputClass}
                style={{
                  ...inputStyle,
                  border: errors.company
                    ? "1px solid var(--status-danger, #EF4444)"
                    : inputStyle.border,
                }}
              />
            </FormField>
            <FormField label="Contact" htmlFor="opp-contact">
              <input
                id="opp-contact"
                type="text"
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder="Jane Smith"
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
            <FormField label="Deal value (USD)" htmlFor="opp-value">
              <input
                id="opp-value"
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
            <FormField
              label="Probability (%)"
              htmlFor="opp-probability-new"
              hint="0–100"
            >
              <input
                id="opp-probability-new"
                type="number"
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
            <FormField label="Stage" htmlFor="opp-stage">
              <select
                id="opp-stage"
                value={form.stage}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stage: e.target.value as OpportunityStage,
                  }))
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
            <FormField label="Expected close" htmlFor="opp-close-new">
              <input
                id="opp-close-new"
                type="date"
                value={form.expectedClose}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedClose: e.target.value }))
                }
                aria-label="Expected close date"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Assignee" htmlFor="opp-assignee">
              <select
                id="opp-assignee"
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
      </form>
    </FormPageLayout>
  );
}
