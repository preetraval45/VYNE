"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import {
  Plus,
  Search,
  X,
  Package,
  TrendingUp,
  DollarSign,
  Target,
  ShoppingCart,
  BarChart3,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { PageHeader } from "@/components/shared/Kit";
import {
  useSalesStore,
  type Opportunity,
  type Quote,
  type Product,
  type OpportunityStage,
  type QuoteStatus,
  type OrderStatus,
  type ProductStatus,
  type CustomerStatus,
  type QuoteLineItem,
} from "@/lib/stores/sales";

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function stageConfig(s: OpportunityStage): {
  bg: string;
  color: string;
  dotColor: string;
} {
  const map: Record<
    OpportunityStage,
    { bg: string; color: string; dotColor: string }
  > = {
    Qualification: { bg: "#EFF6FF", color: "#1E40AF", dotColor: "#3B82F6" },
    Proposal: {
      bg: "#FFFBEB",
      color: "var(--badge-warning-text)",
      dotColor: "#F59E0B",
    },
    Negotiation: { bg: "#F5F3FF", color: "#5B21B6", dotColor: "#8B5CF6" },
    "Closed Won": {
      bg: "#F0FDF4",
      color: "var(--badge-success-text)",
      dotColor: "#22C55E",
    },
    "Closed Lost": {
      bg: "#FEF2F2",
      color: "var(--badge-danger-text)",
      dotColor: "#EF4444",
    },
  };
  return map[s];
}

function quoteStatusConfig(s: QuoteStatus): { bg: string; color: string } {
  const map: Record<QuoteStatus, { bg: string; color: string }> = {
    Draft: {
      bg: "var(--content-bg-secondary)",
      color: "var(--text-secondary)",
    },
    Sent: { bg: "#EFF6FF", color: "#1E40AF" },
    Accepted: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Rejected: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function orderStatusConfig(s: OrderStatus): { bg: string; color: string } {
  const map: Record<OrderStatus, { bg: string; color: string }> = {
    Confirmed: { bg: "#EFF6FF", color: "#1E40AF" },
    Processing: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Shipped: { bg: "#F5F3FF", color: "#5B21B6" },
    Delivered: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
  };
  return map[s];
}

function productStatusConfig(s: ProductStatus): { bg: string; color: string } {
  const map: Record<ProductStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    "Low Stock": { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    "Out of Stock": { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function customerStatusConfig(s: CustomerStatus): {
  bg: string;
  color: string;
} {
  const map: Record<CustomerStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Inactive: {
      bg: "var(--content-bg-secondary)",
      color: "var(--text-secondary)",
    },
    New: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  return map[s];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function probabilityBadgeStyle(probability: number): {
  background: string;
  color: string;
} {
  if (probability >= 60) {
    return {
      background: "var(--badge-success-bg)",
      color: "var(--badge-success-text)",
    };
  }
  if (probability >= 30) {
    return {
      background: "var(--badge-warning-bg)",
      color: "var(--badge-warning-text)",
    };
  }
  return {
    background: "var(--badge-danger-bg)",
    color: "var(--badge-danger-text)",
  };
}

// ─── Style constants ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  fontSize: 12,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
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
  width: 520,
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
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

// ─── Shared UI ───────────────────────────────────────────────────
type SalesTab =
  | "opportunities"
  | "quotations"
  | "orders"
  | "products"
  | "customers"
  | "reports";

function TabBtn({
  label,
  icon,
  active,
  onClick,
}: Readonly<{
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
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
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({
  label,
  config,
}: Readonly<{ label: string; config: { bg: string; color: string } }>) {
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
      {label}
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
  align,
}: Readonly<{
  children: React.ReactNode;
  mono?: boolean;
  align?: "right" | "left" | "center";
}>) {
  return (
    <td
      style={{
        padding: "10px 14px",
        fontSize: 12,
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
        fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
        borderBottom: "1px solid var(--content-border)",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </td>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}>) {
  return (
    <div
      style={{
        flex: 1,
        padding: "16px 18px",
        borderRadius: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `${color}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          {value}
        </div>
      </div>
    </div>
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

function SmallBtn({
  label,
  onClick,
  color,
  bg,
}: Readonly<{
  label: string;
  onClick: (e: React.MouseEvent) => void;
  color?: string;
  bg?: string;
}>) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: bg ? "none" : "1px solid var(--content-border)",
        background: bg || "transparent",
        fontSize: 10,
        fontWeight: 500,
        color: color || "var(--text-secondary)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
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
  confirmLabel,
  confirmStyle,
}: Readonly<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmStyle?: React.CSSProperties;
}>) {
  if (!open) return null;
  return (
    <div style={modalOverlayStyle} onClick={onCancel} role="presentation">
      <div
        role="dialog"
        aria-label={title}
        style={{
          background: "var(--content-bg)",
          borderRadius: 14,
          padding: 24,
          width: 400,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "1px solid var(--content-border)",
        }}
        onClick={(e) => e.stopPropagation()}
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
          <button style={confirmStyle || dangerBtnStyle} onClick={onConfirm}>
            {confirmLabel || "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Line Items Editor ───────────────────────────────────────────
function LineItemsEditor({
  items,
  onChange,
}: {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
}) {
  const addItem = () => {
    onChange([...items, { productName: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (
    idx: number,
    field: keyof QuoteLineItem,
    val: string | number,
  ) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label style={labelStyle}>Line Items</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => (
          <div
            key={`line-item-${idx}-${item.productName}`}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: 6,
              alignItems: "center",
            }}
          >
            <input
              style={inputStyle}
              value={item.productName}
              onChange={(e) => updateItem(idx, "productName", e.target.value)}
              placeholder="Product name"
              aria-label={`Line item ${idx + 1} product name`}
            />
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                updateItem(idx, "quantity", Number(e.target.value) || 1)
              }
              placeholder="Qty"
              aria-label={`Line item ${idx + 1} quantity`}
            />
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={item.unitPrice}
              onChange={(e) =>
                updateItem(idx, "unitPrice", Number(e.target.value) || 0)
              }
              placeholder="Price"
              aria-label={`Line item ${idx + 1} unit price`}
            />
            <button
              onClick={() => removeItem(idx)}
              aria-label={`Remove line item ${idx + 1}`}
              style={{
                padding: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#EF4444",
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        style={{
          marginTop: 8,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px dashed var(--content-border)",
          background: "transparent",
          fontSize: 11,
          color: "var(--vyne-purple)",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        + Add Line Item
      </button>
      {items.length > 0 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            textAlign: "right",
          }}
        >
          Total:{" "}
          {fmtFull(items.reduce((s, li) => s + li.quantity * li.unitPrice, 0))}
        </div>
      )}
    </div>
  );
}

// ─── Deal Modal ──────────────────────────────────────────────────
function DealModal({
  open,
  onClose,
  initial,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  initial?: Opportunity | null;
  onSave: (data: Omit<Opportunity, "id" | "createdAt">) => void;
}>) {
  const STAGES: OpportunityStage[] = [
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];
  const ASSIGNEES = ["Alex Rivera", "Priya Shah", "Sam Chen", "Jordan Lee"];

  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [value, setValue] = useState(String(initial?.value ?? ""));
  const [stage, setStage] = useState<OpportunityStage>(
    initial?.stage ?? "Qualification",
  );
  const [probability, setProbability] = useState(
    String(initial?.probability ?? "25"),
  );
  const [expectedClose, setExpectedClose] = useState(
    initial?.expectedClose ?? "",
  );
  const [assignee, setAssignee] = useState(initial?.assignee ?? ASSIGNEES[0]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim() || !company.trim()) return;
    onSave({
      name: name.trim(),
      company: company.trim(),
      contact: contact.trim(),
      value: Number(value) || 0,
      stage,
      probability: Number(probability) || 0,
      expectedClose,
      assignee,
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={initial ? "Edit Deal" : "New Deal"}
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
            {initial ? "Edit Deal" : "New Deal"}
          </h2>
          <button
            aria-label="Close"
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
              Deal Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enterprise License Deal"
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>
                Company <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label style={labelStyle}>Contact</label>
              <input
                style={inputStyle}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Contact name"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Value ($)</label>
              <input
                style={inputStyle}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="opp-probability" style={labelStyle}>
                Probability (%)
              </label>
              <input
                id="opp-probability"
                style={inputStyle}
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Stage</label>
              <select
                aria-label="Select option"
                style={selectStyle}
                value={stage}
                onChange={(e) => setStage(e.target.value as OpportunityStage)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="opp-expected-close" style={labelStyle}>
                Expected Close
              </label>
              <input
                id="opp-expected-close"
                aria-label="Expected close date"
                style={inputStyle}
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Assignee</label>
            <select
              aria-label="Select option"
              style={selectStyle}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              {ASSIGNEES.map((a) => (
                <option key={a} value={a}>
                  {a}
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
              opacity: name.trim() && company.trim() ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={!name.trim() || !company.trim()}
          >
            {initial ? "Save Changes" : "Create Deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quotation Modal ─────────────────────────────────────────────
function QuotationModal({
  open,
  onClose,
  initial,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  initial?: Quote | null;
  onSave: (data: {
    customer: string;
    expiry: string;
    lineItems: QuoteLineItem[];
  }) => void;
}>) {
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [expiry, setExpiry] = useState(initial?.expiry ?? "");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(
    initial?.lineItems?.length
      ? initial.lineItems
      : [{ productName: "", quantity: 1, unitPrice: 0 }],
  );

  if (!open) return null;

  const handleSubmit = () => {
    if (!customer.trim()) return;
    const validItems = lineItems.filter((li) => li.productName.trim());
    if (validItems.length === 0) return;
    onSave({ customer: customer.trim(), expiry, lineItems: validItems });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={initial ? "Edit Quotation" : "New Quotation"}
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
            {initial ? "Edit Quotation" : "New Quotation"}
          </h2>
          <button
            aria-label="Close"
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
              Customer <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <div>
            <label htmlFor="quote-expiry" style={labelStyle}>
              Expiry Date
            </label>
            <input
              id="quote-expiry"
              aria-label="Quote expiry date"
              style={inputStyle}
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          <LineItemsEditor items={lineItems} onChange={setLineItems} />
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
          <button style={primaryBtnStyle} onClick={handleSubmit}>
            {initial ? "Save Changes" : "Create Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Order Modal ───────────────────────────────────────────
function SalesOrderModal({
  open,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSave: (data: { customer: string; lineItems: QuoteLineItem[] }) => void;
}>) {
  const [customer, setCustomer] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { productName: "", quantity: 1, unitPrice: 0 },
  ]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!customer.trim()) return;
    const validItems = lineItems.filter((li) => li.productName.trim());
    if (validItems.length === 0) return;
    onSave({ customer: customer.trim(), lineItems: validItems });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="New Sales Order"
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
            New Sales Order
          </h2>
          <button
            aria-label="Close"
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
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            margin: "0 0 14px",
          }}
        >
          SO number will be auto-generated
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>
              Customer <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <LineItemsEditor items={lineItems} onChange={setLineItems} />
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
          <button style={primaryBtnStyle} onClick={handleSubmit}>
            Create Sales Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Modal ───────────────────────────────────────────────
function ProductModal({
  open,
  onClose,
  initial,
  onSave,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  initial?: Product | null;
  onSave: (data: Omit<Product, "id" | "status">) => void;
}>) {
  const CATEGORIES = [
    "Software",
    "Add-ons",
    "Services",
    "Training",
    "Hardware",
  ];
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [stock, setStock] = useState(String(initial?.stock ?? ""));

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim() || !sku.trim()) return;
    onSave({
      name: name.trim(),
      sku: sku.trim(),
      category,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
    });
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={initial ? "Edit Product" : "Add Product"}
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
            {initial ? "Edit Product" : "Add Product"}
          </h2>
          <button
            aria-label="Close"
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
              placeholder="Product name"
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>
                SKU <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="ABC-001"
              />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                aria-label="Select option"
                style={selectStyle}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Price ($)</label>
              <input
                style={inputStyle}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Stock</label>
              <input
                style={inputStyle}
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
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
              opacity: name.trim() && sku.trim() ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={!name.trim() || !sku.trim()}
          >
            {initial ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Opportunities Tab (Kanban) ──────────────────────────────────
function OpportunitiesTab() {
  const router = useRouter();
  const deals = useSalesStore((s) => s.deals);
  const addDeal = useSalesStore((s) => s.addDeal);
  const updateDeal = useSalesStore((s) => s.updateDeal);
  const deleteDeal = useSalesStore((s) => s.deleteDeal);
  const moveDealStage = useSalesStore((s) => s.moveDealStage);
  const dealDetail = useDetailParam("opp");
  const selectedDeal = dealDetail.id
    ? deals.find((d) => d.id === dealDetail.id)
    : undefined;

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Opportunity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stages: OpportunityStage[] = [
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  const filtered = deals.filter((o) => {
    const matchSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.company.toLowerCase().includes(search.toLowerCase()) ||
      o.assignee.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || o.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalPipeline = deals
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .reduce((s, o) => s + o.value, 0);

  const weightedPipeline = deals
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .reduce((s, o) => s + o.value * (o.probability / 100), 0);

  const wonDeals = deals.filter((o) => o.stage === "Closed Won");
  const wonTotal = wonDeals.reduce((s, o) => s + o.value, 0);

  const exportData = filtered.map((o) => ({
    name: o.name,
    company: o.company,
    value: String(o.value),
    probability: String(o.probability),
    stage: o.stage,
    expectedClose: o.expectedClose,
    assignee: o.assignee,
  }));

  const deleteTarget = deleteId ? deals.find((d) => d.id === deleteId) : null;

  return (
    <div>
      {/* Pipeline Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <KpiCard
          label="Total Pipeline"
          value={fmt(totalPipeline)}
          icon={<Target size={18} />}
          color="#06B6D4"
        />
        <KpiCard
          label="Weighted Pipeline"
          value={fmt(weightedPipeline)}
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
        />
        <KpiCard
          label="Won This Period"
          value={fmt(wonTotal)}
          icon={<DollarSign size={18} />}
          color="#22C55E"
        />
        <KpiCard
          label="Open Deals"
          value={String(
            deals.filter(
              (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost",
            ).length,
          )}
          icon={<ShoppingCart size={18} />}
          color="#3B82F6"
        />
      </div>

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search opportunities..."
          />
          <FilterDropdown
            label="All Stages"
            value={stageFilter}
            options={stages}
            onChange={setStageFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="opportunities-export"
            columns={[
              { key: "name", header: "Deal Name" },
              { key: "company", header: "Company" },
              { key: "value", header: "Value" },
              { key: "probability", header: "Probability" },
              { key: "stage", header: "Stage" },
              { key: "expectedClose", header: "Expected Close" },
              { key: "assignee", header: "Assignee" },
            ]}
          />
          <NewButton
            label="New Deal"
            onClick={() => router.push("/sales/opportunities/new")}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {stages.map((stage) => {
          const stageOpps = filtered.filter((o) => o.stage === stage);
          const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
          const cfg = stageConfig(stage);

          return (
            <div
              key={stage}
              style={{
                minWidth: 260,
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px 10px 0 0",
                  background: cfg.bg,
                  borderBottom: `2px solid ${cfg.dotColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: cfg.dotColor,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: cfg.color,
                    }}
                  >
                    {stage}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      color: cfg.color,
                      fontWeight: 600,
                    }}
                  >
                    {stageOpps.length}
                  </span>
                </div>
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}
                >
                  {fmt(stageTotal)}
                </span>
              </div>

              {/* Cards */}
              <div
                style={{
                  flex: 1,
                  background: "var(--content-secondary)",
                  borderRadius: "0 0 10px 10px",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minHeight: 120,
                  border: "1px solid var(--content-border)",
                  borderTop: "none",
                }}
              >
                {stageOpps.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No deals
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => dealDetail.open(opp.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "var(--content-bg)",
                        border: "1px solid var(--content-border)",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.08)";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "none";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {opp.name}
                        </div>
                        <div
                          style={{ display: "flex", gap: 2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconBtn
                            icon={<Pencil size={11} />}
                            title="Edit"
                            onClick={() => {
                              setEditingDeal(opp);
                              setShowModal(true);
                            }}
                          />
                          <IconBtn
                            icon={<Trash2 size={11} />}
                            title="Delete"
                            danger
                            onClick={() => setDeleteId(opp.id)}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          marginBottom: 8,
                        }}
                      >
                        {opp.company}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {fmtFull(opp.value)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 10,
                            ...probabilityBadgeStyle(opp.probability),
                          }}
                        >
                          {opp.probability}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "rgba(6, 182, 212,0.10)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8,
                              fontWeight: 700,
                              color: "var(--vyne-purple)",
                            }}
                          >
                            {initials(opp.assignee)}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {opp.assignee}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {opp.expectedClose}
                        </span>
                      </div>

                      {/* Stage move buttons */}
                      {opp.stage !== "Closed Won" &&
                        opp.stage !== "Closed Lost" && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                              borderTop: "1px solid var(--content-border)",
                              paddingTop: 8,
                              marginTop: 4,
                            }}
                          >
                            {stages
                              .filter((s) => s !== opp.stage)
                              .map((s) => {
                                const sc = stageConfig(s);
                                return (
                                  <SmallBtn
                                    key={s}
                                    label={s}
                                    color={sc.color}
                                    bg={sc.bg}
                                    onClick={() => moveDealStage(opp.id, s)}
                                  />
                                );
                              })}
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Modal */}
      <DealModal
        key={editingDeal?.id ?? "new"}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingDeal(null);
        }}
        initial={editingDeal}
        onSave={(data) => {
          if (editingDeal) {
            updateDeal(editingDeal.id, data);
          } else {
            addDeal(data);
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteDeal(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      {/* Slide-in opportunity detail panel */}
      <OpportunityDetailPanel deal={selectedDeal} onClose={dealDetail.close} />
    </div>
  );
}

function OpportunityDetailPanel({
  deal,
  onClose,
}: {
  deal: Opportunity | undefined;
  onClose: () => void;
}) {
  const weighted = deal ? Math.round((deal.value * deal.probability) / 100) : 0;
  const sc = deal ? stageConfig(deal.stage) : { bg: "", color: "" };
  return (
    <DetailPanel
      open={!!deal}
      onClose={onClose}
      title={deal?.name ?? ""}
      subtitle={
        deal
          ? `${deal.company}${deal.contact ? ` · ${deal.contact}` : ""}`
          : undefined
      }
      badge={
        deal && (
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
            {deal.stage}
          </span>
        )
      }
    >
      {!deal ? null : (
        <>
          <DetailSection title="Value">
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                  }}
                >
                  ${deal.value.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  {deal.probability}% probability
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="text-aurora"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                  }}
                >
                  ${weighted.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  Weighted
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Details">
            <DetailRow label="Company" value={deal.company} />
            <DetailRow label="Contact" value={deal.contact || "—"} />
            <DetailRow label="Assignee" value={deal.assignee} />
            <DetailRow
              label="Expected close"
              value={deal.expectedClose || "—"}
            />
            <DetailRow
              label="Created"
              value={new Date(deal.createdAt).toLocaleDateString()}
            />
          </DetailSection>
        </>
      )}
    </DetailPanel>
  );
}

// ─── Quotations Tab ──────────────────────────────────────────────
function QuotationsTab() {
  const router = useRouter();
  const quotes = useSalesStore((s) => s.quotations);
  const addQuotation = useSalesStore((s) => s.addQuotation);
  const deleteQuotation = useSalesStore((s) => s.deleteQuotation);
  const acceptQuotation = useSalesStore((s) => s.acceptQuotation);
  const rejectQuotation = useSalesStore((s) => s.rejectQuotation);
  const sendQuotation = useSalesStore((s) => s.sendQuotation);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = quotes.filter((q) => {
    const matchSearch =
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((q) => ({
    number: q.number,
    customer: q.customer,
    date: q.date,
    expiry: q.expiry,
    amount: String(q.amount),
    status: q.status,
    items: String(q.items),
  }));

  const deleteTarget = deleteId ? quotes.find((q) => q.id === deleteId) : null;

  return (
    <div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search quotations..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Draft", "Sent", "Accepted", "Rejected"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="quotations-export"
            columns={[
              { key: "number", header: "Quote #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "expiry", header: "Expiry" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton
            label="New Quote"
            onClick={() => router.push("/sales/quotes/new")}
          />
        </div>
      </div>

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
                <Th>Quote #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Expiry</Th>
                <Th>Items</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th width={180}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No quotations match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const cfg = quoteStatusConfig(q.status);
                  const isExpired = new Date(q.expiry) < new Date();
                  return (
                    <tr
                      key={q.id}
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
                      <Td mono>{q.number}</Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>{q.customer}</span>
                      </Td>
                      <Td>{q.date}</Td>
                      <Td>
                        <span
                          style={{
                            color: isExpired
                              ? "#991B1B"
                              : "var(--text-primary)",
                          }}
                        >
                          {q.expiry}
                          {isExpired && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 4,
                                color: "#EF4444",
                              }}
                            >
                              (expired)
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td>{q.items}</Td>
                      <Td mono>{fmtFull(q.amount)}</Td>
                      <Td>
                        <StatusBadge label={q.status} config={cfg} />
                      </Td>
                      <Td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {q.status === "Draft" && (
                            <SmallBtn
                              label="Send"
                              color="#fff"
                              bg="var(--vyne-purple)"
                              onClick={() => sendQuotation(q.id)}
                            />
                          )}
                          {(q.status === "Sent" || q.status === "Draft") && (
                            <>
                              <SmallBtn
                                label="Accept"
                                color="#166534"
                                bg="#F0FDF4"
                                onClick={() => acceptQuotation(q.id)}
                              />
                              <SmallBtn
                                label="Reject"
                                color="#991B1B"
                                bg="#FEF2F2"
                                onClick={() => rejectQuotation(q.id)}
                              />
                            </>
                          )}
                          <IconBtn
                            icon={<Trash2 size={12} />}
                            title="Delete"
                            danger
                            onClick={() => setDeleteId(q.id)}
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

      <QuotationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={(data) => addQuotation(data)}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Quotation"
        message={`Are you sure you want to delete "${deleteTarget?.number}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteQuotation(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Sales Orders Tab ────────────────────────────────────────────
function SalesOrdersTab() {
  const router = useRouter();
  const orders = useSalesStore((s) => s.salesOrders);
  const addSalesOrder = useSalesStore((s) => s.addSalesOrder);
  const deleteSalesOrder = useSalesStore((s) => s.deleteSalesOrder);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((o) => ({
    number: o.number,
    customer: o.customer,
    date: o.date,
    amount: String(o.amount),
    status: o.status,
    tracking: o.tracking,
  }));

  const deleteTarget = deleteId ? orders.find((o) => o.id === deleteId) : null;

  return (
    <div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search orders..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Confirmed", "Processing", "Shipped", "Delivered"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="sales-orders-export"
            columns={[
              { key: "number", header: "SO #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
              { key: "tracking", header: "Tracking" },
            ]}
          />
          <NewButton
            label="New Order"
            onClick={() => router.push("/sales/orders/new")}
          />
        </div>
      </div>

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
                <Th>SO #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Items</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Tracking</Th>
                <Th width={60}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const cfg = orderStatusConfig(order.status);
                  return (
                    <tr
                      key={order.id}
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
                      <Td mono>{order.number}</Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>
                          {order.customer}
                        </span>
                      </Td>
                      <Td>{order.date}</Td>
                      <Td>{order.items}</Td>
                      <Td mono>{fmtFull(order.amount)}</Td>
                      <Td>
                        <StatusBadge label={order.status} config={cfg} />
                      </Td>
                      <Td>
                        {order.tracking === "--" ? (
                          <span
                            style={{
                              color: "var(--text-tertiary)",
                              fontSize: 11,
                            }}
                          >
                            Pending
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: "'SF Mono', 'Fira Code', monospace",
                              color: "var(--vyne-purple)",
                            }}
                          >
                            {order.tracking}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <IconBtn
                          icon={<Trash2 size={12} />}
                          title="Delete"
                          danger
                          onClick={() => setDeleteId(order.id)}
                        />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SalesOrderModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={(data) => addSalesOrder(data)}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Sales Order"
        message={`Are you sure you want to delete "${deleteTarget?.number}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteSalesOrder(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────
function ProductsTab() {
  const router = useRouter();
  const products = useSalesStore((s) => s.products);
  const addProduct = useSalesStore((s) => s.addProduct);
  const updateProduct = useSalesStore((s) => s.updateProduct);
  const deleteProduct = useSalesStore((s) => s.deleteProduct);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const exportData = filtered.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: String(p.price),
    stock: String(p.stock),
    status: p.status,
  }));

  const deleteTarget = deleteId
    ? products.find((p) => p.id === deleteId)
    : null;

  return (
    <div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products..."
          />
          <FilterDropdown
            label="All Categories"
            value={categoryFilter}
            options={categories}
            onChange={setCategoryFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="products-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "sku", header: "SKU" },
              { key: "category", header: "Category" },
              { key: "price", header: "Price" },
              { key: "stock", header: "Stock" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton
            label="Add Product"
            onClick={() => router.push("/sales/products/new")}
          />
        </div>
      </div>

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
                <Th>SKU</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
                <Th width={80}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No products match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const cfg = productStatusConfig(product.status);
                  return (
                    <tr
                      key={product.id}
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
                            }}
                          >
                            <Package
                              size={14}
                              style={{ color: "var(--vyne-purple)" }}
                            />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {product.name}
                          </span>
                        </div>
                      </Td>
                      <Td mono>{product.sku}</Td>
                      <Td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 500,
                            background: "var(--content-secondary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {product.category}
                        </span>
                      </Td>
                      <Td mono>{fmtFull(product.price)}</Td>
                      <Td>
                        {product.stock === 999
                          ? "Unlimited"
                          : product.stock.toLocaleString()}
                      </Td>
                      <Td>
                        <StatusBadge label={product.status} config={cfg} />
                      </Td>
                      <Td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <IconBtn
                            icon={<Pencil size={13} />}
                            title="Edit"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowModal(true);
                            }}
                          />
                          <IconBtn
                            icon={<Trash2 size={13} />}
                            title="Delete"
                            danger
                            onClick={() => setDeleteId(product.id)}
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

      <ProductModal
        key={editingProduct?.id ?? "new"}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProduct(null);
        }}
        initial={editingProduct}
        onSave={(data) => {
          if (editingProduct) {
            updateProduct(editingProduct.id, data);
          } else {
            addProduct(data);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteProduct(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Customers Tab ───────────────────────────────────────────────
function CustomersTab() {
  const customers = useSalesStore((s) => s.customers);
  const deleteCustomer = useSalesStore((s) => s.deleteCustomer);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map((c) => ({
    name: c.name,
    email: c.email,
    totalOrders: String(c.totalOrders),
    totalRevenue: String(c.totalRevenue),
    lastOrder: c.lastOrder,
    status: c.status,
  }));

  const deleteTarget = deleteId
    ? customers.find((c) => c.id === deleteId)
    : null;

  return (
    <div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customers..."
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Active", "Inactive", "New"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="customers-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "totalOrders", header: "Total Orders" },
              { key: "totalRevenue", header: "Total Revenue" },
              { key: "lastOrder", header: "Last Order" },
              { key: "status", header: "Status" },
            ]}
          />
        </div>
      </div>

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
                <Th>Total Orders</Th>
                <Th>Total Revenue</Th>
                <Th>Last Order</Th>
                <Th>Status</Th>
                <Th width={60}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No customers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const cfg = customerStatusConfig(cust.status);
                  return (
                    <tr
                      key={cust.id}
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
                            {initials(cust.name)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {cust.name}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                        >
                          {cust.email}
                        </span>
                      </Td>
                      <Td>{cust.totalOrders}</Td>
                      <Td mono>{fmtFull(cust.totalRevenue)}</Td>
                      <Td>{cust.lastOrder}</Td>
                      <Td>
                        <StatusBadge label={cust.status} config={cfg} />
                      </Td>
                      <Td>
                        <IconBtn
                          icon={<Trash2 size={12} />}
                          title="Delete"
                          danger
                          onClick={() => setDeleteId(cust.id)}
                        />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteId) deleteCustomer(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────
const MONTHLY_REVENUE = [
  { month: "Oct 2025", revenue: 182000 },
  { month: "Nov 2025", revenue: 215000 },
  { month: "Dec 2025", revenue: 198000 },
  { month: "Jan 2026", revenue: 242000 },
  { month: "Feb 2026", revenue: 278000 },
  { month: "Mar 2026", revenue: 310000 },
];

function ReportsTab() {
  const deals = useSalesStore((s) => s.deals);
  const customers = useSalesStore((s) => s.customers);

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const wonDeals = deals.filter((o) => o.stage === "Closed Won");
  const lostDeals = deals.filter((o) => o.stage === "Closed Lost");
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((s, o) => s + o.value, 0) / wonDeals.length
      : 0;
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
        )
      : 0;
  const pipelineValue = deals
    .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
    .reduce((s, o) => s + o.value, 0);

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  const stages: OpportunityStage[] = [
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          icon={<DollarSign size={18} />}
          color="#22C55E"
        />
        <KpiCard
          label="Avg Deal Size"
          value={fmt(avgDealSize)}
          icon={<TrendingUp size={18} />}
          color="#06B6D4"
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={<Target size={18} />}
          color="#3B82F6"
        />
        <KpiCard
          label="Pipeline Value"
          value={fmt(pipelineValue)}
          icon={<BarChart3 size={18} />}
          color="#8B5CF6"
        />
      </div>

      {/* Monthly Revenue Bar Chart */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Monthly Revenue
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Last 6 months
            </div>
          </div>
          <ExportButton
            data={MONTHLY_REVENUE.map((m) => ({
              month: m.month,
              revenue: String(m.revenue),
            }))}
            filename="monthly-revenue-export"
            columns={[
              { key: "month", header: "Month" },
              { key: "revenue", header: "Revenue" },
            ]}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            height: 200,
            padding: "0 8px",
          }}
        >
          {MONTHLY_REVENUE.map((m, i) => {
            const barHeight =
              maxRevenue > 0 ? (m.revenue / maxRevenue) * 170 : 0;
            return (
              <div
                key={m.month}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {fmt(m.revenue)}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 48,
                    height: barHeight,
                    borderRadius: "6px 6px 2px 2px",
                    background:
                      i === MONTHLY_REVENUE.length - 1
                        ? "linear-gradient(180deg, #06B6D4 0%, #22D3EE 100%)"
                        : "rgba(6, 182, 212,0.20)",
                    transition: "height 0.3s ease",
                    position: "relative",
                  }}
                  title={`${m.month}: ${fmtFull(m.revenue)}`}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  {m.month.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top Deals */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Top Deals (Won)
          </div>
          {wonDeals.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
                padding: 20,
              }}
            >
              No won deals yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wonDeals
                .sort((a, b) => b.value - a.value)
                .map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--content-secondary)",
                      border: "1px solid var(--content-border)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {deal.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {deal.company}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--badge-success-text)",
                      }}
                    >
                      {fmtFull(deal.value)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Pipeline by Stage */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Pipeline by Stage
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stages.map((stage) => {
              const stageOpps = deals.filter((o) => o.stage === stage);
              const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
              const cfg = stageConfig(stage);
              const allTotal = deals.reduce((s, o) => s + o.value, 0);
              const pct =
                allTotal > 0 ? Math.round((stageTotal / allTotal) * 100) : 0;

              return (
                <div key={stage}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: cfg.dotColor,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {stage}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        ({stageOpps.length})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {fmt(stageTotal)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 3,
                      background: "var(--content-secondary)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: cfg.dotColor,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: 20,
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Top Customers by Revenue
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Total Revenue</Th>
                <Th>Orders</Th>
                <Th>Avg Order Value</Th>
              </tr>
            </thead>
            <tbody>
              {[...customers]
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 5)
                .map((cust) => (
                  <tr key={cust.id}>
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
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(6, 182, 212,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--vyne-purple)",
                          }}
                        >
                          {initials(cust.name)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>
                          {cust.name}
                        </span>
                      </div>
                    </Td>
                    <Td mono>{fmtFull(cust.totalRevenue)}</Td>
                    <Td>{cust.totalOrders}</Td>
                    <Td mono>
                      {fmtFull(
                        Math.round(cust.totalRevenue / cust.totalOrders),
                      )}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesPageInner />
    </Suspense>
  );
}

function SalesPageInner() {
  const [activeTab, setActiveTab] = useState<SalesTab>("opportunities");
  const deals = useSalesStore((s) => s.deals);
  const salesOrders = useSalesStore((s) => s.salesOrders);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        icon={<ShoppingCart size={16} />}
        title="Sales"
        subtitle={`${deals.length} opportunities · ${salesOrders.length} orders`}
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
          overflowX: "auto",
        }}
      >
        <TabBtn
          label="Opportunities"
          icon={<Target size={13} />}
          active={activeTab === "opportunities"}
          onClick={() => setActiveTab("opportunities")}
        />
        <TabBtn
          label="Quotations"
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          active={activeTab === "quotations"}
          onClick={() => setActiveTab("quotations")}
        />
        <TabBtn
          label="Sales Orders"
          icon={<ShoppingCart size={13} />}
          active={activeTab === "orders"}
          onClick={() => setActiveTab("orders")}
        />
        <TabBtn
          label="Products"
          icon={<Package size={13} />}
          active={activeTab === "products"}
          onClick={() => setActiveTab("products")}
        />
        <TabBtn
          label="Customers"
          icon={<Users size={13} />}
          active={activeTab === "customers"}
          onClick={() => setActiveTab("customers")}
        />
        <TabBtn
          label="Reports"
          icon={<BarChart3 size={13} />}
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "opportunities" && <OpportunitiesTab />}
        {activeTab === "quotations" && <QuotationsTab />}
        {activeTab === "orders" && <SalesOrdersTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}
