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
import type { ERPWorkOrder } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const boms = useOpsStore((s) => s.boms);
  const addWorkOrder = useOpsStore((s) => s.addWorkOrder);

  const [bomId, setBomId] = useState(boms[0]?.id ?? "");
  const [qtyToProduce, setQtyToProduce] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ERPWorkOrder["status"]>("planned");
  const [submitting, setSubmitting] = useState(false);

  const bom = boms.find((b) => b.id === bomId);
  const qty = Number(qtyToProduce) || 0;
  const canSubmit = !!bom && qty > 0;
  const dirty = !!dueDate || !!scheduledDate || qtyToProduce !== "1" || status !== "planned";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !bom) return;
    setSubmitting(true);
    const wo: ERPWorkOrder = {
      id: `w${Date.now()}`,
      bomId: bom.id,
      productName: bom.productName,
      qtyToProduce: qty,
      status,
      dueDate: dueDate || undefined,
      scheduledDate: scheduledDate || undefined,
    };
    addWorkOrder(wo);
    toast.success(`Work order for ${bom.productName} created`);
    router.push("/ops");
  }

  return (
    <FormPageLayout
      title="New work order"
      subtitle="Schedule production against a BOM"
      breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "New work order" }]}
      backHref="/ops"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/ops")}
          primaryLabel="Create work order"
          primaryForm="new-wo-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        bom ? (
          <div className="surface-elevated" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Bill of materials
            </h3>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {bom.productName}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
              v{bom.version ?? "1.0"} · {bom.components?.length ?? 0} components
            </div>
            <div style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(bom.components ?? []).slice(0, 5).map((c) => (
                <div key={c.componentId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{c.componentName}</span>
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {(c.quantity * qty).toFixed(2)} {c.uom}
                  </span>
                </div>
              ))}
              {(bom.components?.length ?? 0) > 5 && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>
                  +{(bom.components?.length ?? 0) - 5} more…
                </span>
              )}
            </div>
          </div>
        ) : null
      }
    >
      <form id="new-wo-form" onSubmit={handleSubmit}>
        <FormSection title="Production">
          <FormField label="BOM" htmlFor="wo-bom" required>
            <select
              id="wo-bom"
              value={bomId}
              onChange={(e) => setBomId(e.target.value)}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
              required
            >
              {boms.length === 0 && <option value="">No BOMs — create one first</option>}
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.productName} (v{b.version ?? "1.0"})
                </option>
              ))}
            </select>
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FormField label="Quantity to produce" htmlFor="wo-qty" required>
              <input
                id="wo-qty"
                type="number"
                min={1}
                value={qtyToProduce}
                onChange={(e) => setQtyToProduce(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Scheduled date" htmlFor="wo-scheduled">
              <input
                id="wo-scheduled"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                aria-label="Scheduled date"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Due date" htmlFor="wo-due">
              <input
                id="wo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
          <FormField label="Initial status" htmlFor="wo-status">
            <select
              id="wo-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ERPWorkOrder["status"])}
              className={`${inputClass} cursor-pointer`}
              style={inputStyle}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
