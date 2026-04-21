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
import { useFinanceStore } from "@/lib/stores/finance";
import type { ERPJournalEntry } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function NewJournalEntryPage() {
  const router = useRouter();
  const entries = useFinanceStore((s) => s.journalEntries);
  const addEntry = useFinanceStore((s) => s.addJournalEntry);

  const [form, setForm] = useState({
    description: "",
    totalDebits: "",
    postingDate: new Date().toISOString().slice(0, 10),
    status: "draft" as "draft" | "posted",
  });
  const [submitting, setSubmitting] = useState(false);

  const dirty = !!(form.description || form.totalDebits);
  const canSubmit =
    form.description.trim().length > 0 &&
    Number.parseFloat(form.totalDebits) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const entry: ERPJournalEntry = {
      id: `j${Date.now()}`,
      entryNumber: `JE-${String(entries.length + 1).padStart(3, "0")}`,
      description: form.description.trim(),
      postingDate: new Date(form.postingDate).toISOString(),
      status: form.status,
      totalDebits: Number.parseFloat(form.totalDebits) || 0,
    };
    addEntry(entry);
    toast.success(`Journal entry ${entry.entryNumber} created`);
    router.push("/finance");
  }

  return (
    <FormPageLayout
      title="New journal entry"
      subtitle="Add a manual debit/credit entry to the general ledger"
      breadcrumbs={[
        { label: "Finance", href: "/finance" },
        { label: "New entry" },
      ]}
      backHref="/finance"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/finance")}
          primaryLabel={
            form.status === "posted" ? "Post entry" : "Save as draft"
          }
          primaryForm="new-journal-form"
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
            Entry preview
          </h3>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--vyne-purple)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            JE-{String(entries.length + 1).padStart(3, "0")}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            {form.description || "Description"}
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginBottom: 16,
            }}
          >
            {new Date(form.postingDate).toLocaleDateString()}
          </p>
          <div
            style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }}
          />
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            ${Number.parseFloat(form.totalDebits || "0").toLocaleString()}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            Total debits
          </p>
        </div>
      }
    >
      <form id="new-journal-form" onSubmit={handleSubmit}>
        <FormSection
          title="Entry details"
          description="What does this journal entry record?"
        >
          <FormField label="Description" htmlFor="je-desc" required>
            <input
              id="je-desc"
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. Sales revenue batch — March"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Total debits (USD)" htmlFor="je-amount" required>
              <input
                id="je-amount"
                type="number"
                min={0}
                step="0.01"
                value={form.totalDebits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, totalDebits: e.target.value }))
                }
                placeholder="10000.00"
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Posting date" htmlFor="je-date">
              <input
                id="je-date"
                type="date"
                value={form.postingDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, postingDate: e.target.value }))
                }
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Status"
          description="Draft entries can be edited. Posted entries are part of the ledger."
        >
          <div style={{ display: "flex", gap: 10 }}>
            {(["draft", "posted"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${form.status === s ? "var(--vyne-purple)" : "var(--content-border)"}`,
                  background:
                    form.status === s
                      ? "rgba(108,71,255,0.06)"
                      : "var(--content-bg)",
                  color:
                    form.status === s
                      ? "var(--vyne-purple)"
                      : "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: "capitalize",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{s}</div>
                <div
                  style={{
                    fontSize: 11,
                    color:
                      form.status === s
                        ? "var(--vyne-purple)"
                        : "var(--text-tertiary)",
                    fontWeight: 400,
                    textTransform: "none",
                  }}
                >
                  {s === "draft"
                    ? "Save for later editing"
                    : "Post to the ledger now"}
                </div>
              </button>
            ))}
          </div>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
