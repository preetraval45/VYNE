"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload, X, Pencil, Trash2, ArrowRight, Users } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { PageHeader } from "@/components/shared/Kit";
import { ImportCSVModal } from "@/components/shared/ImportCSVModal";
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import {
  useContactsStore,
  type Account,
  type Contact,
  type AccountStatus,
  type ContactTag,
} from "@/lib/stores/contacts";

// ─── Constants ──────────────────────────────────────────────────
type ContactsTab = "accounts" | "contacts" | "import";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Energy",
  "Education",
  "Real Estate",
];

const ALL_TAGS: ContactTag[] = [
  "VIP",
  "Decision Maker",
  "Technical",
  "Billing",
  "Primary",
];

const OWNERS = ["Alex Rivera", "Priya Shah", "Sam Chen", "Jordan Lee"];

// ─── Helpers ─────────────────────────────────────────────────────
function fmtRevenue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function accountStatusConfig(s: AccountStatus): { bg: string; color: string } {
  const map: Record<AccountStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Prospect: { bg: "#EFF6FF", color: "#1E40AF" },
    Inactive: { bg: "#F4F4F8", color: "var(--text-secondary)" },
  };
  return map[s];
}

function tagConfig(tag: ContactTag): { bg: string; color: string } {
  const map: Record<ContactTag, { bg: string; color: string }> = {
    VIP: { bg: "#FEF3C7", color: "var(--badge-warning-text)" },
    "Decision Maker": { bg: "#F5F3FF", color: "#5B21B6" },
    Technical: { bg: "#EFF6FF", color: "#1E40AF" },
    Billing: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Primary: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  };
  return map[tag];
}

function daysSinceStr(isoDate: string): string {
  const d = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

// ─── Shared UI ───────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  fontSize: 12,
  color: "var(--text-primary)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
  display: "block",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  background: "var(--content-bg)",
  borderRadius: 14,
  padding: 28,
  width: 480,
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  border: "1px solid var(--content-border)",
};

const confirmOverlayStyle: React.CSSProperties = {
  ...modalOverlayStyle,
};

const confirmContentStyle: React.CSSProperties = {
  background: "var(--content-bg)",
  borderRadius: 14,
  padding: 24,
  width: 400,
  maxWidth: "90vw",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  border: "1px solid var(--content-border)",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "transparent",
  color: "var(--text-primary)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "#EF4444",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

function TabBtn({
  label,
  active,
  onClick,
  count,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        borderBottom: active
          ? "2px solid var(--vyne-purple)"
          : "2px solid transparent",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 10,
            background: active ? "rgba(6, 182, 212,0.12)" : "#F0F0F8",
            color: active ? "var(--vyne-purple)" : "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBadge({
  status,
  config,
}: Readonly<{ status: string; config: { bg: string; color: string } }>) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: config.bg,
        color: config.color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function TagPill({ tag }: Readonly<{ tag: ContactTag }>) {
  const cfg = tagConfig(tag);
  return (
    <span
      style={{
        padding: "1px 7px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        width: 240,
      }}
    >
      <Search
        size={14}
        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            color: "var(--text-tertiary)",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}>) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          padding: "7px 28px 7px 12px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          fontSize: 12,
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A0A0B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(6, 182, 212,0.3)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 14px rgba(6, 182, 212,0.45)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(6, 182, 212,0.3)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

function Th({
  children,
  width,
}: Readonly<{ children: React.ReactNode; width?: number | string }>) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        width: width ?? "auto",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
}: Readonly<{ children: React.ReactNode; mono?: boolean }>) {
  return (
    <td
      style={{
        padding: "10px 14px",
        fontSize: 12,
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
        fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {children}
    </td>
  );
}

function IconBtn({
  icon,
  title,
  onClick,
  danger,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}>) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        padding: 4,
        borderRadius: 6,
        border: "1px solid var(--content-border)",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: danger ? "#EF4444" : "var(--text-secondary)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "#FEF2F2"
          : "var(--content-secondary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  if (!open) return null;
  return (
    <div style={confirmOverlayStyle} onClick={onCancel} role="presentation">
      <div
        style={confirmContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
            lineHeight: "1.5",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={secondaryBtnStyle} onClick={onCancel}>
            Cancel
          </button>
          <button style={dangerBtnStyle} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Modal ───────────────────────────────────────────────
function AccountModal({
  open,
  onClose,
  initial,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  initial?: Account | null;
  onSave: (data: Omit<Account, "id">) => void;
}>) {
  const [name, setName] = useState(initial?.name ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "Technology");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [revenue, setRevenue] = useState(String(initial?.revenue ?? ""));
  const [employees, setEmployees] = useState(String(initial?.employees ?? ""));
  const [owner, setOwner] = useState(initial?.owner ?? OWNERS[0]);
  const [status, setStatus] = useState<AccountStatus>(
    initial?.status ?? "Prospect",
  );

  // Reset form when initial changes
  useState(() => {
    setName(initial?.name ?? "");
    setIndustry(initial?.industry ?? "Technology");
    setWebsite(initial?.website ?? "");
    setPhone(initial?.phone ?? "");
    setRevenue(String(initial?.revenue ?? ""));
    setEmployees(String(initial?.employees ?? ""));
    setOwner(initial?.owner ?? OWNERS[0]);
    setStatus(initial?.status ?? "Prospect");
  });

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      industry,
      website: website.trim(),
      phone: phone.trim(),
      revenue: Number(revenue) || 0,
      employees: Number(employees) || 0,
      owner,
      status,
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={initial ? "Edit Account" : "New Account"}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {initial ? "Edit Account" : "New Account"}
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>
              Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Industry</label>
              <select aria-label="Select option"
                style={selectStyle}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select aria-label="Select option"
                style={selectStyle}
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
              >
                <option value="Active">Active</option>
                <option value="Prospect">Prospect</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input
              style={inputStyle}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Revenue ($)</label>
              <input
                style={inputStyle}
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Employees</label>
              <input
                style={inputStyle}
                type="number"
                value={employees}
                onChange={(e) => setEmployees(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Owner</label>
            <select aria-label="Select option"
              style={selectStyle}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <button style={secondaryBtnStyle} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...primaryBtnStyle,
              opacity: name.trim() ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {initial ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Modal ───────────────────────────────────────────────
function ContactModal({
  open,
  onClose,
  initial,
  accounts,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  initial?: Contact | null;
  accounts: Account[];
  onSave: (data: Omit<Contact, "id">) => void;
}>) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts[0]?.id ?? "",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [selectedTags, setSelectedTags] = useState<ContactTag[]>(
    initial?.tags ?? [],
  );

  useState(() => {
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setAccountId(initial?.accountId ?? accounts[0]?.id ?? "");
    setTitle(initial?.title ?? "");
    setDepartment(initial?.department ?? "");
    setSelectedTags(initial?.tags ?? []);
  });

  if (!open) return null;

  const toggleTag = (tag: ContactTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: selectedAccount?.name ?? "",
      accountId,
      title: title.trim(),
      department: department.trim(),
      lastContact:
        initial?.lastContact ?? new Date().toISOString().slice(0, 10),
      tags: selectedTags,
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={initial ? "Edit Contact" : "New Contact"}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {initial ? "Edit Contact" : "New Contact"}
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>
              Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>
                Email <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Company (Account)</label>
            <select aria-label="Select option"
              style={selectStyle}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">-- Select Account --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VP of Engineering"
              />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input
                style={inputStyle}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const cfg = tagConfig(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 500,
                      border: isSelected
                        ? `2px solid ${cfg.color}`
                        : "2px solid var(--content-border)",
                      background: isSelected ? cfg.bg : "transparent",
                      color: isSelected ? cfg.color : "var(--text-tertiary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 24,
          }}
        >
          <button style={secondaryBtnStyle} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...primaryBtnStyle,
              opacity: name.trim() && email.trim() ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim()}
          >
            {initial ? "Save Changes" : "Create Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accounts Tab ────────────────────────────────────────────────
function AccountsTab() {
  const router = useRouter();
  const accounts = useContactsStore((s) => s.accounts);
  const contacts = useContactsStore((s) => s.contacts);
  const addAccount = useContactsStore((s) => s.addAccount);
  const updateAccount = useContactsStore((s) => s.updateAccount);
  const deleteAccount = useContactsStore((s) => s.deleteAccount);
  const accountDetail = useDetailParam("account");
  const selectedAccount = accountDetail.id
    ? accounts.find((a) => a.id === accountDetail.id)
    : undefined;

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTarget = deleteId
    ? accounts.find((a) => a.id === deleteId)
    : null;

  const filtered = accounts.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.owner.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = !industryFilter || a.industry === industryFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchIndustry && matchStatus;
  });

  const exportData = filtered.map((a) => ({
    name: a.name,
    industry: a.industry,
    website: a.website,
    phone: a.phone,
    revenue: String(a.revenue),
    employees: String(a.employees),
    owner: a.owner,
    status: a.status,
  }));

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search accounts..."
          />
          <FilterDropdown
            label="All Industries"
            value={industryFilter}
            options={INDUSTRIES}
            onChange={setIndustryFilter}
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Active", "Prospect", "Inactive"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="accounts-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "industry", header: "Industry" },
              { key: "website", header: "Website" },
              { key: "phone", header: "Phone" },
              { key: "revenue", header: "Revenue" },
              { key: "employees", header: "Employees" },
              { key: "owner", header: "Owner" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton
            label="New Account"
            onClick={() => router.push("/contacts/accounts/new")}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          {
            label: "Total Accounts",
            value: String(accounts.length),
            color: "var(--vyne-purple)",
          },
          {
            label: "Active",
            value: String(accounts.filter((a) => a.status === "Active").length),
            color: "var(--badge-success-text)",
          },
          {
            label: "Prospects",
            value: String(
              accounts.filter((a) => a.status === "Prospect").length,
            ),
            color: "#1E40AF",
          },
          {
            label: "Total Revenue",
            value: fmtRevenue(accounts.reduce((s, a) => s + a.revenue, 0)),
            color: "var(--vyne-purple)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: kpi.color,
                letterSpacing: "-0.03em",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>Industry</Th>
                <Th>Website</Th>
                <Th>Phone</Th>
                <Th>Revenue</Th>
                <Th>Employees</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th width={80}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No accounts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((account) => {
                  const sc = accountStatusConfig(account.status);
                  return (
                    <tr
                      key={account.id}
                      onClick={() => accountDetail.open(account.id)}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: "rgba(6, 182, 212,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--vyne-purple)",
                              flexShrink: 0,
                            }}
                          >
                            {account.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {account.name}
                          </span>
                        </div>
                      </Td>
                      <Td>{account.industry}</Td>
                      <Td>
                        <span
                          style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                        >
                          {account.website}
                        </span>
                      </Td>
                      <Td>{account.phone}</Td>
                      <Td mono>{fmtRevenue(account.revenue)}</Td>
                      <Td>{account.employees.toLocaleString()}</Td>
                      <Td>{account.owner}</Td>
                      <Td>
                        <StatusBadge status={account.status} config={sc} />
                      </Td>
                      <Td>
                        <div
                          style={{ display: "flex", gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconBtn
                            icon={<Pencil size={13} />}
                            title="Edit"
                            onClick={() => router.push(`/contacts/accounts/${account.id}/edit`)}
                          />
                          <IconBtn
                            icon={<Trash2 size={13} />}
                            title="Delete"
                            danger
                            onClick={() => setDeleteId(account.id)}
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in account detail panel */}
      <AccountDetailPanel
        account={selectedAccount}
        contacts={contacts.filter((c) => c.accountId === (selectedAccount?.id ?? ""))}
        onClose={accountDetail.close}
      />

      {/* Account Modal */}
      <AccountModal
        key={editingAccount?.id ?? "new"}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAccount(null);
        }}
        initial={editingAccount}
        onSave={(data) => {
          if (editingAccount) {
            updateAccount(editingAccount.id, data);
          } else {
            addAccount(data);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Account"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteAccount(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Contacts Tab ────────────────────────────────────────────────
function ContactsTabContent() {
  const router = useRouter();
  const contacts = useContactsStore((s) => s.contacts);
  const accounts = useContactsStore((s) => s.accounts);
  const addContact = useContactsStore((s) => s.addContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const deleteContact = useContactsStore((s) => s.deleteContact);
  const contactDetail = useDetailParam("contact");
  const selectedContact = contactDetail.id
    ? contacts.find((c) => c.id === contactDetail.id)
    : undefined;

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTarget = deleteId
    ? contacts.find((c) => c.id === deleteId)
    : null;

  const companies = [...new Set(contacts.map((c) => c.company))].sort();
  const departments = [...new Set(contacts.map((c) => c.department))].sort();

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchCompany = !companyFilter || c.company === companyFilter;
    const matchDept = !departmentFilter || c.department === departmentFilter;
    return matchSearch && matchCompany && matchDept;
  });

  const exportData = filtered.map((c) => ({
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    title: c.title,
    department: c.department,
    lastContact: c.lastContact,
    tags: c.tags.join(", "),
  }));

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search contacts..."
          />
          <FilterDropdown
            label="All Companies"
            value={companyFilter}
            options={companies}
            onChange={setCompanyFilter}
          />
          <FilterDropdown
            label="All Departments"
            value={departmentFilter}
            options={departments}
            onChange={setDepartmentFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="contacts-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "company", header: "Company" },
              { key: "title", header: "Title" },
              { key: "department", header: "Department" },
              { key: "lastContact", header: "Last Contact" },
              { key: "tags", header: "Tags" },
            ]}
          />
          <NewButton
            label="New Contact"
            onClick={() => router.push("/contacts/people/new")}
          />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Company</Th>
                <Th>Title</Th>
                <Th>Department</Th>
                <Th>Last Contact</Th>
                <Th>Tags</Th>
                <Th width={80}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No contacts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => contactDetail.open(contact.id)}
                    style={{ transition: "background 0.1s", cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--content-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "rgba(6, 182, 212,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--vyne-purple)",
                            flexShrink: 0,
                          }}
                        >
                          {contact.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>
                          {contact.name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span
                        style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                      >
                        {contact.email}
                      </span>
                    </Td>
                    <Td>{contact.phone}</Td>
                    <Td>{contact.company}</Td>
                    <Td>{contact.title}</Td>
                    <Td>{contact.department}</Td>
                    <Td>
                      <span
                        style={{ color: "var(--text-secondary)", fontSize: 11 }}
                      >
                        {daysSinceStr(contact.lastContact)}
                      </span>
                    </Td>
                    <Td>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                      >
                        {contact.tags.map((tag) => (
                          <TagPill key={tag} tag={tag} />
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <div
                        style={{ display: "flex", gap: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconBtn
                          icon={<Pencil size={13} />}
                          title="Edit"
                          onClick={() => router.push(`/contacts/people/${contact.id}/edit`)}
                        />
                        <IconBtn
                          icon={<Trash2 size={13} />}
                          title="Delete"
                          danger
                          onClick={() => setDeleteId(contact.id)}
                        />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in contact detail panel */}
      <ContactDetailPanel
        contact={selectedContact}
        account={accounts.find((a) => a.id === (selectedContact?.accountId ?? ""))}
        onClose={contactDetail.close}
      />

      {/* Contact Modal */}
      <ContactModal
        key={editingContact?.id ?? "new"}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingContact(null);
        }}
        initial={editingContact}
        accounts={accounts}
        onSave={(data) => {
          if (editingContact) {
            updateContact(editingContact.id, data);
          } else {
            addContact(data);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Contact"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteContact(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Import Tab ──────────────────────────────────────────────────
function ImportTab() {
  const importAccounts = useContactsStore((s) => s.importAccounts);
  const importContacts = useContactsStore((s) => s.importContacts);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"accounts" | "contacts">(
    "contacts",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const accountColumns = [
    { key: "name", label: "Company Name", required: true },
    { key: "industry", label: "Industry" },
    { key: "website", label: "Website" },
    { key: "phone", label: "Phone" },
    { key: "revenue", label: "Revenue" },
    { key: "employees", label: "Employees" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status" },
  ];

  const contactColumns = [
    { key: "name", label: "Full Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company", required: true },
    { key: "title", label: "Title" },
    { key: "department", label: "Department" },
    { key: "tags", label: "Tags" },
  ];

  function handleImportClick(type: "accounts" | "contacts") {
    setImportType(type);
    setShowImportModal(true);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        {/* Accounts Import Card */}
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            padding: 24,
            background: "var(--content-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(6, 182, 212,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 21h18M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7v7m18-7v7M3 14h18M3 14v5h18v-5"
                  stroke="var(--vyne-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Import Accounts
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Upload CSV or Excel file with company data
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
            Import company accounts with fields like Name, Industry, Website,
            Phone, Revenue, Employees, Owner, and Status.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {accountColumns.map((col) => (
              <span
                key={col.key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  background: col.required
                    ? "rgba(6, 182, 212,0.08)"
                    : "#F4F4F8",
                  color: col.required
                    ? "var(--vyne-purple)"
                    : "var(--text-tertiary)",
                  border: col.required
                    ? "1px solid rgba(6, 182, 212,0.2)"
                    : "1px solid transparent",
                }}
              >
                {col.label}
                {col.required ? " *" : ""}
              </span>
            ))}
          </div>

          <button
            onClick={() => handleImportClick("accounts")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--vyne-purple)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <Upload size={14} />
            Upload Accounts CSV
          </button>
        </div>

        {/* Contacts Import Card */}
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            padding: 24,
            background: "var(--content-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(6, 182, 212,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="var(--vyne-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Import Contacts
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Upload CSV or Excel file with contact data
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
            Import people contacts with fields like Name, Email, Phone, Company,
            Title, Department, and Tags.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {contactColumns.map((col) => (
              <span
                key={col.key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  background: col.required
                    ? "rgba(6, 182, 212,0.08)"
                    : "#F4F4F8",
                  color: col.required
                    ? "var(--vyne-purple)"
                    : "var(--text-tertiary)",
                  border: col.required
                    ? "1px solid rgba(6, 182, 212,0.2)"
                    : "1px solid transparent",
                }}
              >
                {col.label}
                {col.required ? " *" : ""}
              </span>
            ))}
          </div>

          <button
            onClick={() => handleImportClick("contacts")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--vyne-purple)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <Upload size={14} />
            Upload Contacts CSV
          </button>
        </div>
      </div>

      {/* Drag-and-Drop Zone */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          padding: 24,
          background: "var(--content-bg)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Quick Upload
        </div>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file drop zone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              setSelectedFile(file);
              setShowImportModal(true);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          style={{
            border: `2px dashed ${dragOver ? "var(--vyne-purple)" : "var(--content-border)"}`,
            borderRadius: 10,
            padding: "48px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver
              ? "rgba(6, 182, 212,0.04)"
              : "var(--content-secondary)",
            transition: "all 0.15s",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            style={{ margin: "0 auto 14px", display: "block" }}
          >
            <rect width="40" height="40" rx="10" fill="rgba(6, 182, 212,0.08)" />
            <path
              d="M13 27v2a1 1 0 001 1h12a1 1 0 001-1v-2M20 12v12M16 16l4-4 4 4"
              stroke={dragOver ? "var(--vyne-purple)" : "var(--text-tertiary)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Drag & drop your CSV or Excel file here
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 8,
            }}
          >
            or click to browse files
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Supported formats: .csv, .xlsx, .xls
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            aria-label="Upload CSV or Excel file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setShowImportModal(true);
              }
            }}
            style={{ display: "none" }}
          />
        </div>

        {/* Column Mapping Info */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            Column Mapping
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: "1.6",
            }}
          >
            After uploading your file, you will be guided through a column
            mapping step where you can match your CSV headers to the expected
            fields. Required fields are marked with an asterisk (*). The system
            will auto-detect matching columns when possible.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 14,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Accounts Fields
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: "1.8",
                }}
              >
                Name*, Industry, Website, Phone, Revenue, Employees, Owner,
                Status
              </div>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Contacts Fields
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: "1.8",
                }}
              >
                Name*, Email*, Phone, Company*, Title, Department, Tags
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportCSVModal
        open={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
        }}
        moduleName={importType === "accounts" ? "Accounts" : "Contacts"}
        expectedColumns={
          importType === "accounts" ? accountColumns : contactColumns
        }
        onImport={(rows) => {
          if (importType === "accounts") {
            importAccounts(rows);
          } else {
            importContacts(rows);
          }
          setShowImportModal(false);
          setSelectedFile(null);
        }}
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageInner />
    </Suspense>
  );
}

function ContactsPageInner() {
  const [activeTab, setActiveTab] = useState<ContactsTab>("accounts");
  const accounts = useContactsStore((s) => s.accounts);
  const contacts = useContactsStore((s) => s.contacts);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        icon={<Users size={16} />}
        title="Accounts & Contacts"
        subtitle={`${accounts.length} accounts · ${contacts.length} contacts`}
      />

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <TabBtn
          label="Accounts"
          active={activeTab === "accounts"}
          onClick={() => setActiveTab("accounts")}
          count={accounts.length}
        />
        <TabBtn
          label="Contacts"
          active={activeTab === "contacts"}
          onClick={() => setActiveTab("contacts")}
          count={contacts.length}
        />
        <TabBtn
          label="Import"
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "contacts" && <ContactsTabContent />}
        {activeTab === "import" && <ImportTab />}
      </div>
    </div>
  );
}

// ─── Slide-in detail panels ────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function AccountDetailPanel({
  account,
  contacts,
  onClose,
}: {
  account: Account | undefined;
  contacts: Contact[];
  onClose: () => void;
}) {
  const sc = account ? accountStatusConfig(account.status) : { bg: "", color: "" };
  return (
    <DetailPanel
      open={!!account}
      onClose={onClose}
      title={account?.name ?? ""}
      subtitle={account ? `${account.industry} · ${account.employees.toLocaleString()} employees` : undefined}
      badge={
        account && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              background: sc.bg,
              color: sc.color,
            }}
          >
            {account.status}
          </span>
        )
      }
      headerActions={
        account && (
          <Link
            href={`/contacts/accounts/${account.id}/edit`}
            title="Edit account"
            aria-label="Edit account"
            style={iconBtnStyle}
          >
            <Pencil size={14} />
          </Link>
        )
      }
    >
      {!account ? null : (
        <>
          <DetailSection title="Revenue & size">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", lineHeight: 1 }}>
                  {fmtRevenue(account.revenue)}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 4 }}>
                  Annual revenue
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="text-aurora" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  {account.employees.toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Employees
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Details">
            <DetailRow label="Industry" value={account.industry} />
            <DetailRow label="Website" value={account.website || "—"} mono={!!account.website} />
            <DetailRow label="Phone" value={account.phone || "—"} />
            <DetailRow
              label="Owner"
              value={account.owner || <span style={{ color: "var(--text-tertiary)" }}>Unassigned</span>}
            />
          </DetailSection>

          {contacts.length > 0 && (
            <DetailSection title={`People · ${contacts.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contacts.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/contacts?contact=${c.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: "var(--content-secondary)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(6, 182, 212,0.12)",
                        color: "var(--vyne-purple)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </div>
                      {c.title && (
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.title}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </DetailSection>
          )}
        </>
      )}
    </DetailPanel>
  );
}

function ContactDetailPanel({
  contact,
  account,
  onClose,
}: {
  contact: Contact | undefined;
  account: Account | undefined;
  onClose: () => void;
}) {
  return (
    <DetailPanel
      open={!!contact}
      onClose={onClose}
      title={contact?.name ?? ""}
      subtitle={contact ? [contact.title, contact.company].filter(Boolean).join(" · ") : undefined}
      headerActions={
        contact && (
          <Link
            href={`/contacts/people/${contact.id}/edit`}
            title="Edit contact"
            aria-label="Edit contact"
            style={iconBtnStyle}
          >
            <Pencil size={14} />
          </Link>
        )
      }
    >
      {!contact ? null : (
        <>
          <DetailSection title="Contact">
            <DetailRow label="Email" value={contact.email || "—"} mono={!!contact.email} />
            <DetailRow label="Phone" value={contact.phone || "—"} />
            <DetailRow label="Department" value={contact.department || "—"} />
            <DetailRow label="Last contact" value={daysSinceStr(contact.lastContact)} />
          </DetailSection>

          {account && (
            <DetailSection title="Account">
              <Link
                href={`/contacts?account=${account.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--content-secondary)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(6, 182, 212,0.08)",
                    color: "var(--vyne-purple)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {account.name.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {account.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {account.industry} {"·"} {fmtRevenue(account.revenue)}
                  </div>
                </div>
                <ArrowRight size={13} style={{ color: "var(--text-tertiary)" }} />
              </Link>
            </DetailSection>
          )}

          {contact.tags.length > 0 && (
            <DetailSection title="Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {contact.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} />
                ))}
              </div>
            </DetailSection>
          )}
        </>
      )}
    </DetailPanel>
  );
}
