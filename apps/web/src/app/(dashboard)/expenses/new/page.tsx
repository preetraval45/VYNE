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
import { useExpensesStore } from "@/lib/stores/expenses";
import { CATEGORY_LIMITS, type ExpenseCategory, type ExpenseStatus } from "@/lib/fixtures/expenses";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const CATEGORY_OPTIONS: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: "travel", label: "Travel", icon: "✈" },
  { id: "meals", label: "Meals & Entertainment", icon: "🍽" },
  { id: "software", label: "Software", icon: "💻" },
  { id: "office", label: "Office", icon: "🏢" },
  { id: "other", label: "Other", icon: "📦" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const addExpense = useExpensesStore((s) => s.addExpense);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "travel" as ExpenseCategory,
    description: "",
    amount: "",
    currency: "USD",
    submitNow: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.description || form.amount);
  const amount = Number.parseFloat(form.amount) || 0;
  const limit = CATEGORY_LIMITS[form.category];
  const overLimit = amount > limit;
  const canSubmit = form.description.trim().length > 0 && amount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const status: ExpenseStatus = form.submitNow ? "submitted" : "draft";
    addExpense({
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount,
      currency: form.currency,
      submittedBy: "Preet Raval",
      status,
    });
    toast.success(`Expense ${form.submitNow ? "submitted" : "saved as draft"}`);
    router.push("/expenses");
  }

  return (
    <FormPageLayout
      title="New expense"
      subtitle="Record a business expense for reimbursement"
      breadcrumbs={[
        { label: "Expenses", href: "/expenses" },
        { label: "New expense" },
      ]}
      backHref="/expenses"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/expenses")}
          primaryLabel={form.submitNow ? "Submit for approval" : "Save draft"}
          primaryForm="new-expense-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Policy check
          </h3>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              marginBottom: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 18 }}>
              {CATEGORY_OPTIONS.find((c) => c.id === form.category)?.icon}
            </span>
            <strong>{CATEGORY_OPTIONS.find((c) => c.id === form.category)?.label}</strong>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>
            Per-item limit: ${limit.toLocaleString()}
          </p>
          {amount > 0 && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: overLimit
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(34,197,94,0.08)",
                border: overLimit
                  ? "1px solid rgba(239,68,68,0.25)"
                  : "1px solid rgba(34,197,94,0.25)",
                color: overLimit ? "var(--status-danger)" : "var(--status-success)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {overLimit
                ? `Over limit by $${(amount - limit).toLocaleString()} — may need manager approval`
                : `Within policy ($${(limit - amount).toLocaleString()} under limit)`}
            </div>
          )}
        </div>
      }
    >
      <form id="new-expense-form" onSubmit={handleSubmit}>
        <FormSection title="Expense details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Date" htmlFor="exp-date">
              <input
                id="exp-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Category" htmlFor="exp-category">
              <select
                id="exp-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Description" htmlFor="exp-description" required>
            <input
              id="exp-description"
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Client dinner in SF"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 14 }}>
            <FormField label="Amount" htmlFor="exp-amount" required>
              <input
                id="exp-amount"
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Currency" htmlFor="exp-currency">
              <select
                id="exp-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Submission">
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { value: false, label: "Save as draft", desc: "Keep editing before submitting" },
              { value: true, label: "Submit for approval", desc: "Send to your manager now" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setForm((f) => ({ ...f, submitNow: opt.value }))}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${form.submitNow === opt.value ? "var(--vyne-purple)" : "var(--content-border)"}`,
                  background: form.submitNow === opt.value ? "rgba(6, 182, 212,0.06)" : "var(--content-bg)",
                  color: form.submitNow === opt.value ? "var(--vyne-purple)" : "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: form.submitNow === opt.value ? "var(--vyne-purple)" : "var(--text-tertiary)",
                    fontWeight: 400,
                  }}
                >
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
