"use client";

import { useState, useCallback } from "react";
import { Check, Upload } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";

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

// ─── Props ───────────────────────────────────────────────────────
interface GeneralSettingsProps {
  readonly onToast: (message: string) => void;
}

// ─── Component ───────────────────────────────────────────────────
export default function GeneralSettings({ onToast }: GeneralSettingsProps) {
  const orgSettings = useSettingsStore((s) => s.orgSettings);
  const updateOrgSettings = useSettingsStore((s) => s.updateOrgSettings);

  const [local, setLocal] = useState(orgSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep local in sync when store rehydrates
  const hasChanged =
    local.name !== orgSettings.name ||
    local.timezone !== orgSettings.timezone ||
    local.language !== orgSettings.language ||
    local.defaultCurrency !== orgSettings.defaultCurrency ||
    local.fiscalYearStart !== orgSettings.fiscalYearStart;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await updateOrgSettings(local);
      setSaved(true);
      onToast("Organisation settings saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      onToast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [local, updateOrgSettings, onToast]);

  return (
    <div>
      <SectionCard title="Organisation">
        <FieldRow label="Company Name" hint="Displayed across the platform">
          <input
            value={local.name}
            onChange={(e) => setLocal({ ...local, name: e.target.value })}
            style={inputStyle}
          />
        </FieldRow>

        <FieldRow label="Logo" hint="Company avatar / logo">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#F0F0F8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #D8D8E8",
                color: "#A0A0B8",
                flexShrink: 0,
              }}
            >
              {local.logo ? (
                <img
                  src={local.logo}
                  alt="Logo"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Upload size={18} />
              )}
            </div>
            <button
              type="button"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid #D8D8E8",
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
                color: "#6B6B8A",
              }}
            >
              Upload Image
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Timezone">
          <select
            value={local.timezone}
            onChange={(e) => setLocal({ ...local, timezone: e.target.value })}
            style={selectStyle}
          >
            {[
              "America/New_York",
              "America/Chicago",
              "America/Denver",
              "America/Los_Angeles",
              "Europe/London",
              "Europe/Paris",
              "Europe/Berlin",
              "Asia/Kolkata",
              "Asia/Tokyo",
              "Australia/Sydney",
            ].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Language">
          <select
            value={local.language}
            onChange={(e) => setLocal({ ...local, language: e.target.value })}
            style={{ ...selectStyle, maxWidth: 240 }}
          >
            {[
              { value: "en", label: "English" },
              { value: "es", label: "Spanish" },
              { value: "fr", label: "French" },
              { value: "de", label: "German" },
              { value: "pt", label: "Portuguese" },
              { value: "hi", label: "Hindi" },
              { value: "ja", label: "Japanese" },
            ].map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Finance Defaults">
        <FieldRow
          label="Currency"
          hint="Default currency for orders & invoices"
        >
          <select
            value={local.defaultCurrency}
            onChange={(e) =>
              setLocal({ ...local, defaultCurrency: e.target.value })
            }
            style={{ ...selectStyle, maxWidth: 200 }}
          >
            {["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow
          label="Fiscal Year Start"
          hint="Month the financial year begins"
        >
          <select
            value={local.fiscalYearStart}
            onChange={(e) =>
              setLocal({ ...local, fiscalYearStart: e.target.value })
            }
            style={{ ...selectStyle, maxWidth: 200 }}
          >
            {["January", "February", "March", "April", "July", "October"].map(
              (m, i) => (
                <option key={m} value={String([1, 2, 3, 4, 7, 10][i])}>
                  {m}
                </option>
              ),
            )}
          </select>
        </FieldRow>
      </SectionCard>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={save}
          disabled={saving || (!hasChanged && !saved)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: saved ? "#16A34A" : hasChanged ? "#6C47FF" : "#D8D8E8",
            color: saved || hasChanged ? "#fff" : "#A0A0B8",
            cursor: hasChanged ? "pointer" : "default",
            fontSize: 13,
            fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
          {saved ? (
            <>
              <Check size={14} /> Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
