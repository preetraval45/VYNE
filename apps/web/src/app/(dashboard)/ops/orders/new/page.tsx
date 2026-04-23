"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useOpsStore } from "@/lib/stores/ops";
import type { ERPOrder, ERPOrderLine } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

interface LineDraft {
  productName: string;
  quantity: number;
  unitPrice: number;
}

const emptyLine: LineDraft = { productName: "", quantity: 1, unitPrice: 0 };

export default function NewOpsOrderPage() {
  const router = useRouter();
  const products = useOpsStore((s) => s.products);
  const orders = useOpsStore((s) => s.orders);
  const addOrder = useOpsStore((s) => s.addOrder);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState<ERPOrder["status"]>("draft");
  const [lines, setLines] = useState<LineDraft[]>([{ ...emptyLine }]);
  const [submitting, setSubmitting] = useState(false);

  const validLines = lines.filter((l) => l.productName.trim().length > 0);
  const canSubmit = customerName.trim().length > 0 && validLines.length > 0;
  const total = validLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const dirty = !!customerName || !!customerEmail || lines.some((l) => l.productName || l.unitPrice > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const id = `o${Date.now()}`;
    const orderNumber = `ORD-${String(orders.length + 1).padStart(4, "0")}`;
    const order: ERPOrder = {
      id,
      orderNumber,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      status,
      total,
      createdAt: new Date().toISOString(),
      lines: validLines.map((l, i) => ({
        id: `${id}-${i}`,
        productId: products.find((p) => p.name === l.productName)?.id ?? `ext-${i}`,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })) as ERPOrderLine[],
    };
    addOrder(order);
    toast.success(`Order ${orderNumber} created`);
    router.push("/ops");
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <FormPageLayout
      title="New order"
      subtitle="Record a customer order"
      breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "New order" }]}
      backHref="/ops"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/ops")}
          primaryLabel="Create order"
          primaryForm="new-ops-order-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
      aside={
        <div className="surface-elevated" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Order total
          </h3>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{customerName || "Customer"}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {validLines.length} line item{validLines.length !== 1 ? "s" : ""}
          </div>
          <div style={{ height: 1, background: "var(--content-border)", margin: "12px 0" }} />
          <div className="text-aurora" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1 }}>
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      }
    >
      <form id="new-ops-order-form" onSubmit={handleSubmit}>
        <FormSection title="Customer">
          <FormField label="Customer name" htmlFor="ord-customer" required>
            <input
              id="ord-customer"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Acme Corp"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 14 }}>
            <FormField label="Customer email" htmlFor="ord-email">
              <input
                id="ord-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="buyer@company.com"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Status" htmlFor="ord-status">
              <select
                id="ord-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ERPOrder["status"])}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Line items">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((l, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 36px", gap: 8, alignItems: "center" }}>
                <input
                  list="ops-products"
                  value={l.productName}
                  onChange={(e) => {
                    const picked = products.find((p) => p.name === e.target.value);
                    updateLine(idx, {
                      productName: e.target.value,
                      unitPrice: picked?.price ?? l.unitPrice,
                    });
                  }}
                  placeholder="Product"
                  aria-label={`Line item ${idx + 1} product`}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 1 })}
                  aria-label={`Line item ${idx + 1} quantity`}
                  className={`${inputClass} text-center`}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) || 0 })}
                  aria-label={`Line item ${idx + 1} unit price`}
                  className={inputClass}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                  disabled={lines.length === 1}
                  aria-label={`Remove line item ${idx + 1}`}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: "1px solid var(--content-border)",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    cursor: lines.length === 1 ? "not-allowed" : "pointer",
                    opacity: lines.length === 1 ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <datalist id="ops-products">
            {products.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", marginTop: 8,
              fontSize: 12.5, fontWeight: 500,
              color: "var(--vyne-purple)",
              background: "rgba(6, 182, 212,0.08)",
              border: "1px dashed rgba(6, 182, 212,0.3)",
              borderRadius: 8,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <Plus size={13} /> Add line item
          </button>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
