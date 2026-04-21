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
import type { ERPBOM } from "@/lib/api/client";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

interface CompDraft {
  componentName: string;
  quantity: number;
  uom: string;
}
const emptyComp: CompDraft = { componentName: "", quantity: 1, uom: "each" };

export default function NewBomPage() {
  const router = useRouter();
  const products = useOpsStore((s) => s.products);
  const addBom = useOpsStore((s) => s.addBom);

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [version, setVersion] = useState("1.0");
  const [components, setComponents] = useState<CompDraft[]>([{ ...emptyComp }]);
  const [submitting, setSubmitting] = useState(false);

  const product = products.find((p) => p.id === productId);
  const valid = components.filter((c) => c.componentName.trim().length > 0);
  const canSubmit = !!product && valid.length > 0;
  const dirty = components.some((c) => c.componentName) || version !== "1.0";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !product) return;
    setSubmitting(true);
    const bom: ERPBOM = {
      id: `b${Date.now()}`,
      productId: product.id,
      productName: product.name,
      version,
      components: valid.map((c, i) => ({
        componentId: `c${Date.now()}-${i}`,
        componentName: c.componentName,
        quantity: c.quantity,
        uom: c.uom,
      })),
    };
    addBom(bom);
    toast.success(`BOM for ${product.name} v${version} created`);
    router.push("/ops");
  }

  function updateComp(idx: number, patch: Partial<CompDraft>) {
    setComponents((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  return (
    <FormPageLayout
      title="New BOM"
      subtitle="Define the components that go into a product"
      breadcrumbs={[{ label: "Ops", href: "/ops" }, { label: "New BOM" }]}
      backHref="/ops"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/ops")}
          primaryLabel="Create BOM"
          primaryForm="new-bom-form"
          primaryDisabled={!canSubmit}
          primaryLoading={submitting}
        />
      }
    >
      <form id="new-bom-form" onSubmit={handleSubmit}>
        <FormSection title="Product">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 14 }}>
            <FormField label="Product" htmlFor="bom-product" required>
              <select
                id="bom-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
                required
              >
                {products.length === 0 && <option value="">No products</option>}
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
            <FormField label="Version" htmlFor="bom-version">
              <input
                id="bom-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className={`${inputClass} font-mono text-center`}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Components" description="Each raw material or sub-assembly that goes into this product.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {components.map((c, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 36px", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={c.componentName}
                  onChange={(e) => updateComp(idx, { componentName: e.target.value })}
                  placeholder="Component name"
                  aria-label={`Component ${idx + 1} name`}
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={c.quantity}
                  onChange={(e) => updateComp(idx, { quantity: Number(e.target.value) || 0 })}
                  aria-label={`Component ${idx + 1} quantity`}
                  className={`${inputClass} text-center`}
                  style={inputStyle}
                />
                <select
                  value={c.uom}
                  onChange={(e) => updateComp(idx, { uom: e.target.value })}
                  aria-label={`Component ${idx + 1} unit of measure`}
                  className={`${inputClass} cursor-pointer`}
                  style={inputStyle}
                >
                  <option value="each">each</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="liter">liter</option>
                  <option value="meter">meter</option>
                  <option value="hour">hour</option>
                </select>
                <button
                  type="button"
                  onClick={() => setComponents((cs) => cs.filter((_, i) => i !== idx))}
                  disabled={components.length === 1}
                  aria-label={`Remove component ${idx + 1}`}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: "1px solid var(--content-border)",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    cursor: components.length === 1 ? "not-allowed" : "pointer",
                    opacity: components.length === 1 ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setComponents((cs) => [...cs, { ...emptyComp }])}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", marginTop: 8,
              fontSize: 12.5, fontWeight: 500,
              color: "var(--vyne-purple)",
              background: "rgba(108,71,255,0.08)",
              border: "1px dashed rgba(108,71,255,0.3)",
              borderRadius: 8,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <Plus size={13} /> Add component
          </button>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
