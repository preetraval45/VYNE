"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Send,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  FileText,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  X,
  FileDown,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { downloadInvoicePdf, type InvoicePayload } from "@/lib/pdf/invoicePdf";
import {
  useInvoicingStore,
  type Customer,
  type Invoice,
  type InvoiceLineItem,
  type CreditNote,
  type Payment,
  type Vendor,
  type Bill,
  type BillLineItem,
  type Refund,
  type InvoiceStatus,
  type BillStatus,
  type CreditNoteStatus,
  type PaymentMethod,
  type PaymentStatus,
  type CustomerStatus,
  type VendorStatus,
  type RefundStatus,
  type RefundType,
} from "@/lib/stores/invoicing";

// ─── Shared Types ─────────────────────────────────────────────────
type Tab =
  | "customers"
  | "invoices"
  | "creditNotes"
  | "payments"
  | "vendors"
  | "bills"
  | "refunds";

type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Status Badge Configs ─────────────────────────────────────────
function invoiceStatusStyle(s: InvoiceStatus): { bg: string; color: string } {
  const map: Record<InvoiceStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Sent: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Paid: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Overdue: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    Cancelled: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function creditNoteStatusStyle(s: CreditNoteStatus): {
  bg: string;
  color: string;
} {
  const map: Record<CreditNoteStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Applied: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Refunded: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  return map[s];
}

function paymentStatusStyle(s: PaymentStatus): { bg: string; color: string } {
  const map: Record<PaymentStatus, { bg: string; color: string }> = {
    Completed: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Pending: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Failed: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function billStatusStyle(s: BillStatus): { bg: string; color: string } {
  const map: Record<BillStatus, { bg: string; color: string }> = {
    Draft: { bg: "#F0F0F8", color: "var(--text-secondary)" },
    Received: { bg: "#EFF6FF", color: "#1E40AF" },
    Paid: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Overdue: { bg: "#FEF2F2", color: "var(--badge-danger-text)" },
  };
  return map[s];
}

function refundStatusStyle(s: RefundStatus): { bg: string; color: string } {
  const map: Record<RefundStatus, { bg: string; color: string }> = {
    Processed: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Pending: { bg: "#FFFBEB", color: "var(--badge-warning-text)" },
    Cancelled: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function customerStatusStyle(s: CustomerStatus): { bg: string; color: string } {
  const map: Record<CustomerStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Inactive: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

function vendorStatusStyle(s: VendorStatus): { bg: string; color: string } {
  const map: Record<VendorStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "var(--badge-success-text)" },
    Inactive: { bg: "#F0F0F8", color: "#6B7280" },
  };
  return map[s];
}

// ─── Shared Sub-Components ────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  label,
  bg,
  color,
}: Readonly<{ label: string; bg: string; color: string }>) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  delta,
  deltaUp,
}: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  delta?: string;
  deltaUp?: boolean;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "14px 16px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 10,
            color: deltaUp ? "var(--status-success)" : "var(--status-danger)",
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {deltaUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{" "}
          {delta}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: Readonly<{
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
}>) {
  const isActive = currentSort === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: "9px 16px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 600,
        color: isActive ? "var(--vyne-purple)" : "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label}
        {isActive &&
          (currentDir === "asc" ? (
            <ChevronUp size={10} />
          ) : (
            <ChevronDown size={10} />
          ))}
      </span>
    </th>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  color,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}>) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid var(--content-border)",
        background: "transparent",
        cursor: "pointer",
        color: color ?? "var(--text-secondary)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
    </button>
  );
}

function PrimaryBtn({
  icon,
  label,
  onClick,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "var(--vyne-purple)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterBtn({
  label,
  active,
  count,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 6,
        border: active
          ? "1px solid var(--vyne-purple)"
          : "1px solid var(--content-border)",
        background: active ? "rgba(108,71,255,0.08)" : "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.15s",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "0 5px",
            borderRadius: 10,
            background: active ? "var(--vyne-purple)" : "rgba(0,0,0,0.06)",
            color: active ? "#fff" : "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
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
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Search
        size={14}
        style={{
          position: "absolute",
          left: 10,
          color: "var(--text-tertiary)",
          pointerEvents: "none",
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: 220,
          padding: "7px 10px 7px 30px",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          background: "var(--content-secondary)",
          outline: "none",
          fontSize: 12,
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

function TableContainer({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

function TableRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <tr
      style={{ borderTop: "1px solid var(--content-border)" }}
      onMouseEnter={(ev) => {
        (ev.currentTarget as HTMLTableRowElement).style.background = "var(--content-secondary)";
      }}
      onMouseLeave={(ev) => {
        (ev.currentTarget as HTMLTableRowElement).style.background =
          "transparent";
      }}
    >
      {children}
    </tr>
  );
}

function Td({
  children,
  bold,
  color,
  mono,
  align,
}: Readonly<{
  children: React.ReactNode;
  bold?: boolean;
  color?: string;
  mono?: boolean;
  align?: "left" | "right" | "center";
}>) {
  return (
    <td
      style={{
        padding: "10px 16px",
        fontSize: 12,
        fontWeight: bold ? 600 : 400,
        color: color ?? "var(--text-primary)",
        fontFamily: mono ? "monospace" : "inherit",
        textAlign: align ?? "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

// ─── Sort Utility ─────────────────────────────────────────────────
function useSortableData<T>(
  items: T[],
  defaultKey: string,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? "").toLowerCase();
      const bStr = String(bVal ?? "").toLowerCase();
      if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, handleSort };
}

// ─── Modal / Overlay ──────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "var(--content-bg, #fff)",
  borderRadius: 12,
  padding: 24,
  width: "95%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--content-border)",
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
  background: "var(--content-secondary)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...fieldInputStyle,
  appearance: "auto" as React.CSSProperties["appearance"],
};

function ModalHeader({
  title,
  onClose,
}: Readonly<{ title: string; onClose: () => void }>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
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
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
}: Readonly<{
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 20,
      }}
    >
      <button
        onClick={onCancel}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid var(--content-border)",
          background: "transparent",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          background: "var(--vyne-purple)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function FieldGroup({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={{ marginBottom: 14 }}>{children}</div>;
}

// ─── Confirm Delete Dialog ────────────────────────────────────────
function ConfirmDeleteDialog({
  name,
  onConfirm,
  onCancel,
}: Readonly<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="Confirm Delete" onClose={onCancel} />
        <p
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Are you sure you want to delete <strong>{name}</strong>? This action
          cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "transparent",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#DC2626",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Line Items Editor ────────────────────────────────────────────
function LineItemsEditor({
  items,
  onChange,
}: {
  items: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
}) {
  const addLine = () =>
    onChange([...items, { description: "", qty: 1, rate: 0 }]);
  const removeLine = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx));
  const updateLine = (
    idx: number,
    field: keyof InvoiceLineItem,
    value: string | number,
  ) => {
    const updated = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    onChange(updated);
  };

  const total = items.reduce((s, li) => s + li.qty * li.rate, 0);

  return (
    <div>
      <label style={fieldLabelStyle}>Line Items</label>
      <div
        style={{
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 60px 90px 28px",
            gap: 0,
            padding: "6px 8px",
            background: "var(--table-header-bg)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span>Description</span>
          <span>Qty</span>
          <span>Rate</span>
          <span></span>
        </div>
        {items.map((li, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 90px 28px",
              gap: 4,
              padding: "4px 8px",
              borderTop: "1px solid var(--content-border)",
              alignItems: "center",
            }}
          >
            <input
              value={li.description}
              onChange={(e) => updateLine(idx, "description", e.target.value)}
              placeholder="Item description"
              style={{ ...fieldInputStyle, padding: "5px 6px", fontSize: 12 }}
            />
            <input
              type="number"
              min={1}
              value={li.qty}
              onChange={(e) =>
                updateLine(idx, "qty", parseInt(e.target.value) || 0)
              }
              style={{ ...fieldInputStyle, padding: "5px 6px", fontSize: 12 }}
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={li.rate}
              onChange={(e) =>
                updateLine(idx, "rate", parseFloat(e.target.value) || 0)
              }
              style={{ ...fieldInputStyle, padding: "5px 6px", fontSize: 12 }}
            />
            <button
              onClick={() => removeLine(idx)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--status-danger)",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Remove line"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px",
            borderTop: "1px solid var(--content-border)",
          }}
        >
          <button
            onClick={addLine}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--vyne-purple)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={12} /> Add line item
          </button>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Total: {fmtFull(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Modal ───────────────────────────────────────────────
function CustomerModal({
  existing,
  onClose,
}: {
  existing?: Customer;
  onClose: () => void;
}) {
  const { addCustomer, updateCustomer } = useInvoicingStore();
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [status, setStatus] = useState<CustomerStatus>(
    existing?.status ?? "Active",
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (existing) {
      updateCustomer(existing.id, { name, email, phone, status });
    } else {
      addCustomer({ name, email, phone });
    }
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader
          title={existing ? "Edit Customer" : "New Customer"}
          onClose={onClose}
        />
        <FieldGroup>
          <label style={fieldLabelStyle}>Name</label>
          <input
            style={fieldInputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Email</label>
          <input
            style={fieldInputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="billing@company.com"
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Phone</label>
          <input
            style={fieldInputStyle}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
          />
        </FieldGroup>
        {existing && (
          <FieldGroup>
            <label style={fieldLabelStyle}>Status</label>
            <select aria-label="Select option"
              style={selectStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as CustomerStatus)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FieldGroup>
        )}
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={existing ? "Save Changes" : "Create Customer"}
        />
      </div>
    </div>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────
function InvoiceModal({
  existing,
  onClose,
}: {
  existing?: Invoice;
  onClose: () => void;
}) {
  const { customers, addInvoice, updateInvoice } = useInvoicingStore();
  const [customer, setCustomer] = useState(existing?.customer ?? "");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [items, setItems] = useState<InvoiceLineItem[]>(
    existing?.items?.length
      ? existing.items
      : [{ description: "", qty: 1, rate: 0 }],
  );

  const handleSubmit = () => {
    if (!customer || items.length === 0 || !dueDate) return;
    if (existing) {
      updateInvoice(existing.id, { customer, dueDate, notes, items });
    } else {
      addInvoice({ customer, items, dueDate, notes });
    }
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...modalStyle, maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={existing ? "Edit Invoice" : "New Invoice"}
          onClose={onClose}
        />
        <FieldGroup>
          <label style={fieldLabelStyle}>Customer</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Select a customer...</option>
            {customers
              .filter((c) => c.status === "Active")
              .map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <LineItemsEditor items={items} onChange={setItems} />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Due Date</label>
          <input
            style={fieldInputStyle}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Notes</label>
          <textarea
            style={{ ...fieldInputStyle, minHeight: 60, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, special instructions..."
          />
        </FieldGroup>
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={existing ? "Save Changes" : "Create Invoice"}
        />
      </div>
    </div>
  );
}

// ─── Credit Note Modal ────────────────────────────────────────────
function CreditNoteModal({ onClose }: { onClose: () => void }) {
  const { customers, invoices, addCreditNote } = useInvoicingStore();
  const [customer, setCustomer] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  const customerInvoices = invoices.filter((i) => i.customer === customer);

  const handleSubmit = () => {
    if (!customer || !originalInvoice || amount <= 0) return;
    addCreditNote({ customer, originalInvoice, amount, reason });
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="New Credit Note" onClose={onClose} />
        <FieldGroup>
          <label style={fieldLabelStyle}>Customer</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setOriginalInvoice("");
            }}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Original Invoice</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={originalInvoice}
            onChange={(e) => setOriginalInvoice(e.target.value)}
          >
            <option value="">Select an invoice...</option>
            {customerInvoices.map((inv) => (
              <option key={inv.id} value={inv.number}>
                {inv.number} - {fmtFull(inv.amount)}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Amount</label>
          <input
            style={fieldInputStyle}
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Reason</label>
          <textarea
            style={{ ...fieldInputStyle, minHeight: 60, resize: "vertical" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for credit note..."
          />
        </FieldGroup>
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Create Credit Note"
        />
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────
function PaymentModal({ onClose }: { onClose: () => void }) {
  const { customers, invoices, addPayment } = useInvoicingStore();
  const [customer, setCustomer] = useState("");
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const customerInvoices = invoices.filter(
    (i) =>
      i.customer === customer &&
      (i.status === "Sent" || i.status === "Overdue" || i.status === "Draft"),
  );

  const handleSubmit = () => {
    if (!customer || !invoice || amount <= 0) return;
    addPayment({ customer, invoice, amount, method, date });
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="Record Payment" onClose={onClose} />
        <FieldGroup>
          <label style={fieldLabelStyle}>Customer</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setInvoice("");
            }}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Invoice</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={invoice}
            onChange={(e) => {
              setInvoice(e.target.value);
              const inv = invoices.find((i) => i.number === e.target.value);
              if (inv) setAmount(inv.amount);
            }}
          >
            <option value="">Select an invoice...</option>
            {customerInvoices.map((inv) => (
              <option key={inv.id} value={inv.number}>
                {inv.number} - {fmtFull(inv.amount)} ({inv.status})
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Amount</label>
          <input
            style={fieldInputStyle}
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Method</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Check">Check</option>
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Date</label>
          <input
            style={fieldInputStyle}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FieldGroup>
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Record Payment"
        />
      </div>
    </div>
  );
}

// ─── Vendor Modal ─────────────────────────────────────────────────
function VendorModal({
  existing,
  onClose,
}: {
  existing?: Vendor;
  onClose: () => void;
}) {
  const { addVendor, updateVendor } = useInvoicingStore();
  const [name, setName] = useState(existing?.name ?? "");
  const [contact, setContact] = useState(existing?.contact ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [status, setStatus] = useState<VendorStatus>(
    existing?.status ?? "Active",
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (existing) {
      updateVendor(existing.id, { name, contact, email, phone, status });
    } else {
      addVendor({ name, contact, email, phone });
    }
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader
          title={existing ? "Edit Vendor" : "New Vendor"}
          onClose={onClose}
        />
        <FieldGroup>
          <label style={fieldLabelStyle}>Name</label>
          <input
            style={fieldInputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vendor company name"
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Contact Person</label>
          <input
            style={fieldInputStyle}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contact person name"
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Email</label>
          <input
            style={fieldInputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vendor@company.com"
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Phone</label>
          <input
            style={fieldInputStyle}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
          />
        </FieldGroup>
        {existing && (
          <FieldGroup>
            <label style={fieldLabelStyle}>Status</label>
            <select aria-label="Select option"
              style={selectStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorStatus)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FieldGroup>
        )}
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={existing ? "Save Changes" : "Create Vendor"}
        />
      </div>
    </div>
  );
}

// ─── Bill Modal ───────────────────────────────────────────────────
function BillModal({
  existing,
  onClose,
}: {
  existing?: Bill;
  onClose: () => void;
}) {
  const { vendors, addBill, updateBill } = useInvoicingStore();
  const [vendor, setVendor] = useState(existing?.vendor ?? "");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [items, setItems] = useState<BillLineItem[]>(
    existing?.items?.length
      ? existing.items
      : [{ description: "", qty: 1, rate: 0 }],
  );

  const handleSubmit = () => {
    if (!vendor || items.length === 0 || !dueDate) return;
    if (existing) {
      updateBill(existing.id, { vendor, dueDate, items });
    } else {
      addBill({ vendor, items, dueDate });
    }
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...modalStyle, maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title={existing ? "Edit Bill" : "New Bill"}
          onClose={onClose}
        />
        <FieldGroup>
          <label style={fieldLabelStyle}>Vendor</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          >
            <option value="">Select a vendor...</option>
            {vendors
              .filter((v) => v.status === "Active")
              .map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <LineItemsEditor items={items} onChange={setItems} />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Due Date</label>
          <input
            style={fieldInputStyle}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </FieldGroup>
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel={existing ? "Save Changes" : "Create Bill"}
        />
      </div>
    </div>
  );
}

// ─── Refund Modal ─────────────────────────────────────────────────
function RefundModal({ onClose }: { onClose: () => void }) {
  const { customers, vendors, addRefund } = useInvoicingStore();
  const [type, setType] = useState<RefundType>("Customer Refund");
  const [customerOrVendor, setCustomerOrVendor] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  const options =
    type === "Customer Refund"
      ? customers.map((c) => c.name)
      : vendors.map((v) => v.name);

  const handleSubmit = () => {
    if (!customerOrVendor || amount <= 0) return;
    addRefund({ customerOrVendor, type, amount, reason });
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="New Refund" onClose={onClose} />
        <FieldGroup>
          <label style={fieldLabelStyle}>Refund Type</label>
          <select aria-label="Select option"
            style={selectStyle}
            value={type}
            onChange={(e) => {
              setType(e.target.value as RefundType);
              setCustomerOrVendor("");
            }}
          >
            <option value="Customer Refund">Customer Refund</option>
            <option value="Vendor Refund">Vendor Refund</option>
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>
            {type === "Customer Refund" ? "Customer" : "Vendor"}
          </label>
          <select aria-label="Select option"
            style={selectStyle}
            value={customerOrVendor}
            onChange={(e) => setCustomerOrVendor(e.target.value)}
          >
            <option value="">
              Select a {type === "Customer Refund" ? "customer" : "vendor"}...
            </option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Amount</label>
          <input
            style={fieldInputStyle}
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </FieldGroup>
        <FieldGroup>
          <label style={fieldLabelStyle}>Reason</label>
          <textarea
            style={{ ...fieldInputStyle, minHeight: 60, resize: "vertical" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund..."
          />
        </FieldGroup>
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Create Refund"
        />
      </div>
    </div>
  );
}

// ─── Tab: Customers ───────────────────────────────────────────────
function CustomersTab() {
  const { customers, deleteCustomer } = useInvoicingStore();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; customer: Customer } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "name",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={customers as unknown as Record<string, unknown>[]}
            filename="vyne-customers"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "totalRevenue", header: "Total Revenue" },
              { key: "outstandingBalance", header: "Outstanding" },
              { key: "lastInvoice", header: "Last Invoice" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Customer"
            onClick={() => setModal({ type: "create" })}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Name"
              sortKey="name"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Email"
              sortKey="email"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Phone"
              sortKey="phone"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Total Revenue"
              sortKey="totalRevenue"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Outstanding"
              sortKey="outstandingBalance"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Last Invoice"
              sortKey="lastInvoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const st = customerStatusStyle(c.status);
            return (
              <TableRow key={c.id}>
                <Td bold color="var(--vyne-purple)">
                  {c.name}
                </Td>
                <Td color="var(--text-secondary)">{c.email}</Td>
                <Td color="var(--text-secondary)">{c.phone}</Td>
                <Td bold>{fmtFull(c.totalRevenue)}</Td>
                <Td
                  bold
                  color={
                    c.outstandingBalance > 0 ? "#991B1B" : "var(--text-primary)"
                  }
                >
                  {c.outstandingBalance > 0
                    ? fmtFull(c.outstandingBalance)
                    : "--"}
                </Td>
                <Td color="var(--text-tertiary)">{fmtDate(c.lastInvoice)}</Td>
                <Td>
                  <StatusBadge label={c.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <ActionBtn
                      icon={<Edit2 size={12} />}
                      label="Edit"
                      onClick={() => setModal({ type: "edit", customer: c })}
                      color="var(--vyne-purple)"
                    />
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(c)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No customers found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {modal?.type === "create" && (
        <CustomerModal onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <CustomerModal
          existing={modal.customer}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.name}
          onConfirm={() => {
            deleteCustomer(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Invoices ────────────────────────────────────────────────
function InvoicesTab() {
  const { invoices, markAsPaid, sendInvoice, deleteInvoice } =
    useInvoicingStore();
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; invoice: Invoice } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  function handleDownloadPdf(inv: Invoice) {
    const payload: InvoicePayload = {
      number: inv.number,
      issueDate: inv.date,
      dueDate: inv.dueDate,
      status:
        inv.status === "Paid"
          ? "paid"
          : inv.status === "Sent"
            ? "sent"
            : inv.status === "Overdue"
              ? "overdue"
              : "draft",
      customer: {
        name: inv.customer,
      },
      lineItems: inv.items.map((it) => ({
        description: it.description,
        quantity: it.qty,
        unitPrice: it.rate,
      })),
      notes: inv.notes,
      currency: "USD",
    };
    downloadInvoicePdf(payload, {
      name: "VYNE Demo Org",
      email: "billing@vyne.dev",
      address: "Charlotte, NC · https://vyne.vercel.app",
      accentColor: "#6C47FF",
    });
  }

  const filtered =
    filter === "All"
      ? invoices
      : invoices.filter((inv) => inv.status === filter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "Sent" || i.status === "Draft")
    .reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.amount, 0);

  const counts: Record<string, number> = {
    All: invoices.length,
    Draft: invoices.filter((i) => i.status === "Draft").length,
    Sent: invoices.filter((i) => i.status === "Sent").length,
    Paid: invoices.filter((i) => i.status === "Paid").length,
    Overdue: invoices.filter((i) => i.status === "Overdue").length,
  };

  return (
    <div>
      {/* KPI Cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Total Invoiced"
          value={fmt(totalInvoiced)}
          icon={<FileText size={16} style={{ color: "var(--vyne-purple)" }} />}
          iconBg="rgba(108,71,255,0.08)"
          delta={`${counts.Paid + counts.Sent + counts.Draft + (counts.Overdue ?? 0)} invoices total`}
          deltaUp
        />
        <KpiCard
          label="Paid"
          value={fmt(totalPaid)}
          icon={
            <CheckCircle size={16} style={{ color: "var(--status-success)" }} />
          }
          iconBg="rgba(34,197,94,0.08)"
          delta={`${counts.Paid} invoices`}
          deltaUp
        />
        <KpiCard
          label="Outstanding"
          value={fmt(totalOutstanding)}
          icon={<Clock size={16} style={{ color: "#F59E0B" }} />}
          iconBg="rgba(245,158,11,0.08)"
          delta={`${counts.Draft + counts.Sent} invoices pending`}
          deltaUp={false}
        />
        <KpiCard
          label="Overdue"
          value={fmt(totalOverdue)}
          icon={
            <AlertTriangle
              size={16}
              style={{ color: "var(--status-danger)" }}
            />
          }
          iconBg="rgba(239,68,68,0.08)"
          delta={`${counts.Overdue} invoice${counts.Overdue === 1 ? "" : "s"} overdue`}
          deltaUp={false}
        />
      </div>

      {/* Filters + Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Draft", "Sent", "Paid", "Overdue"] as const).map((f) => (
            <FilterBtn
              key={f}
              label={f}
              active={filter === f}
              count={counts[f]}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={invoices as unknown as Record<string, unknown>[]}
            filename="vyne-invoices"
            columns={[
              { key: "number", header: "Invoice #" },
              { key: "customer", header: "Customer" },
              { key: "date", header: "Date" },
              { key: "dueDate", header: "Due Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Invoice"
            onClick={() => setModal({ type: "create" })}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Invoice #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Due Date"
              sortKey="dueDate"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((inv) => {
            const st = invoiceStatusStyle(inv.status);
            return (
              <TableRow key={inv.id}>
                <Td bold color="var(--vyne-purple)">
                  {inv.number}
                </Td>
                <Td>{inv.customer}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(inv.date)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(inv.dueDate)}</Td>
                <Td bold>{fmtFull(inv.amount)}</Td>
                <Td>
                  <StatusBadge label={inv.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    {inv.status === "Draft" && (
                      <ActionBtn
                        icon={<Send size={12} />}
                        label="Send"
                        onClick={() => sendInvoice(inv.id)}
                        color="#1E40AF"
                      />
                    )}
                    {inv.status === "Sent" && (
                      <ActionBtn
                        icon={<Send size={12} />}
                        label="Resend"
                        onClick={() => {}}
                        color="#1E40AF"
                      />
                    )}
                    {(inv.status === "Sent" || inv.status === "Overdue") && (
                      <ActionBtn
                        icon={<CheckCircle size={12} />}
                        label="Mark Paid"
                        onClick={() => markAsPaid(inv.id)}
                        color="#166534"
                      />
                    )}
                    {(inv.status === "Draft" || inv.status === "Sent") && (
                      <ActionBtn
                        icon={<Edit2 size={12} />}
                        label="Edit"
                        onClick={() => setModal({ type: "edit", invoice: inv })}
                        color="var(--vyne-purple)"
                      />
                    )}
                    <ActionBtn
                      icon={<FileDown size={12} />}
                      label="PDF"
                      onClick={() => handleDownloadPdf(inv)}
                      color="var(--text-secondary)"
                    />
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(inv)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No invoices found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {modal?.type === "create" && (
        <InvoiceModal onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <InvoiceModal existing={modal.invoice} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.number}
          onConfirm={() => {
            deleteInvoice(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Credit Notes ────────────────────────────────────────────
function CreditNotesTab() {
  const { creditNotes, deleteCreditNote } = useInvoicingStore();
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditNote | null>(null);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    creditNotes,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <ExportButton
          data={creditNotes as unknown as Record<string, unknown>[]}
          filename="vyne-credit-notes"
          columns={[
            { key: "number", header: "Credit Note #" },
            { key: "customer", header: "Customer" },
            { key: "originalInvoice", header: "Original Invoice" },
            { key: "amount", header: "Amount" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
        />
        <PrimaryBtn
          icon={<Plus size={13} />}
          label="New Credit Note"
          onClick={() => setShowModal(true)}
        />
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Credit Note #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Original Invoice"
              sortKey="originalInvoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cn) => {
            const st = creditNoteStatusStyle(cn.status);
            return (
              <TableRow key={cn.id}>
                <Td bold color="var(--vyne-purple)">
                  {cn.number}
                </Td>
                <Td>{cn.customer}</Td>
                <Td color="var(--text-secondary)" mono>
                  {cn.originalInvoice}
                </Td>
                <Td bold>{fmtFull(cn.amount)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(cn.date)}</Td>
                <Td>
                  <StatusBadge label={cn.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(cn)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No credit notes found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {showModal && <CreditNoteModal onClose={() => setShowModal(false)} />}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.number}
          onConfirm={() => {
            deleteCreditNote(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Payments ────────────────────────────────────────────────
function PaymentsTab() {
  const { payments, deletePayment } = useInvoicingStore();
  const [methodFilter, setMethodFilter] = useState<"All" | PaymentMethod>(
    "All",
  );
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  const filtered =
    methodFilter === "All"
      ? payments
      : payments.filter((p) => p.method === methodFilter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Bank Transfer", "Credit Card", "Check"] as const).map(
            (m) => (
              <FilterBtn
                key={m}
                label={m}
                active={methodFilter === m}
                onClick={() => setMethodFilter(m)}
              />
            ),
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={payments as unknown as Record<string, unknown>[]}
            filename="vyne-payments"
            columns={[
              { key: "number", header: "Payment #" },
              { key: "customer", header: "Customer" },
              { key: "invoice", header: "Invoice" },
              { key: "amount", header: "Amount" },
              { key: "method", header: "Method" },
              { key: "date", header: "Date" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="Record Payment"
            onClick={() => setShowModal(true)}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Payment #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer"
              sortKey="customer"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Invoice"
              sortKey="invoice"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Method"
              sortKey="method"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const st = paymentStatusStyle(p.status);
            return (
              <TableRow key={p.id}>
                <Td bold color="var(--vyne-purple)">
                  {p.number}
                </Td>
                <Td>{p.customer}</Td>
                <Td color="var(--text-secondary)" mono>
                  {p.invoice}
                </Td>
                <Td bold>{fmtFull(p.amount)}</Td>
                <Td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      background: "rgba(108,71,255,0.06)",
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {p.method}
                  </span>
                </Td>
                <Td color="var(--text-tertiary)">{fmtDate(p.date)}</Td>
                <Td>
                  <StatusBadge label={p.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(p)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No payments found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {showModal && <PaymentModal onClose={() => setShowModal(false)} />}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.number}
          onConfirm={() => {
            deletePayment(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Vendors ─────────────────────────────────────────────────
function VendorsTab() {
  const { vendors, deleteVendor } = useInvoicingStore();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; vendor: Vendor } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()),
  );
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "name",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search vendors..."
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={vendors as unknown as Record<string, unknown>[]}
            filename="vyne-vendors"
            columns={[
              { key: "name", header: "Name" },
              { key: "contact", header: "Contact" },
              { key: "email", header: "Email" },
              { key: "totalPurchased", header: "Total Purchased" },
              { key: "outstanding", header: "Outstanding" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Vendor"
            onClick={() => setModal({ type: "create" })}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Name"
              sortKey="name"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Contact"
              sortKey="contact"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Email"
              sortKey="email"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Total Purchased"
              sortKey="totalPurchased"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Outstanding"
              sortKey="outstanding"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => {
            const st = vendorStatusStyle(v.status);
            return (
              <TableRow key={v.id}>
                <Td bold color="var(--vyne-purple)">
                  {v.name}
                </Td>
                <Td>{v.contact}</Td>
                <Td color="var(--text-secondary)">{v.email}</Td>
                <Td bold>{fmtFull(v.totalPurchased)}</Td>
                <Td
                  bold
                  color={v.outstanding > 0 ? "#991B1B" : "var(--text-primary)"}
                >
                  {v.outstanding > 0 ? fmtFull(v.outstanding) : "--"}
                </Td>
                <Td>
                  <StatusBadge label={v.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <ActionBtn
                      icon={<Edit2 size={12} />}
                      label="Edit"
                      onClick={() => setModal({ type: "edit", vendor: v })}
                      color="var(--vyne-purple)"
                    />
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(v)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No vendors found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {modal?.type === "create" && (
        <VendorModal onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <VendorModal existing={modal.vendor} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.name}
          onConfirm={() => {
            deleteVendor(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Bills ───────────────────────────────────────────────────
function BillsTab() {
  const { bills, markBillPaid, deleteBill } = useInvoicingStore();
  const [filter, setFilter] = useState<"All" | BillStatus>("All");
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; bill: Bill } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const filtered =
    filter === "All" ? bills : bills.filter((b) => b.status === filter);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    filtered,
    "date",
    "desc",
  );

  const totalBilled = bills.reduce((s, b) => s + b.amount, 0);
  const totalBillsPaid = bills
    .filter((b) => b.status === "Paid")
    .reduce((s, b) => s + b.amount, 0);
  const totalBillsOutstanding = bills
    .filter((b) => b.status === "Received" || b.status === "Draft")
    .reduce((s, b) => s + b.amount, 0);
  const totalBillsOverdue = bills
    .filter((b) => b.status === "Overdue")
    .reduce((s, b) => s + b.amount, 0);

  const counts: Record<string, number> = {
    All: bills.length,
    Draft: bills.filter((b) => b.status === "Draft").length,
    Received: bills.filter((b) => b.status === "Received").length,
    Paid: bills.filter((b) => b.status === "Paid").length,
    Overdue: bills.filter((b) => b.status === "Overdue").length,
  };

  return (
    <div>
      {/* KPI Cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Total Billed"
          value={fmt(totalBilled)}
          icon={<FileText size={16} style={{ color: "var(--vyne-purple)" }} />}
          iconBg="rgba(108,71,255,0.08)"
        />
        <KpiCard
          label="Paid"
          value={fmt(totalBillsPaid)}
          icon={
            <CheckCircle size={16} style={{ color: "var(--status-success)" }} />
          }
          iconBg="rgba(34,197,94,0.08)"
        />
        <KpiCard
          label="Outstanding"
          value={fmt(totalBillsOutstanding)}
          icon={<Clock size={16} style={{ color: "#F59E0B" }} />}
          iconBg="rgba(245,158,11,0.08)"
        />
        <KpiCard
          label="Overdue"
          value={fmt(totalBillsOverdue)}
          icon={
            <AlertTriangle
              size={16}
              style={{ color: "var(--status-danger)" }}
            />
          }
          iconBg="rgba(239,68,68,0.08)"
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["All", "Draft", "Received", "Paid", "Overdue"] as const).map(
            (f) => (
              <FilterBtn
                key={f}
                label={f}
                active={filter === f}
                count={counts[f]}
                onClick={() => setFilter(f)}
              />
            ),
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton
            data={bills as unknown as Record<string, unknown>[]}
            filename="vyne-bills"
            columns={[
              { key: "number", header: "Bill #" },
              { key: "vendor", header: "Vendor" },
              { key: "date", header: "Date" },
              { key: "dueDate", header: "Due Date" },
              { key: "amount", header: "Amount" },
              { key: "status", header: "Status" },
            ]}
          />
          <PrimaryBtn
            icon={<Plus size={13} />}
            label="New Bill"
            onClick={() => setModal({ type: "create" })}
          />
        </div>
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Bill #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Vendor"
              sortKey="vendor"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Due Date"
              sortKey="dueDate"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const st = billStatusStyle(b.status);
            return (
              <TableRow key={b.id}>
                <Td bold color="var(--vyne-purple)">
                  {b.number}
                </Td>
                <Td>{b.vendor}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(b.date)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(b.dueDate)}</Td>
                <Td bold>{fmtFull(b.amount)}</Td>
                <Td>
                  <StatusBadge label={b.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    {(b.status === "Received" || b.status === "Overdue") && (
                      <ActionBtn
                        icon={<CheckCircle size={12} />}
                        label="Mark Paid"
                        onClick={() => markBillPaid(b.id)}
                        color="#166534"
                      />
                    )}
                    {(b.status === "Draft" || b.status === "Received") && (
                      <ActionBtn
                        icon={<Edit2 size={12} />}
                        label="Edit"
                        onClick={() => setModal({ type: "edit", bill: b })}
                        color="var(--vyne-purple)"
                      />
                    )}
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(b)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No bills found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {modal?.type === "create" && <BillModal onClose={() => setModal(null)} />}
      {modal?.type === "edit" && (
        <BillModal existing={modal.bill} onClose={() => setModal(null)} />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.number}
          onConfirm={() => {
            deleteBill(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Refunds ─────────────────────────────────────────────────
function RefundsTab() {
  const { refunds, deleteRefund } = useInvoicingStore();
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Refund | null>(null);

  const { sorted, sortKey, sortDir, handleSort } = useSortableData(
    refunds,
    "date",
    "desc",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <ExportButton
          data={refunds as unknown as Record<string, unknown>[]}
          filename="vyne-refunds"
          columns={[
            { key: "number", header: "Refund #" },
            { key: "customerOrVendor", header: "Customer/Vendor" },
            { key: "type", header: "Type" },
            { key: "amount", header: "Amount" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status" },
          ]}
        />
        <PrimaryBtn
          icon={<Plus size={13} />}
          label="New Refund"
          onClick={() => setShowModal(true)}
        />
      </div>

      <TableContainer>
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            <SortHeader
              label="Refund #"
              sortKey="number"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Customer / Vendor"
              sortKey="customerOrVendor"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Type"
              sortKey="type"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Amount"
              sortKey="amount"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Date"
              sortKey="date"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Status"
              sortKey="status"
              currentSort={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th
              style={{
                padding: "9px 16px",
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const st = refundStatusStyle(r.status);
            const typeBg =
              r.type === "Customer Refund"
                ? { bg: "#EFF6FF", color: "#1E40AF" }
                : { bg: "#FFF7ED", color: "#9A3412" };
            return (
              <TableRow key={r.id}>
                <Td bold color="var(--vyne-purple)">
                  {r.number}
                </Td>
                <Td>{r.customerOrVendor}</Td>
                <Td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      background: typeBg.bg,
                      color: typeBg.color,
                    }}
                  >
                    {r.type}
                  </span>
                </Td>
                <Td bold>{fmtFull(r.amount)}</Td>
                <Td color="var(--text-tertiary)">{fmtDate(r.date)}</Td>
                <Td>
                  <StatusBadge label={r.status} bg={st.bg} color={st.color} />
                </Td>
                <Td align="center">
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    <ActionBtn
                      icon={<Trash2 size={12} />}
                      label="Delete"
                      onClick={() => setDeleteTarget(r)}
                      color="#DC2626"
                    />
                  </div>
                </Td>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
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
                No refunds found.
              </td>
            </tr>
          )}
        </tbody>
      </TableContainer>

      {showModal && <RefundModal onClose={() => setShowModal(false)} />}
      {deleteTarget && (
        <ConfirmDeleteDialog
          name={deleteTarget.number}
          onConfirm={() => {
            deleteRefund(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InvoicingPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const { customers, invoices, bills } = useInvoicingStore();

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const totalOutstanding = customers.reduce(
    (s, c) => s + c.outstandingBalance,
    0,
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px 0",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Invoicing
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "2px 0 0",
              }}
            >
              Manage invoices, bills, payments & customers
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                color: "var(--badge-success-text)",
              }}
            >
              Revenue {fmt(totalRevenue)}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(239,68,68,0.1)",
                color: "var(--badge-danger-text)",
              }}
            >
              Outstanding {fmt(totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
          }}
        >
          <TabBtn
            label="Customers"
            active={tab === "customers"}
            onClick={() => setTab("customers")}
          />
          <TabBtn
            label="Invoices"
            active={tab === "invoices"}
            onClick={() => setTab("invoices")}
          />
          <TabBtn
            label="Credit Notes"
            active={tab === "creditNotes"}
            onClick={() => setTab("creditNotes")}
          />
          <TabBtn
            label="Payments"
            active={tab === "payments"}
            onClick={() => setTab("payments")}
          />
          <TabBtn
            label="Vendors"
            active={tab === "vendors"}
            onClick={() => setTab("vendors")}
          />
          <TabBtn
            label="Bills"
            active={tab === "bills"}
            onClick={() => setTab("bills")}
          />
          <TabBtn
            label="Refunds"
            active={tab === "refunds"}
            onClick={() => setTab("refunds")}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 20 }}
      >
        {tab === "customers" && <CustomersTab />}
        {tab === "invoices" && <InvoicesTab />}
        {tab === "creditNotes" && <CreditNotesTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "bills" && <BillsTab />}
        {tab === "refunds" && <RefundsTab />}
      </div>
    </div>
  );
}
