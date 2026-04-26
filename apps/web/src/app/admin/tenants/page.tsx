"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
type Plan = "Starter" | "Growth" | "Enterprise";
type TenantStatus = "Active" | "Trial" | "Suspended";

interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly plan: Plan;
  readonly users: number;
  readonly mrr: number;
  readonly status: TenantStatus;
  readonly trialDaysLeft?: number;
  readonly created: string;
  readonly adminEmail: string;
  readonly domain?: string;
}

interface TenantConfig {
  companyName: string;
  primaryColor: string;
  logoUrl: string;
  customDomain: string;
  modules: Record<string, boolean>;
  users: ReadonlyArray<{ name: string; email: string; role: string }>;
}

interface NewTenantForm {
  companyName: string;
  adminEmail: string;
  plan: Plan;
  trialDays: string;
}

// ─── Constants ────────────────────────────────────────────────────
const MODULES = [
  "Chat",
  "Projects",
  "Docs",
  "ERP",
  "Finance",
  "Code",
  "HR",
  "CRM",
  "AI",
] as const;

const MOCK_TENANTS: Tenant[] = [
  {
    id: "t1",
    name: "Acme Manufacturing",
    plan: "Enterprise",
    users: 47,
    mrr: 2400,
    status: "Active",
    created: "Sep 12, 2025",
    adminEmail: "admin@acme.com",
    domain: "acme.vyne.app",
  },
  {
    id: "t2",
    name: "TechStart Inc",
    plan: "Growth",
    users: 12,
    mrr: 480,
    status: "Active",
    created: "Nov 3, 2025",
    adminEmail: "admin@techstart.io",
  },
  {
    id: "t3",
    name: "Global Retail Ltd",
    plan: "Growth",
    users: 28,
    mrr: 840,
    status: "Active",
    created: "Dec 18, 2025",
    adminEmail: "admin@globalretail.com",
    domain: "globalretail.vyne.app",
  },
  {
    id: "t4",
    name: "DataFlow Analytics",
    plan: "Starter",
    users: 5,
    mrr: 99,
    status: "Trial",
    trialDaysLeft: 18,
    created: "Mar 3, 2026",
    adminEmail: "admin@dataflow.ai",
  },
  {
    id: "t5",
    name: "RetailPlus Corp",
    plan: "Enterprise",
    users: 63,
    mrr: 3200,
    status: "Active",
    created: "Jul 22, 2025",
    adminEmail: "admin@retailplus.com",
    domain: "retailplus.vyne.app",
  },
  {
    id: "t6",
    name: "NovaTech Solutions",
    plan: "Starter",
    users: 3,
    mrr: 0,
    status: "Suspended",
    created: "Jan 8, 2026",
    adminEmail: "admin@novatech.io",
  },
];

const MOCK_CONFIGS: Record<string, TenantConfig> = {
  t1: {
    companyName: "Acme Manufacturing",
    primaryColor: "#E24B4A",
    logoUrl: "",
    customDomain: "acme.vyne.app",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: true,
      Finance: true,
      Code: true,
      HR: true,
      CRM: true,
      AI: true,
    },
    users: [
      { name: "John Miller", email: "john@acme.com", role: "Admin" },
      { name: "Sarah Chen", email: "sarah@acme.com", role: "Manager" },
      { name: "Mike Torres", email: "mike@acme.com", role: "User" },
      { name: "Lisa Park", email: "lisa@acme.com", role: "User" },
    ],
  },
  t2: {
    companyName: "TechStart Inc",
    primaryColor: "#3B82F6",
    logoUrl: "",
    customDomain: "",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: false,
      Finance: false,
      Code: true,
      HR: false,
      CRM: false,
      AI: true,
    },
    users: [
      { name: "Alex Rivera", email: "alex@techstart.io", role: "Admin" },
      { name: "Nina Patel", email: "nina@techstart.io", role: "User" },
    ],
  },
  t3: {
    companyName: "Global Retail Ltd",
    primaryColor: "#22C55E",
    logoUrl: "",
    customDomain: "globalretail.vyne.app",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: true,
      Finance: true,
      Code: false,
      HR: true,
      CRM: true,
      AI: true,
    },
    users: [
      { name: "David Wong", email: "david@globalretail.com", role: "Admin" },
      { name: "Emma Brooks", email: "emma@globalretail.com", role: "Manager" },
      { name: "Carlos Ruiz", email: "carlos@globalretail.com", role: "User" },
    ],
  },
  t4: {
    companyName: "DataFlow Analytics",
    primaryColor: "#06B6D4",
    logoUrl: "",
    customDomain: "",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: false,
      Finance: false,
      Code: true,
      HR: false,
      CRM: false,
      AI: true,
    },
    users: [
      { name: "Priya Sharma", email: "priya@dataflow.ai", role: "Admin" },
    ],
  },
  t5: {
    companyName: "RetailPlus Corp",
    primaryColor: "#EC4899",
    logoUrl: "",
    customDomain: "retailplus.vyne.app",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: true,
      Finance: true,
      Code: true,
      HR: true,
      CRM: true,
      AI: true,
    },
    users: [
      { name: "Rachel Kim", email: "rachel@retailplus.com", role: "Admin" },
      { name: "James Okoye", email: "james@retailplus.com", role: "Manager" },
      { name: "Mei Lin", email: "mei@retailplus.com", role: "Manager" },
      { name: "Tom Baker", email: "tom@retailplus.com", role: "User" },
      { name: "Sofia Garcia", email: "sofia@retailplus.com", role: "User" },
    ],
  },
  t6: {
    companyName: "NovaTech Solutions",
    primaryColor: "#F59E0B",
    logoUrl: "",
    customDomain: "",
    modules: {
      Chat: true,
      Projects: true,
      Docs: true,
      ERP: false,
      Finance: false,
      Code: false,
      HR: false,
      CRM: false,
      AI: false,
    },
    users: [{ name: "Omar Hassan", email: "omar@novatech.io", role: "Admin" }],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────
function planBadge(plan: Plan): { bg: string; color: string } {
  if (plan === "Starter")
    return { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" };
  if (plan === "Growth")
    return { bg: "rgba(34,197,94,0.12)", color: "#4ADE80" };
  return { bg: "rgba(6, 182, 212,0.12)", color: "#67E8F9" };
}

function statusStyle(status: TenantStatus): {
  bg: string;
  color: string;
  label: string;
} {
  if (status === "Active")
    return { bg: "rgba(34,197,94,0.12)", color: "#4ADE80", label: "Active" };
  if (status === "Trial")
    return { bg: "rgba(245,158,11,0.12)", color: "#FCD34D", label: "Trial" };
  return { bg: "rgba(239,68,68,0.12)", color: "#F87171", label: "Suspended" };
}

// ─── Field ────────────────────────────────────────────────────────
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#6060A0",
          display: "block",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          background: "rgba(255,255,255,0.06)",
          outline: "none",
          fontSize: 13,
          color: "#E8E8F8",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── Module Toggle ────────────────────────────────────────────────
function ModuleToggle({
  label,
  enabled,
  onToggle,
}: Readonly<{
  label: string;
  enabled: boolean;
  onToggle: () => void;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span style={{ fontSize: 13, color: enabled ? "#C8C8E0" : "#6060A0" }}>
        {label}
      </span>
      <button
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: "none",
          cursor: "pointer",
          background: enabled ? "#06B6D4" : "rgba(255,255,255,0.12)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--content-bg)",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

// ─── Create Tenant Modal ──────────────────────────────────────────
function CreateTenantModal({
  onClose,
  onCreate,
}: Readonly<{
  onClose: () => void;
  onCreate: (f: NewTenantForm) => void;
}>) {
  const [form, setForm] = useState<NewTenantForm>({
    companyName: "",
    adminEmail: "",
    plan: "Starter",
    trialDays: "14",
  });

  function handleSubmit() {
    if (!form.companyName || !form.adminEmail) return;
    onCreate(form);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new tenant"
    >
      <div
        style={{
          background: "var(--text-primary)",
          borderRadius: 14,
          width: 480,
          padding: 28,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#E8E8F8" }}>
            Create Tenant
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9090B0",
              fontSize: 18,
              padding: "2px 6px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            &#10005;
          </button>
        </div>

        <Field
          id="nt-name"
          label="Company Name"
          value={form.companyName}
          onChange={(v) => setForm({ ...form, companyName: v })}
          placeholder="Acme Corp"
        />
        <Field
          id="nt-email"
          label="Admin Email"
          value={form.adminEmail}
          onChange={(v) => setForm({ ...form, adminEmail: v })}
          type="email"
          placeholder="admin@company.com"
        />

        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="nt-plan"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Plan
          </label>
          <select
            aria-label="Select option"
            id="nt-plan"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#E8E8F8",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option
              value="Starter"
              style={{ background: "var(--text-primary)" }}
            >
              Starter -- $99/mo
            </option>
            <option
              value="Growth"
              style={{ background: "var(--text-primary)" }}
            >
              Growth -- $480/mo
            </option>
            <option
              value="Enterprise"
              style={{ background: "var(--text-primary)" }}
            >
              Enterprise -- Custom
            </option>
          </select>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label
            htmlFor="nt-trial"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Trial Days
          </label>
          <input
            id="nt-trial"
            type="number"
            min="0"
            max="90"
            value={form.trialDays}
            onChange={(e) =>
              setForm({
                ...form,
                trialDays: String(Number.parseInt(e.target.value, 10) || 0),
              })
            }
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#E8E8F8",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "#9090B0",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#06B6D4",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Create Tenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tenant Detail Panel ──────────────────────────────────────────
function TenantDetailPanel({
  tenant,
  config,
  onConfigChange,
  onClose,
  onSave,
  onAction,
}: Readonly<{
  tenant: Tenant;
  config: TenantConfig;
  onConfigChange: (c: TenantConfig) => void;
  onClose: () => void;
  onSave: () => void;
  onAction: (action: string) => void;
}>) {
  const [activeSection, setActiveSection] = useState<
    "branding" | "modules" | "users" | "actions"
  >("branding");
  const ss = statusStyle(tenant.status);

  const sectionBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    background: active ? "rgba(6, 182, 212,0.2)" : "transparent",
    color: active ? "#67E8F9" : "#6060A0",
    transition: "all 0.15s",
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: "#13131F",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E8F8" }}>
            {tenant.name}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9090B0",
              fontSize: 18,
              padding: "2px 8px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            &#10005;
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 600,
              background: planBadge(tenant.plan).bg,
              color: planBadge(tenant.plan).color,
            }}
          >
            {tenant.plan}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 600,
              background: ss.bg,
              color: ss.color,
            }}
          >
            {ss.label}
            {tenant.trialDaysLeft ? ` (${tenant.trialDaysLeft}d left)` : ""}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#6060A0" }}>
          {tenant.adminEmail} &middot; {tenant.users} users &middot; $
          {tenant.mrr.toLocaleString()}/mo
        </div>
      </div>

      {/* Section tabs */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setActiveSection("branding")}
          style={sectionBtnStyle(activeSection === "branding")}
        >
          Branding
        </button>
        <button
          onClick={() => setActiveSection("modules")}
          style={sectionBtnStyle(activeSection === "modules")}
        >
          Modules
        </button>
        <button
          onClick={() => setActiveSection("users")}
          style={sectionBtnStyle(activeSection === "users")}
        >
          Users
        </button>
        <button
          onClick={() => setActiveSection("actions")}
          style={sectionBtnStyle(activeSection === "actions")}
        >
          Actions
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        {activeSection === "branding" && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6060A0",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              White-Label Configuration
            </div>

            {/* Logo upload mock */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6060A0",
                  display: "block",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Logo
              </label>
              <div
                style={{
                  width: "100%",
                  height: 80,
                  borderRadius: 10,
                  border: "2px dashed rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>&#128247;</div>
                  <div style={{ fontSize: 11, color: "#6060A0" }}>
                    Click to upload logo
                  </div>
                </div>
              </div>
            </div>

            <Field
              id={`company-${tenant.id}`}
              label="Display Name"
              value={config.companyName}
              onChange={(v) => onConfigChange({ ...config, companyName: v })}
              placeholder={tenant.name}
            />

            {/* Color picker */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor={`color-${tenant.id}`}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6060A0",
                  display: "block",
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Primary Color
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  id={`color-${tenant.id}`}
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) =>
                    onConfigChange({ ...config, primaryColor: e.target.value })
                  }
                  style={{
                    width: 40,
                    height: 36,
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "transparent",
                    padding: 2,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "#9090B0",
                    fontFamily: "monospace",
                  }}
                >
                  {config.primaryColor}
                </span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: config.primaryColor,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
            </div>

            <Field
              id={`domain-${tenant.id}`}
              label="Custom Domain"
              value={config.customDomain}
              onChange={(v) => onConfigChange({ ...config, customDomain: v })}
              placeholder="company.vyne.app"
            />
          </div>
        )}

        {activeSection === "modules" && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6060A0",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              Active Modules
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MODULES.map((mod) => (
                <ModuleToggle
                  key={mod}
                  label={mod}
                  enabled={config.modules[mod] ?? true}
                  onToggle={() =>
                    onConfigChange({
                      ...config,
                      modules: {
                        ...config.modules,
                        [mod]: !(config.modules[mod] ?? true),
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {activeSection === "users" && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6060A0",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              Users ({config.users.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {config.users.map((u) => (
                <div
                  key={u.email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #06B6D4, #9B59B6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {u.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#C8C8E0",
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#6060A0", marginTop: 1 }}
                    >
                      {u.email}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        u.role === "Admin"
                          ? "rgba(6, 182, 212,0.15)"
                          : "rgba(255,255,255,0.06)",
                      color: u.role === "Admin" ? "#67E8F9" : "#6060A0",
                    }}
                  >
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "actions" && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6060A0",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              Tenant Actions
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Change Plan */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#C8C8E0",
                    marginBottom: 4,
                  }}
                >
                  Change Plan
                </div>
                <div
                  style={{ fontSize: 11, color: "#6060A0", marginBottom: 10 }}
                >
                  Upgrade or downgrade this tenant&apos;s plan
                </div>
                <select
                  aria-label="Select option"
                  value={tenant.plan}
                  onChange={() => onAction("plan_changed")}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    color: "#E8E8F8",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Starter" style={{ background: "#13131F" }}>
                    Starter -- $99/mo
                  </option>
                  <option value="Growth" style={{ background: "#13131F" }}>
                    Growth -- $480/mo
                  </option>
                  <option value="Enterprise" style={{ background: "#13131F" }}>
                    Enterprise -- Custom
                  </option>
                </select>
              </div>

              {/* Suspend */}
              <button
                onClick={() =>
                  onAction(
                    tenant.status === "Suspended" ? "reactivated" : "suspended",
                  )
                }
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background:
                    tenant.status === "Suspended"
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(245,158,11,0.08)",
                  border: `1px solid ${tenant.status === "Suspended" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      tenant.status === "Suspended" ? "#4ADE80" : "#FCD34D",
                  }}
                >
                  {tenant.status === "Suspended"
                    ? "Reactivate Tenant"
                    : "Suspend Tenant"}
                </div>
                <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
                  {tenant.status === "Suspended"
                    ? "Restore access for all users in this organization"
                    : "Temporarily disable access for all users in this organization"}
                </div>
              </button>

              {/* Delete */}
              <button
                onClick={() => onAction("deleted")}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#F87171" }}
                >
                  Delete Tenant
                </div>
                <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
                  Permanently remove this tenant and all associated data
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onSave}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: "#06B6D4",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Main Tenants Page ────────────────────────────────────────────
export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [configs, setConfigs] =
    useState<Record<string, TenantConfig>>(MOCK_CONFIGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<Plan | "All">("All");
  const [filterStatus, setFilterStatus] = useState<TenantStatus | "All">("All");
  const [toast, setToast] = useState<string | null>(null);

  const selected = tenants.find((t) => t.id === selectedId) ?? null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = tenants.filter((t) => {
    if (
      search &&
      !t.name.toLowerCase().includes(search.toLowerCase()) &&
      !t.adminEmail.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (filterPlan !== "All" && t.plan !== filterPlan) return false;
    if (filterStatus !== "All" && t.status !== filterStatus) return false;
    return true;
  });

  function handleCreate(f: NewTenantForm) {
    const mrrMap: Record<Plan, number> = {
      Starter: 99,
      Growth: 480,
      Enterprise: 2400,
    };
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: f.companyName,
      plan: f.plan,
      users: 1,
      mrr: mrrMap[f.plan],
      status: Number.parseInt(f.trialDays, 10) > 0 ? "Trial" : "Active",
      trialDaysLeft:
        Number.parseInt(f.trialDays, 10) > 0
          ? Number.parseInt(f.trialDays, 10)
          : undefined,
      created: "Mar 21, 2026",
      adminEmail: f.adminEmail,
    };
    const newConfig: TenantConfig = {
      companyName: f.companyName,
      primaryColor: "#06B6D4",
      logoUrl: "",
      customDomain: "",
      modules: Object.fromEntries(MODULES.map((m) => [m, true])),
      users: [{ name: "Admin", email: f.adminEmail, role: "Admin" }],
    };
    setTenants((prev) => [...prev, newTenant]);
    setConfigs((prev) => ({ ...prev, [newTenant.id]: newConfig }));
    setShowModal(false);
    showToast(`Tenant "${f.companyName}" created`);
  }

  function handleSave() {
    showToast("Changes saved successfully");
  }

  function handleAction(action: string) {
    showToast(`Tenant ${action}`);
  }

  const selectStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    background: "rgba(255,255,255,0.05)",
    color: "#C8C8E0",
    fontSize: 12,
    outline: "none",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#E8E8F8",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Tenant Management
          </h1>
          <p style={{ fontSize: 13, color: "#6060A0", margin: "4px 0 0" }}>
            {tenants.length} organizations &middot;{" "}
            {tenants.reduce((s, t) => s + t.users, 0)} total users
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            background: "#06B6D4",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "opacity 0.15s",
          }}
        >
          + Create Tenant
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          padding: "14px 18px",
          background: "#13131F",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tenants..."
          style={{
            flex: 1,
            padding: "7px 12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            color: "#E8E8F8",
            fontSize: 12,
            outline: "none",
          }}
        />
        <select
          aria-label="Select option"
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value as Plan | "All")}
          style={selectStyle}
        >
          <option value="All" style={{ background: "#13131F" }}>
            All Plans
          </option>
          <option value="Starter" style={{ background: "#13131F" }}>
            Starter
          </option>
          <option value="Growth" style={{ background: "#13131F" }}>
            Growth
          </option>
          <option value="Enterprise" style={{ background: "#13131F" }}>
            Enterprise
          </option>
        </select>
        <select
          aria-label="Select option"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as TenantStatus | "All")
          }
          style={selectStyle}
        >
          <option value="All" style={{ background: "#13131F" }}>
            All Status
          </option>
          <option value="Active" style={{ background: "#13131F" }}>
            Active
          </option>
          <option value="Trial" style={{ background: "#13131F" }}>
            Trial
          </option>
          <option value="Suspended" style={{ background: "#13131F" }}>
            Suspended
          </option>
        </select>
        <span style={{ fontSize: 11, color: "#6060A0" }}>
          {filtered.length} results
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#13131F",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {[
                "Organization",
                "Plan",
                "Users",
                "MRR",
                "Status",
                "Created",
                "",
              ].map((h) => (
                <th
                  key={h || "actions"}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#6060A0",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const pb = planBadge(t.plan);
              const ss = statusStyle(t.status);
              const isSelected = selectedId === t.id;

              return (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(isSelected ? null : t.id)}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    background: isSelected
                      ? "rgba(6, 182, 212,0.1)"
                      : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(ev) => {
                    if (!isSelected)
                      (
                        ev.currentTarget as HTMLTableRowElement
                      ).style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(ev) => {
                    if (!isSelected)
                      (
                        ev.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#E8E8F8",
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#6060A0", marginTop: 1 }}
                    >
                      {t.adminEmail}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: pb.bg,
                        color: pb.color,
                      }}
                    >
                      {t.plan}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 13,
                      color: "#C8C8E0",
                    }}
                  >
                    {t.users}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#E8E8F8",
                    }}
                  >
                    ${t.mrr.toLocaleString()}/mo
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: ss.bg,
                        color: ss.color,
                      }}
                    >
                      {ss.label}
                      {t.trialDaysLeft ? ` (${t.trialDaysLeft}d)` : ""}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 12,
                      color: "#6060A0",
                    }}
                  >
                    {t.created}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(t.id);
                      }}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: "#9090B0",
                        fontSize: 11,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: "#6060A0",
                    fontSize: 13,
                  }}
                >
                  No tenants match your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && configs[selected.id] && (
        <TenantDetailPanel
          tenant={selected}
          config={configs[selected.id]}
          onConfigChange={(c) =>
            setConfigs((prev) => ({ ...prev, [selected.id]: c }))
          }
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
          onAction={handleAction}
        />
      )}

      {/* Modal */}
      {showModal && (
        <CreateTenantModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#22C55E",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
            zIndex: 400,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
