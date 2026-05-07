"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Upload, Globe, Palette, Type, Layers, Copy, Download, Upload as UploadIcon } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import { orgsApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";
import { csrfFetch } from "@/lib/api/csrfFetch";
import {
  useThemeStore,
  FONT_OPTIONS,
  MODULE_LABELS,
  type Density,
  type FontKey,
  type SidebarPattern,
  type ThemeBundle,
  type ModuleId,
} from "@/lib/stores/theme";

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
        background: checked ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)",
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
  const [accentColor, setAccentColor] = useState("var(--vyne-accent, #06B6D4)");
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
    const modulesArr = Array.from(enabledModules);
    // Persist module toggles locally first so they survive reload.
    localStorage.setItem("vyne-modules", JSON.stringify(modulesArr));
    // Persist to the user record in Postgres so it follows them across
    // devices. Demo users have no DB row — that 401s and we silently
    // fall back to the local copy above, which is the right behaviour.
    try {
      await csrfFetch("/api/auth/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: modulesArr }),
      });
    } catch {
      // Network failure — local copy persists; user can retry.
    }
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
      // ERP backend not deployed yet — local persistence above keeps the change.
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
                ? "var(--vyne-accent, var(--vyne-purple))"
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

      <DensityToggleRow />

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
              placeholder="var(--vyne-accent, #06B6D4)"
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
              background: brandingSaved ? "#16A34A" : "var(--vyne-accent, #06B6D4)",
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

      {/* ── Tenant logo + favicon (Phase 7.5 / 10.5) ────────── */}
      <BrandAssetsSection onToast={onToast} />

      {/* ── Theme presets ─────────────────────────────────────── */}
      <ThemePresetsSection />

      {/* ── Appearance / Density ─────────────────────────────── */}
      <DensitySection />

      {/* ── Font picker (Phase 7.8) ─────────────────────────── */}
      <FontPickerSection />

      {/* ── Sidebar wallpaper (Phase 7.9) ───────────────────── */}
      <SidebarPatternSection />

      {/* ── Per-module accent override (Phase 7.7 / 10.6) ───── */}
      <ModuleAccentsSection />

      {/* ── Theme JSON export / import (Phase 7.11) ─────────── */}
      <ThemeJsonSection onToast={onToast} />

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
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.07)"
                      : "var(--content-secondary)",
                    border: `1px solid ${enabledModules.has(mod.id) ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.25)" : "var(--content-border)"}`,
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
              background: modulesSaved ? "#16A34A" : "var(--vyne-accent, #06B6D4)",
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

// ── DensityToggleRow ────────────────────────────────────────────
// Three-segment picker: Compact / Comfortable / Spacious. Writes the
// chosen value to localStorage and to <html data-density="..."> so
// the CSS variables shipped earlier (--density-row-py / -px / -fs)
// re-bind site-wide.

function DensityToggleRow() {
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("comfortable");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("vyne-density");
    if (saved === "compact" || saved === "comfortable" || saved === "spacious") {
      setDensity(saved);
      document.documentElement.dataset.density = saved;
    }
  }, []);

  function pick(v: "compact" | "comfortable" | "spacious") {
    setDensity(v);
    document.documentElement.dataset.density = v;
    try {
      localStorage.setItem("vyne-density", v);
    } catch {
      // ignore quota
    }
  }

  return (
    <SectionCard title="Display density">
      <FieldRow label="Row density" hint="Compact = denser tables; Spacious = larger touch targets">
        <div
          role="radiogroup"
          aria-label="Display density"
          style={{
            display: "inline-flex",
            border: "1px solid var(--input-border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {(["compact", "comfortable", "spacious"] as const).map((v) => {
            const active = density === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(v)}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  background: active ? "var(--vyne-accent, #5B5BD6)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </FieldRow>
    </SectionCard>
  );
}

// ─── Theme presets ────────────────────────────────────────────────
// Curated bundles that set theme + accent + density in one click.
const THEME_PRESETS = [
  {
    id: "vyne",
    name: "VYNE",
    desc: "Default cyan + dark + comfortable",
    theme: "dark" as const,
    accent: "purple" as const,
    customHex: null,
    density: "comfortable" as const,
    swatch: "#06B6D4",
  },
  {
    id: "linear",
    name: "Linear",
    desc: "Indigo · dark · compact",
    theme: "dark" as const,
    accent: "indigo" as const,
    customHex: null,
    density: "compact" as const,
    swatch: "#6366F1",
  },
  {
    id: "notion",
    name: "Notion",
    desc: "Slate · light · comfortable",
    theme: "light" as const,
    accent: "purple" as const,
    customHex: "#3B3B3B",
    density: "comfortable" as const,
    swatch: "#3B3B3B",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    desc: "Sky blue · light · comfortable",
    theme: "light" as const,
    accent: "sky" as const,
    customHex: null,
    density: "comfortable" as const,
    swatch: "#0EA5E9",
  },
  {
    id: "github",
    name: "GitHub",
    desc: "Emerald · dark · compact",
    theme: "dark" as const,
    accent: "green" as const,
    customHex: "#2DA44E",
    density: "compact" as const,
    swatch: "#2DA44E",
  },
  {
    id: "stripe",
    name: "Stripe",
    desc: "Violet · light · spacious",
    theme: "light" as const,
    accent: "violet" as const,
    customHex: "#635BFF",
    density: "spacious" as const,
    swatch: "#635BFF",
  },
  {
    id: "solarized",
    name: "Solarized",
    desc: "Amber · dark · comfortable",
    theme: "dark" as const,
    accent: "amber" as const,
    customHex: "#B58900",
    density: "comfortable" as const,
    swatch: "#B58900",
  },
  {
    id: "rose",
    name: "Rose noir",
    desc: "Rose · dark · spacious",
    theme: "dark" as const,
    accent: "rose" as const,
    customHex: null,
    density: "spacious" as const,
    swatch: "#F43F5E",
  },
];

function ThemePresetsSection() {
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setCustomAccent = useThemeStore((s) => s.setCustomAccent);
  const setDensity = useThemeStore((s) => s.setDensity);

  function applyPreset(p: (typeof THEME_PRESETS)[number]) {
    setTheme(p.theme);
    setAccent(p.accent);
    setCustomAccent(p.customHex);
    setDensity(p.density);
  }

  return (
    <SectionCard title="Theme presets">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 4px",
        }}
      >
        One click sets accent, light/dark mode, and density together.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
          padding: "8px 18px 18px",
        }}
      >
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "border-color 0.15s, transform 0.08s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--vyne-accent, #06B6D4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: p.swatch,
                flexShrink: 0,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Appearance / Density ─────────────────────────────────────────
function DensitySection() {
  const density = useThemeStore((s) => s.density);
  const setDensity = useThemeStore((s) => s.setDensity);

  const options: { id: Density; label: string; hint: string }[] = [
    { id: "compact", label: "Compact", hint: "Tighter rows · more on screen" },
    { id: "comfortable", label: "Comfortable", hint: "Default · balanced spacing" },
    { id: "spacious", label: "Spacious", hint: "Roomy · larger touch targets" },
  ];

  return (
    <SectionCard title="Appearance">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
        }}
      >
        Density scales row heights, paddings, and font sizes app-wide.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          padding: "8px 18px 18px",
        }}
      >
        {options.map((opt) => {
          const active = density === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDensity(opt.id)}
              aria-pressed={active}
              style={{
                background: active
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                  : "var(--content-bg)",
                border: active
                  ? "1px solid var(--vyne-accent, #06B6D4)"
                  : "1px solid var(--content-border)",
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {opt.label}
                {active && (
                  <Check size={13} style={{ color: "var(--vyne-accent, #06B6D4)" }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {opt.hint}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Font picker (Phase 7.8) ──────────────────────────────────────
// Six options: Geist (default), Inter, IBM Plex Sans, Space Grotesk,
// System, JetBrains Mono. ThemeApplier handles the on-demand <link>
// injection for Google-hosted families.
function FontPickerSection() {
  const font = useThemeStore((s) => s.font);
  const setFont = useThemeStore((s) => s.setFont);

  const keys = Object.keys(FONT_OPTIONS) as FontKey[];

  return (
    <SectionCard title="Font">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Type size={12} />
        Choose a font family for the entire workspace.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
          padding: "8px 18px 18px",
        }}
      >
        {keys.map((key) => {
          const opt = FONT_OPTIONS[key];
          const active = font === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFont(key)}
              aria-pressed={active}
              style={{
                background: active
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                  : "var(--content-bg)",
                border: active
                  ? "1px solid var(--vyne-accent, #06B6D4)"
                  : "1px solid var(--content-border)",
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
                fontFamily: opt.stack,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: opt.stack,
                }}
              >
                {opt.label}
                {active && (
                  <Check size={13} style={{ color: "var(--vyne-accent, #06B6D4)" }} />
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  fontFamily: opt.stack,
                  letterSpacing: opt.mono ? "-0.01em" : "-0.005em",
                }}
              >
                The quick brown fox 1234567890
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Sidebar pattern picker (Phase 7.9) ───────────────────────────
// Five options: none / dots / lines / noise / gradient. ThemeApplier
// writes data-sidebar-pattern; CSS in globals.css matches and applies
// background-image so the choice cascades without per-component edits.
function SidebarPatternSection() {
  const pattern = useThemeStore((s) => s.sidebarPattern);
  const setPattern = useThemeStore((s) => s.setSidebarPattern);

  const options: { id: SidebarPattern; label: string; hint: string; preview: React.CSSProperties }[] = [
    {
      id: "none",
      label: "Plain",
      hint: "Default · no pattern",
      preview: { background: "var(--content-card-gradient, var(--content-bg))" },
    },
    {
      id: "dots",
      label: "Dots",
      hint: "Subtle radial dots",
      preview: {
        backgroundImage:
          "radial-gradient(rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32) 1px, transparent 1.4px)",
        backgroundSize: "10px 10px",
      },
    },
    {
      id: "lines",
      label: "Lines",
      hint: "Diagonal hatch",
      preview: {
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18) 0 1px, transparent 1px 8px)",
      },
    },
    {
      id: "noise",
      label: "Noise",
      hint: "Soft film grain",
      preview: {
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "120px 120px",
      },
    },
    {
      id: "gradient",
      label: "Glow",
      hint: "Accent-tinted gradient",
      preview: {
        backgroundImage:
          "radial-gradient(circle at 20% 0%, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.45), transparent 55%), radial-gradient(circle at 80% 100%, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32), transparent 50%)",
      },
    },
  ];

  return (
    <SectionCard title="Sidebar wallpaper">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Layers size={12} />
        Add a subtle pattern behind the sidebar so this workspace feels distinct.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
          padding: "8px 18px 18px",
        }}
      >
        {options.map((opt) => {
          const active = pattern === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPattern(opt.id)}
              aria-pressed={active}
              style={{
                background: "var(--content-bg)",
                border: active
                  ? "1px solid var(--vyne-accent, #06B6D4)"
                  : "1px solid var(--content-border)",
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  height: 60,
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  marginBottom: 8,
                  ...opt.preview,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {opt.label}
                {active && (
                  <Check size={12} style={{ color: "var(--vyne-accent, #06B6D4)" }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {opt.hint}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Theme JSON export / import (Phase 7.11) ──────────────────────
// Captures the full ThemeBundle from the store, serialises to JSON, and
// supports clipboard copy + paste-import. Powers a future "themes
// gallery" community share.
function ThemeJsonSection({ onToast }: Readonly<{ onToast: (m: string) => void }>) {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const customAccentHex = useThemeStore((s) => s.customAccentHex);
  const customBgHex = useThemeStore((s) => s.customBgHex);
  const density = useThemeStore((s) => s.density);
  const font = useThemeStore((s) => s.font);
  const sidebarPattern = useThemeStore((s) => s.sidebarPattern);
  const logoUrl = useThemeStore((s) => s.logoUrl);
  const faviconUrl = useThemeStore((s) => s.faviconUrl);
  const moduleAccents = useThemeStore((s) => s.moduleAccents);
  const applyBundle = useThemeStore((s) => s.applyBundle);

  const [paste, setPaste] = useState("");
  const [importErr, setImportErr] = useState<string | null>(null);

  const bundle: ThemeBundle = {
    theme,
    accent,
    customAccentHex,
    customBgHex,
    density,
    font,
    sidebarPattern,
    logoUrl,
    faviconUrl,
    moduleAccents,
  };
  const exported = JSON.stringify(bundle, null, 2);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exported);
      onToast("Theme copied to clipboard");
    } catch {
      onToast("Couldn't access clipboard — copy manually");
    }
  }, [exported, onToast]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vyne-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [exported]);

  const importPaste = useCallback(() => {
    setImportErr(null);
    try {
      const parsed = JSON.parse(paste) as Partial<ThemeBundle>;
      // Sanity-check at least one known field is present so a random
      // pasted JSON doesn't silently no-op.
      const known: (keyof ThemeBundle)[] = [
        "theme",
        "accent",
        "customAccentHex",
        "customBgHex",
        "density",
        "font",
        "sidebarPattern",
        "logoUrl",
        "faviconUrl",
        "moduleAccents",
      ];
      if (!known.some((k) => k in parsed)) {
        setImportErr("Doesn't look like a VYNE theme — no recognised fields.");
        return;
      }
      applyBundle(parsed);
      setPaste("");
      onToast("Theme applied");
    } catch {
      setImportErr("Invalid JSON — couldn't parse the pasted text.");
    }
  }, [paste, applyBundle, onToast]);

  return (
    <SectionCard title="Theme export / import">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
        }}
      >
        Share your workspace theme with a teammate, or apply one they sent you.
      </div>
      {/* Export */}
      <div style={{ padding: "8px 18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Current theme
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={copy}
              style={smallBtnStyle()}
              aria-label="Copy theme JSON"
            >
              <Copy size={12} /> Copy
            </button>
            <button
              type="button"
              onClick={downloadJson}
              style={smallBtnStyle()}
              aria-label="Download theme JSON"
            >
              <Download size={12} /> Download
            </button>
          </div>
        </div>
        <pre
          style={{
            margin: 0,
            padding: 10,
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--text-secondary)",
            overflowX: "auto",
            maxHeight: 180,
          }}
        >
          {exported}
        </pre>
      </div>

      {/* Import */}
      <div style={{ padding: "12px 18px 18px" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            display: "block",
            marginBottom: 8,
          }}
        >
          Apply a theme
        </span>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder='Paste theme JSON here…'
          aria-label="Theme JSON to import"
          style={{
            width: "100%",
            minHeight: 90,
            padding: "8px 10px",
            border: "1px solid var(--input-border)",
            borderRadius: 8,
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        {importErr && (
          <div
            role="alert"
            style={{
              fontSize: 11.5,
              color: "var(--status-danger)",
              marginTop: 6,
            }}
          >
            {importErr}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={importPaste}
            disabled={!paste.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: paste.trim()
                ? "var(--vyne-accent, #06B6D4)"
                : "var(--content-border)",
              color: paste.trim() ? "#fff" : "var(--text-tertiary)",
              cursor: paste.trim() ? "pointer" : "default",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <UploadIcon size={12} />
            Apply theme
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function smallBtnStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    borderRadius: 7,
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: "var(--text-secondary)",
    fontSize: 11.5,
    fontWeight: 500,
    cursor: "pointer",
  };
}

// ─── Tenant brand assets (Phase 7.5 / 10.5) ────────────────────────
// Logo + favicon override. Uploads run through FileReader → data URL
// so they persist with the theme bundle (no S3 dep). 2 MB cap is
// enforced so a stray 10 MB raster doesn't blow up localStorage.
const MAX_BRAND_BYTES = 2 * 1024 * 1024;

function BrandAssetsSection({ onToast }: Readonly<{ onToast: (m: string) => void }>) {
  const logoUrl = useThemeStore((s) => s.logoUrl);
  const faviconUrl = useThemeStore((s) => s.faviconUrl);
  const setLogoUrl = useThemeStore((s) => s.setLogoUrl);
  const setFaviconUrl = useThemeStore((s) => s.setFaviconUrl);

  const onPick = useCallback(
    (kind: "logo" | "favicon") => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_BRAND_BYTES) {
        onToast("File too large — keep it under 2 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        if (kind === "logo") setLogoUrl(url);
        else setFaviconUrl(url);
        onToast(`${kind === "logo" ? "Logo" : "Favicon"} updated`);
      };
      reader.onerror = () => onToast("Couldn't read file");
      reader.readAsDataURL(file);
      // Reset so the same file can be picked again after a remove.
      e.target.value = "";
    },
    [setLogoUrl, setFaviconUrl, onToast],
  );

  return (
    <SectionCard title="Brand assets">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
        }}
      >
        Upload a workspace logomark + favicon. Stored locally as data
        URLs (no upload servers); 2 MB max each.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          padding: "8px 18px 18px",
        }}
      >
        {/* Logo card */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Logomark
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 80,
              borderRadius: 8,
              border: "1px dashed var(--content-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--content-secondary)",
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Workspace logo"
                style={{
                  maxWidth: "80%",
                  maxHeight: 60,
                  objectFit: "contain",
                }}
                data-no-scale
              />
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                No logo set
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <label style={smallBtnStyle()}>
              <Upload size={11} />
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={onPick("logo")}
                aria-label="Upload logo"
                style={{ display: "none" }}
              />
            </label>
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl(null);
                  onToast("Logo removed");
                }}
                style={{ ...smallBtnStyle(), color: "var(--status-danger)" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Favicon card */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Favicon
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 80,
              borderRadius: 8,
              border: "1px dashed var(--content-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--content-secondary)",
              marginBottom: 8,
            }}
          >
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt="Workspace favicon"
                style={{ width: 32, height: 32, objectFit: "contain" }}
                data-no-scale
              />
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Default mark
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <label style={smallBtnStyle()}>
              <Upload size={11} />
              Upload
              <input
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/webp"
                onChange={onPick("favicon")}
                aria-label="Upload favicon"
                style={{ display: "none" }}
              />
            </label>
            {faviconUrl && (
              <button
                type="button"
                onClick={() => {
                  setFaviconUrl(null);
                  onToast("Favicon removed");
                }}
                style={{ ...smallBtnStyle(), color: "var(--status-danger)" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Per-module accent override (Phase 7.7 / 10.6) ─────────────────
// Each row is a module with a colour swatch. Tap → native colour picker
// + clear button. ThemeApplier listens to route changes and rebinds
// the accent on every navigate so CRM stays teal while Finance shifts
// to amber, etc. Rows without a custom hex inherit the global accent.
function ModuleAccentsSection() {
  const moduleAccents = useThemeStore((s) => s.moduleAccents);
  const setModuleAccent = useThemeStore((s) => s.setModuleAccent);

  const ids = Object.keys(MODULE_LABELS) as ModuleId[];

  return (
    <SectionCard title="Per-module accent">
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          padding: "12px 18px 6px",
        }}
      >
        Override the accent colour for individual modules. Untouched
        rows inherit the global accent.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
          padding: "8px 18px 18px",
        }}
      >
        {ids.map((id) => {
          const hex = moduleAccents[id] ?? "";
          const active = Boolean(hex);
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: active
                  ? "1px solid var(--vyne-accent, #06B6D4)"
                  : "1px solid var(--content-border)",
                background: active
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.05)"
                  : "var(--content-bg)",
              }}
            >
              <label
                style={{
                  position: "relative",
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: hex || "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                  cursor: "pointer",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <input
                  type="color"
                  value={hex || "#06B6D4"}
                  onChange={(e) => setModuleAccent(id, e.target.value)}
                  aria-label={`Accent for ${MODULE_LABELS[id]}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                  }}
                />
              </label>
              <span
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                {MODULE_LABELS[id]}
              </span>
              {active && (
                <button
                  type="button"
                  onClick={() => setModuleAccent(id, null)}
                  aria-label={`Clear ${MODULE_LABELS[id]} accent`}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 2,
                  }}
                  title="Reset to global accent"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
