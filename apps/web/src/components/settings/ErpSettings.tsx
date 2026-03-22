"use client";

import { useState, useCallback } from "react";
import { Trash2, Check } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import type { CustomField, TaxRate } from "@/lib/stores/settings";

// ─── Shared styles ───────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #D8D8E8",
  borderRadius: 8,
  background: "#FAFAFE",
  outline: "none",
  fontSize: 13,
  color: "#1A1A2E",
  boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle };

function SectionCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  hint,
}: Readonly<{ label: string; children: React.ReactNode; hint?: string }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: "#A0A0B8", marginTop: 1 }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: Readonly<{ checked: boolean; onChange: () => void; label?: string }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        onKeyDown={(e) => e.key === " " && onChange()}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "#6C47FF" : "#D8D8E8",
          position: "relative",
          cursor: "pointer",
          border: "none",
          padding: 0,
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s",
          }}
        />
      </button>
      {label && <span style={{ fontSize: 12, color: "#1A1A2E" }}>{label}</span>}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────
interface ErpSettingsProps {
  readonly onToast: (message: string) => void;
}

// ─── Component ───────────────────────────────────────────────────
export default function ErpSettings({ onToast }: ErpSettingsProps) {
  const erp = useSettingsStore((s) => s.erpSettings);
  const updateErpSettings = useSettingsStore((s) => s.updateErpSettings);
  const addCustomField = useSettingsStore((s) => s.addCustomField);
  const removeCustomField = useSettingsStore((s) => s.removeCustomField);
  const addTaxRate = useSettingsStore((s) => s.addTaxRate);
  const removeTaxRate = useSettingsStore((s) => s.removeTaxRate);
  const setDefaultTaxRate = useSettingsStore((s) => s.setDefaultTaxRate);

  // New tax rate inputs
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");

  // New custom field inputs
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldEntity, setNewFieldEntity] = useState("Product");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");

  // Inventory local state
  const [threshold, setThreshold] = useState(String(erp.lowStockThreshold));
  const [warehouse, setWarehouse] = useState(erp.defaultWarehouse);
  const [saved, setSaved] = useState(false);

  const handleAddTax = useCallback(() => {
    if (!newTaxName || !newTaxRate) return;
    const rate: TaxRate = {
      id: `t${Date.now()}`,
      name: newTaxName,
      rate: Number.parseFloat(newTaxRate),
      isDefault: false,
    };
    addTaxRate(rate);
    setNewTaxName("");
    setNewTaxRate("");
    onToast("Tax rate added");
  }, [newTaxName, newTaxRate, addTaxRate, onToast]);

  const handleAddField = useCallback(() => {
    if (!newFieldLabel) return;
    const field: CustomField = {
      id: `cf${Date.now()}`,
      entity: newFieldEntity,
      label: newFieldLabel,
      type: newFieldType,
      required: false,
    };
    addCustomField(field);
    setNewFieldLabel("");
    onToast("Custom field added");
  }, [newFieldLabel, newFieldEntity, newFieldType, addCustomField, onToast]);

  const handleRemoveTax = useCallback(
    (id: string) => {
      removeTaxRate(id);
      onToast("Tax rate removed");
    },
    [removeTaxRate, onToast],
  );

  const handleRemoveField = useCallback(
    (id: string) => {
      removeCustomField(id);
      onToast("Custom field removed");
    },
    [removeCustomField, onToast],
  );

  const handleSetDefault = useCallback(
    (id: string) => {
      setDefaultTaxRate(id);
      onToast("Default tax rate updated");
    },
    [setDefaultTaxRate, onToast],
  );

  const handleToggleAutoReorder = useCallback(async () => {
    try {
      await updateErpSettings({ autoReorder: !erp.autoReorder });
      onToast(`Auto-reorder ${!erp.autoReorder ? "enabled" : "disabled"}`);
    } catch {
      onToast("Failed to update auto-reorder");
    }
  }, [erp.autoReorder, updateErpSettings, onToast]);

  const saveInventory = useCallback(async () => {
    try {
      await updateErpSettings({
        lowStockThreshold: Number(threshold),
        defaultWarehouse: warehouse,
      });
      setSaved(true);
      onToast("Inventory settings saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      onToast("Failed to save inventory settings");
    }
  }, [threshold, warehouse, updateErpSettings, onToast]);

  return (
    <div>
      {/* Inventory Settings */}
      <SectionCard title="Inventory Settings">
        <FieldRow
          label="Default Warehouse"
          hint="Primary warehouse for stock operations"
        >
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            style={{ ...selectStyle, maxWidth: 240 }}
          >
            {["main", "secondary", "overflow", "returns"].map((w) => (
              <option key={w} value={w}>
                {w.charAt(0).toUpperCase() + w.slice(1)} Warehouse
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Low Stock Threshold"
          hint="Alert when stock falls below this qty"
        >
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            style={{ ...inputStyle, maxWidth: 120 }}
          />
        </FieldRow>

        <FieldRow
          label="Auto Reorder"
          hint="Automatically create POs when stock is low"
        >
          <Toggle
            checked={erp.autoReorder}
            onChange={handleToggleAutoReorder}
            label={erp.autoReorder ? "Enabled" : "Disabled"}
          />
        </FieldRow>

        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}
        >
          <button
            onClick={saveInventory}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: saved ? "#16A34A" : "#6C47FF",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {saved ? (
              <>
                <Check size={13} /> Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </SectionCard>

      {/* Tax Rates */}
      <SectionCard title="Tax Rates">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 14,
          }}
        >
          <thead>
            <tr>
              {["Name", "Rate", "Default", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "5px 0",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#6B6B8A",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {erp.taxRates.map((t) => (
              <tr
                key={t.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
              >
                <td
                  style={{ padding: "9px 0", fontSize: 13, color: "#1A1A2E" }}
                >
                  {t.name}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#1A1A2E",
                  }}
                >
                  {t.rate}%
                </td>
                <td style={{ padding: "9px 12px" }}>
                  {t.isDefault ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "rgba(108,71,255,0.1)",
                        color: "#6C47FF",
                        fontWeight: 500,
                      }}
                    >
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(t.id)}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 20,
                        border: "1px solid #D8D8E8",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#6B6B8A",
                      }}
                    >
                      Set default
                    </button>
                  )}
                </td>
                <td style={{ padding: "9px 0", textAlign: "right" }}>
                  <button
                    onClick={() => handleRemoveTax(t.id)}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#A0A0B8",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#EF4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={newTaxName}
            onChange={(e) => setNewTaxName(e.target.value)}
            placeholder="Tax name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="number"
            value={newTaxRate}
            onChange={(e) => setNewTaxRate(e.target.value)}
            placeholder="%"
            style={{ ...inputStyle, width: 70, flex: "none" }}
          />
          <button
            onClick={handleAddTax}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              background: "#6C47FF",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              flexShrink: 0,
              fontWeight: 500,
            }}
          >
            Add
          </button>
        </div>
      </SectionCard>

      {/* Custom Fields */}
      <SectionCard title="Custom Fields">
        <p style={{ fontSize: 12, color: "#6B6B8A", marginBottom: 12 }}>
          Add custom attributes to Products, Orders, Customers, or Suppliers.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {erp.customFields.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                background: "#F7F7FB",
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: "#E8E8F0",
                  color: "#6B6B8A",
                  flexShrink: 0,
                }}
              >
                {f.entity}
              </span>
              <span style={{ fontSize: 13, color: "#1A1A2E", flex: 1 }}>
                {f.label}
              </span>
              <span style={{ fontSize: 11, color: "#A0A0B8" }}>{f.type}</span>
              <button
                onClick={() => handleRemoveField(f.id)}
                style={{
                  padding: "3px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#A0A0B8",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#EF4444";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={newFieldEntity}
            onChange={(e) => setNewFieldEntity(e.target.value)}
            style={{ ...selectStyle, width: 130, flex: "none" }}
          >
            {["Product", "Order", "Customer", "Supplier"].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <input
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            placeholder="Field label"
            style={{ ...inputStyle, flex: 1 }}
          />
          <select
            value={newFieldType}
            onChange={(e) =>
              setNewFieldType(e.target.value as CustomField["type"])
            }
            style={{ ...selectStyle, width: 110, flex: "none" }}
          >
            {["text", "number", "select", "date", "boolean"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={handleAddField}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              background: "#6C47FF",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              flexShrink: 0,
              fontWeight: 500,
            }}
          >
            Add Field
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
