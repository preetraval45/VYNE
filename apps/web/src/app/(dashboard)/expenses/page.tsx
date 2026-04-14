"use client";

import { useState } from "react";
import {
  MOCK_EXPENSES,
  CATEGORY_LIMITS,
  type Expense,
  type ExpenseStatus,
  type ExpenseCategory,
} from "@/lib/fixtures/expenses";

// ── Helpers ───────────────────────────────────────────────────────
function statusConfig(s: ExpenseStatus): {
  label: string;
  bg: string;
  color: string;
} {
  const map: Record<
    ExpenseStatus,
    { label: string; bg: string; color: string }
  > = {
    draft: { label: "Draft", bg: "#F0F0F8", color: "var(--text-secondary)" },
    submitted: { label: "Submitted", bg: "#EFF6FF", color: "#1E40AF" },
    approved: { label: "Approved", bg: "#F0FDF4", color: "var(--badge-success-text)" },
    rejected: { label: "Rejected", bg: "#FEF2F2", color: "var(--badge-danger-text)" },
    paid: { label: "Paid", bg: "#F5F3FF", color: "#5B21B6" },
  };
  return map[s];
}

function categoryIcon(c: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    travel: "✈",
    meals: "🍽",
    software: "💻",
    office: "🏢",
    other: "📦",
  };
  return map[c];
}

function categoryLabel(c: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    travel: "Travel",
    meals: "Meals & Entertainment",
    software: "Software",
    office: "Office",
    other: "Other",
  };
  return map[c];
}

function fmt(n: number) {
  return `$${n.toLocaleString()}`;
}

function isOverLimit(e: Expense): boolean {
  return e.amount > CATEGORY_LIMITS[e.category];
}

// ── Shared UI ─────────────────────────────────────────────────────
function StatusBadge({ status }: Readonly<{ status: ExpenseStatus }>) {
  const s = statusConfig(status);
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

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
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? "var(--vyne-purple)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        border: "none",
        cursor: "pointer",
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
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: 10,
            background: active ? "rgba(255,255,255,0.25)" : "#F0F0F8",
            color: active ? "#fff" : "var(--text-secondary)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: Readonly<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          borderRadius: 12,
          padding: 24,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
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
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

// ── My Expenses Tab ───────────────────────────────────────────────
function MyExpensesTab({
  expenses,
  onAdd,
  onSubmit,
}: Readonly<{
  expenses: Expense[];
  onAdd: (e: Omit<Expense, "id">) => void;
  onSubmit: (id: string) => void;
}>) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "travel" as ExpenseCategory,
    description: "",
    amount: "",
    currency: "USD",
  });

  const mine = expenses.filter((e) => e.submittedBy === "Preet Raval");
  const pending = mine
    .filter((e) => e.status === "submitted")
    .reduce((s, e) => s + e.amount, 0);
  const approvedThisMonth = mine
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);
  const rejected = mine.filter((e) => e.status === "rejected").length;

  function handleSave() {
    if (!form.description || !form.amount) return;
    onAdd({
      date: form.date,
      category: form.category,
      description: form.description,
      amount: Number.parseFloat(form.amount),
      currency: form.currency,
      submittedBy: "Preet Raval",
      status: "draft",
    });
    setShowModal(false);
    setForm({
      date: new Date().toISOString().split("T")[0],
      category: "travel",
      description: "",
      amount: "",
      currency: "USD",
    });
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Pending Approval",
            value: fmt(pending),
            color: "var(--status-warning)",
          },
          {
            label: "Approved This Month",
            value: fmt(approvedThisMonth),
            color: "var(--status-success)",
          },
          {
            label: "Rejected",
            value: String(rejected),
            color: "var(--status-danger)",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "var(--table-header-bg)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
              }}
            >
              {value}
            </div>
            <div
              style={{
                height: 3,
                background: color,
                borderRadius: 2,
                width: "40%",
                marginTop: 6,
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "8px 16px",
            background: "var(--vyne-purple)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + New Expense
        </button>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Date",
                "Category",
                "Description",
                "Amount",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    borderBottom: "1px solid var(--content-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mine.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {e.date}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span>{categoryIcon(e.category)}</span>
                    {categoryLabel(e.category)}
                  </span>
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    maxWidth: 260,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {e.description}
                    </span>
                    {isOverLimit(e) && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#B91C1C",
                          background: "rgba(239,68,68,0.1)",
                          padding: "1px 5px",
                          borderRadius: 4,
                        }}
                      >
                        OVER LIMIT
                      </span>
                    )}
                  </div>
                  {e.note && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--status-danger)",
                        marginTop: 2,
                      }}
                    >
                      {e.note}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {fmt(e.amount)}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <StatusBadge status={e.status} />
                </td>
                <td style={{ padding: "11px 16px" }}>
                  {e.status === "draft" && (
                    <button
                      onClick={() => onSubmit(e.id)}
                      style={{
                        fontSize: 12,
                        color: "var(--vyne-purple)",
                        background: "none",
                        border: "1px solid var(--vyne-purple)",
                        borderRadius: 6,
                        padding: "3px 8px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Submit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New Expense" onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="exp-date"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              style={inputStyle}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="exp-category"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              Category
            </label>
            <select
              id="exp-category"
              style={inputStyle}
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as ExpenseCategory,
                }))
              }
            >
              <option value="travel">✈ Travel</option>
              <option value="meals">🍽 Meals & Entertainment</option>
              <option value="software">💻 Software</option>
              <option value="office">🏢 Office</option>
              <option value="other">📦 Other</option>
            </select>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              Policy limit: {fmt(CATEGORY_LIMITS[form.category])}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="exp-desc"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              Description
            </label>
            <input
              id="exp-desc"
              style={inputStyle}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What was this expense for?"
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label
                htmlFor="exp-amount"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                Amount
              </label>
              <input
                id="exp-amount"
                type="number"
                style={inputStyle}
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label
                htmlFor="exp-currency"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                Currency
              </label>
              <select
                id="exp-currency"
                style={inputStyle}
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>INR</option>
              </select>
            </div>
          </div>
          {form.amount &&
            Number.parseFloat(form.amount) > CATEGORY_LIMITS[form.category] && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  fontSize: 12,
                  color: "#B91C1C",
                  marginBottom: 14,
                }}
              >
                ⚠ Amount exceeds policy limit of{" "}
                {fmt(CATEGORY_LIMITS[form.category])} for{" "}
                {categoryLabel(form.category)}. Manager approval required.
              </div>
            )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                fontSize: 13,
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.description || !form.amount}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--vyne-purple)",
                color: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                opacity: form.description && form.amount ? 1 : 0.6,
              }}
            >
              Save Draft
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────
function ApprovalsTab({
  expenses,
  onApprove,
  onReject,
}: Readonly<{
  expenses: Expense[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}>) {
  const pending = expenses.filter((e) => e.status === "submitted");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {pending.length} pending approval · total{" "}
          {fmt(pending.reduce((s, e) => s + e.amount, 0))}
        </span>
        {selected.size > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                selected.forEach((id) => onApprove(id));
                setSelected(new Set());
              }}
              style={{
                padding: "6px 14px",
                background: "var(--status-success)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Approve {selected.size} selected
            </button>
            <button
              onClick={() => {
                selected.forEach((id) => onReject(id));
                setSelected(new Set());
              }}
              style={{
                padding: "6px 14px",
                background: "var(--status-danger)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reject {selected.size} selected
            </button>
          </div>
        )}
      </div>

      {pending.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          All caught up — no pending approvals
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((e) => (
          <div
            key={e.id}
            style={{
              background: "var(--content-bg)",
              border: isOverLimit(e)
                ? "1px solid rgba(239,68,68,0.3)"
                : "1px solid var(--content-border)",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(e.id)}
              onChange={() => toggleSelect(e.id)}
              style={{
                accentColor: "#6C47FF",
                width: 15,
                height: 15,
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6C47FF,#9B59B6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {e.submittedBy
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {e.submittedBy}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {categoryIcon(e.category)} {categoryLabel(e.category)}
                </span>
                {isOverLimit(e) && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#B91C1C",
                      background: "rgba(239,68,68,0.1)",
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    OVER LIMIT
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {e.description}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {e.date}
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                minWidth: 80,
                textAlign: "right",
              }}
            >
              {fmt(e.amount)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onApprove(e.id)}
                style={{
                  padding: "6px 14px",
                  background: "var(--status-success)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>
              <button
                onClick={() => onReject(e.id)}
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  color: "var(--status-danger)",
                  border: "1px solid var(--status-danger)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────
function ReportsTab({ expenses }: Readonly<{ expenses: Expense[] }>) {
  const categories: ExpenseCategory[] = [
    "travel",
    "meals",
    "software",
    "office",
    "other",
  ];
  const totals = categories.map((c) => ({
    category: c,
    total: expenses
      .filter((e) => e.category === c && e.status !== "rejected")
      .reduce((s, e) => s + e.amount, 0),
  }));
  const maxTotal = Math.max(...totals.map((t) => t.total), 1);
  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  const monthly = [
    { month: "Oct", amount: 1840 },
    { month: "Nov", amount: 2340 },
    { month: "Dec", amount: 3100 },
    { month: "Jan", amount: 1980 },
    { month: "Feb", amount: 2560 },
    { month: "Mar", amount: grandTotal },
  ];
  const maxMonthly = Math.max(...monthly.map((m) => m.amount), 1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* By category */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Spend by Category
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {totals
            .sort((a, b) => b.total - a.total)
            .map(({ category, total }) => (
              <div key={category}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
                    {categoryIcon(category)} {categoryLabel(category)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmt(total)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--content-secondary)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(total / maxTotal) * 100}%`,
                      background: "var(--vyne-purple)",
                      borderRadius: 4,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid var(--content-border)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Total this period
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {fmt(grandTotal)}
          </span>
        </div>
      </div>

      {/* Monthly trend */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Monthly Trend
          </span>
          <button
            style={{
              fontSize: 12,
              color: "var(--vyne-purple)",
              background: "none",
              border: "1px solid rgba(108,71,255,0.3)",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Export CSV
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 120,
          }}
        >
          {monthly.map(({ month, amount }) => (
            <div
              key={month}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {fmt(amount).replace("$", "")}
              </div>
              <div
                style={{
                  width: "100%",
                  background:
                    month === "Mar"
                      ? "var(--vyne-purple)"
                      : "rgba(108,71,255,0.2)",
                  borderRadius: "4px 4px 0 0",
                  height: `${(amount / maxMonthly) * 90}px`,
                  transition: "height 0.4s",
                }}
              />
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {month}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Policies */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "18px 20px",
          gridColumn: "span 2",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Policy Limits
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 10,
          }}
        >
          {categories.map((c) => {
            const spent = totals.find((t) => t.category === c)?.total ?? 0;
            const limit = CATEGORY_LIMITS[c];
            const pct = Math.min((spent / limit) * 100, 100);
            const overBudget = spent > limit;
            return (
              <div
                key={c}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${overBudget ? "rgba(239,68,68,0.3)" : "var(--content-border)"}`,
                  background: overBudget ? "rgba(239,68,68,0.04)" : "var(--content-secondary)",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>
                  {categoryIcon(c)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {categoryLabel(c)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: overBudget
                      ? "var(--status-danger)"
                      : "var(--status-success)",
                    marginBottom: 6,
                  }}
                >
                  {fmt(spent)} / {fmt(limit)}
                </div>
                <div
                  style={{
                    height: 4,
                    background: "var(--content-border)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: overBudget
                        ? "var(--status-danger)"
                        : "var(--status-success)",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [tab, setTab] = useState<"mine" | "approvals" | "reports">("mine");
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);

  const pendingCount = expenses.filter((e) => e.status === "submitted").length;

  function handleAdd(e: Omit<Expense, "id">) {
    setExpenses((prev) => [{ ...e, id: `exp-${Date.now()}` }, ...prev]);
  }

  function handleSubmit(id: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "submitted" } : e)),
    );
  }

  function handleApprove(id: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "approved" } : e)),
    );
  }

  function handleReject(id: string) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "rejected" } : e)),
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--content-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Expense Reports
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              margin: "2px 0 0",
            }}
          >
            Submit, approve, and track company expenses
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pendingCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(245,158,11,0.1)",
                color: "var(--badge-warning-text)",
              }}
            >
              {pendingCount} pending approval
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <TabBtn
          label="My Expenses"
          active={tab === "mine"}
          onClick={() => setTab("mine")}
        />
        <TabBtn
          label="Approvals"
          active={tab === "approvals"}
          onClick={() => setTab("approvals")}
          count={pendingCount}
        />
        <TabBtn
          label="Reports"
          active={tab === "reports"}
          onClick={() => setTab("reports")}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "mine" && (
          <MyExpensesTab
            expenses={expenses}
            onAdd={handleAdd}
            onSubmit={handleSubmit}
          />
        )}
        {tab === "approvals" && (
          <ApprovalsTab
            expenses={expenses}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {tab === "reports" && <ReportsTab expenses={expenses} />}
      </div>
    </div>
  );
}
