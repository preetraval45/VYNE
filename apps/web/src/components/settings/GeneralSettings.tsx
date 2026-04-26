"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Upload, Globe, Palette } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import { orgsApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";

// ─── Shared styles ───────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  background: "var(--input-bg)",
  outline: "none",
  fontSize: 13,
  color: "var(--text-primary)",
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
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
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
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 1,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

// ─── Module list ─────────────────────────────────────────────────
const ALL_MODULES: Array<{ id: string; label: string; group: string }> = [
  { id: "chat", label: "Messaging", group: "Collaboration" },
  { id: "projects", label: "Projects", group: "Collaboration" },
  { id: "docs", label: "Documents", group: "Collaboration" },
  { id: "ai", label: "AI Assistant", group: "Collaboration" },
  { id: "erp", label: "ERP / Inventory", group: "Operations" },
  { id: "finance", label: "Finance", group: "Operations" },
  { id: "crm", label: "CRM", group: "Operations" },
  { id: "sales", label: "Sales", group: "Operations" },
  { id: "invoicing", label: "Invoicing", group: "Operations" },
  { id: "manufacturing", label: "Manufacturing", group: "Operations" },
  { id: "purchase", label: "Purchase", group: "Operations" },
  { id: "hr", label: "HR & People", group: "Operations" },
  { id: "marketing", label: "Marketing", group: "Operations" },
  { id: "maintenance", label: "Maintenance", group: "Operations" },
  { id: "support", label: "Support", group: "Operations" },
  { id: "observe", label: "Observability", group: "Operations" },
];

function Toggle({
  checked,
  onChange,
  label,
}: Readonly<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? "var(--vyne-purple)" : "var(--content-border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 18 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--content-bg)",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
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
  const user = useAuthStore((s) => s.user);

  const [local, setLocal] = useState(orgSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── Branding state ───────────────────────────────────────────
  const [accentColor, setAccentColor] = useState("#06B6D4");
  const [customDomain, setCustomDomain] = useState("");
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);

  // ─── Module state ─────────────────────────────────────────────
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(ALL_MODULES.map((m) => m.id)),
  );
  const [modulesSaved, setModulesSaved] = useState(false);
  const [modulesSaving, setModulesSaving] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("vyne-modules");
      if (stored) setEnabledModules(new Set(JSON.parse(stored) as string[]));
      const onboarding = localStorage.getItem("vyne-onboarding");
      if (onboarding) {
        const parsed = JSON.parse(onboarding) as {
          company?: {
            branding?: { accentColor?: string; customDomain?: string };
          };
        };
        if (parsed.company?.branding?.accentColor)
          setAccentColor(parsed.company.branding.accentColor);
        if (parsed.company?.branding?.customDomain)
          setCustomDomain(parsed.company.branding.customDomain);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveBranding = useCallback(async () => {
    setBrandingSaving(true);
    // Persist locally FIRST so the change survives reload even when the
    // gateway is offline. The gateway call is best-effort.
    try {
      const existing = JSON.parse(
        localStorage.getItem("vyne-onboarding") ?? "{}",
      ) as Record<string, unknown>;
      existing.company = {
        ...((existing.company as object) ?? {}),
        branding: { accentColor, customDomain },
      };
      localStorage.setItem("vyne-onboarding", JSON.stringify(existing));
    } catch {
      /* ignore */
    }
    try {
      if (user?.orgId) {
        await orgsApi.update(user.orgId, {
          settings: {
            branding: { accentColor, customDomain: customDomain || undefined },
          },
        });
      }
    } catch {
      // Backend not deployed yet — local persistence above keeps the change.
    }
    setBrandingSaved(true);
    onToast("Branding saved");
    setTimeout(() => setBrandingSaved(false), 2000);
    setBrandingSaving(false);
  }, [accentColor, customDomain, user, onToast]);

  const saveModules = useCallback(async () => {
    setModulesSaving(true);
    // Persist module toggles locally first so they survive reload.
    localStorage.setItem(
      "vyne-modules",
      JSON.stringify(Array.from(enabledModules)),
    );
    try {
      const features: Record<string, boolean> = {};
      for (const m of ALL_MODULES) {
        const key = m.id === "observe" ? "observability" : m.id;
        features[key] = enabledModules.has(m.id);
      }
      if (user?.orgId) {
        await orgsApi.update(user.orgId, {
          settings: {
            features: features as Parameters<
              typeof orgsApi.update
            >[1]["settings"] extends { features?: infer F }
              ? F
              : never,
          },
        });
      }
    } catch {
      // Backend not deployed yet — local persistence above keeps the change.
    }
    setModulesSaved(true);
    onToast("Module settings saved — reload to apply");
    setTimeout(() => setModulesSaved(false), 2000);
    setModulesSaving(false);
  }, [enabledModules, user, onToast]);

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
            title="Company Name"
            aria-label="Company Name"
            placeholder="Acme Inc."
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
                background: "var(--content-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed var(--input-border)",
                color: "var(--text-tertiary)",
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
                border: "1px solid var(--input-border)",
                background: "var(--content-bg)",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Upload Image
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Timezone">
          <select
            aria-label="Select option"
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
            aria-label="Select option"
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
            aria-label="Select option"
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
            aria-label="Select option"
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
            background: saved
              ? "var(--status-success)"
              : hasChanged
                ? "var(--vyne-purple)"
                : "var(--content-border)",
            color: saved || hasChanged ? "#fff" : "var(--text-tertiary)",
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

      {/* ── Branding ─────────────────────────────────────────── */}
      <SectionCard title="Branding">
        <FieldRow
          label="Accent Color"
          hint="Primary brand color used across the app"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: accentColor,
                border: "1px solid var(--input-border)",
                flexShrink: 0,
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Accent color picker"
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
            <input
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#06B6D4"
              style={{ ...inputStyle, maxWidth: 120 }}
              aria-label="Accent color hex"
            />
            <Palette size={14} color="var(--text-tertiary)" />
          </div>
        </FieldRow>

        <FieldRow
          label="Custom Domain"
          hint="White-label: e.g. app.yourcompany.com"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Globe
              size={14}
              color="var(--text-tertiary)"
              style={{ flexShrink: 0 }}
            />
            <input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.yourcompany.com"
              style={inputStyle}
              aria-label="Custom domain"
            />
          </div>
        </FieldRow>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={saveBranding}
            disabled={brandingSaving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: brandingSaved ? "#16A34A" : "#06B6D4",
              color: "#fff",
              cursor: brandingSaving ? "default" : "pointer",
              fontSize: 13,
              fontWeight: 500,
              opacity: brandingSaving ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {brandingSaved ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : brandingSaving ? (
              "Saving…"
            ) : (
              "Save Branding"
            )}
          </button>
        </div>
      </SectionCard>

      {/* ── Modules ──────────────────────────────────────────── */}
      <SectionCard title="Active Modules">
        {(["Collaboration", "Operations"] as const).map((group) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              {group}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 6,
              }}
            >
              {ALL_MODULES.filter((m) => m.group === group).map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: enabledModules.has(mod.id)
                      ? "rgba(6, 182, 212,0.07)"
                      : "var(--content-secondary)",
                    border: `1px solid ${enabledModules.has(mod.id) ? "rgba(6, 182, 212,0.25)" : "var(--content-border)"}`,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    {mod.label}
                  </span>
                  <Toggle
                    label={`Toggle ${mod.label}`}
                    checked={enabledModules.has(mod.id)}
                    onChange={(v) => {
                      setEnabledModules((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(mod.id);
                        else next.delete(mod.id);
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
        >
          <button
            type="button"
            onClick={saveModules}
            disabled={modulesSaving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: modulesSaved ? "#16A34A" : "#06B6D4",
              color: "#fff",
              cursor: modulesSaving ? "default" : "pointer",
              fontSize: 13,
              fontWeight: 500,
              opacity: modulesSaving ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {modulesSaved ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : modulesSaving ? (
              "Saving…"
            ) : (
              "Save Modules"
            )}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
