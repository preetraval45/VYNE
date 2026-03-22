"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { erpApi, type ERPJournalEntry } from "@/lib/api/client";
import {
  MONTHS,
  MOCK_MONTHLY,
  MOCK_JOURNAL,
  MOCK_ACCOUNTS,
} from "@/lib/fixtures/finance";
import { ExportButton } from "@/components/shared/ExportButton";

// ─── Helpers ──────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

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
        borderBottom: active ? "2px solid #6C47FF" : "2px solid transparent",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Bar chart (CSS-only) ─────────────────────────────────────────
function BarChart({
  data,
}: Readonly<{
  data: Array<{ month: string; revenue: number; expenses: number }>;
}>) {
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        height: 140,
        padding: "0 4px",
      }}
    >
      {data.map((d) => (
        <div
          key={d.month}
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
              display: "flex",
              gap: 3,
              alignItems: "flex-end",
              height: 120,
              width: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                background: "var(--vyne-purple)",
                borderRadius: "3px 3px 0 0",
                height: `${(d.revenue / maxVal) * 100}%`,
                opacity: 0.85,
              }}
              title={`Revenue: ${fmt(d.revenue)}`}
            />
            <div
              style={{
                flex: 1,
                background: "var(--status-danger)",
                borderRadius: "3px 3px 0 0",
                height: `${(d.expenses / maxVal) * 100}%`,
                opacity: 0.7,
              }}
              title={`Expenses: ${fmt(d.expenses)}`}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {d.month}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── P&L tab ──────────────────────────────────────────────────────
function PLTab() {
  const current = MOCK_MONTHLY[MOCK_MONTHLY.length - 1];
  const prev = MOCK_MONTHLY[MOCK_MONTHLY.length - 2];
  const profit = current.revenue - current.expenses;
  const prevProfit = prev.revenue - prev.expenses;
  const profitDelta = ((profit - prevProfit) / prevProfit) * 100;
  const margin = (profit / current.revenue) * 100;

  const rows = [
    { label: "Revenue", value: current.revenue, bold: true, indent: 0 },
    { label: "Cost of Goods Sold", value: -43200, indent: 1 },
    {
      label: "Gross Profit",
      value: current.revenue - 43200,
      bold: true,
      indent: 0,
    },
    { label: "Operating Expenses", value: -24100, indent: 1 },
    {
      label: "EBITDA",
      value: current.revenue - 43200 - 24100,
      bold: true,
      indent: 0,
    },
    { label: "Depreciation & Amortization", value: -0, indent: 1 },
    {
      label: "Net Profit",
      value: profit,
      bold: true,
      indent: 0,
      highlight: true,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr minmax(0, 320px)",
        gap: 16,
      }}
    >
      {/* P&L Statement */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Profit & Loss — March 2026
          </span>
          <button
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <FileText size={12} /> Export
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(({ label, value, bold, indent, highlight }) => (
              <tr
                key={label}
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.04)",
                  background: highlight
                    ? value >= 0
                      ? "#F0FDF4"
                      : "#FEF2F2"
                    : "transparent",
                }}
              >
                <td
                  style={{
                    padding: "10px 18px",
                    fontSize: 12,
                    color: bold
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontWeight: bold ? 600 : 400,
                    paddingLeft: 18 + indent * 20,
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "10px 18px",
                    fontSize: 12,
                    fontWeight: bold ? 700 : 400,
                    textAlign: "right",
                    color:
                      value < 0
                        ? "var(--status-danger)"
                        : highlight
                          ? "#166534"
                          : "var(--text-primary)",
                  }}
                >
                  {value < 0 ? `-${fmt(Math.abs(value))}` : fmt(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KPI sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          {
            label: "Net Profit",
            value: fmt(profit),
            delta: `${profitDelta >= 0 ? "+" : ""}${profitDelta.toFixed(1)}% vs last month`,
            up: profitDelta >= 0,
            icon: (
              <DollarSign
                size={16}
                style={{ color: "var(--status-success)" }}
              />
            ),
            bg: "rgba(34,197,94,0.08)",
          },
          {
            label: "Profit Margin",
            value: `${margin.toFixed(1)}%`,
            delta: "of revenue",
            up: true,
            icon: (
              <TrendingUp size={16} style={{ color: "var(--vyne-purple)" }} />
            ),
            bg: "rgba(108,71,255,0.08)",
          },
          {
            label: "Total Expenses",
            value: fmt(current.expenses),
            delta: "this month",
            up: false,
            icon: (
              <TrendingDown
                size={16}
                style={{ color: "var(--status-danger)" }}
              />
            ),
            bg: "rgba(239,68,68,0.08)",
          },
        ].map(({ label, value, delta, up, icon, bg }) => (
          <div
            key={label}
            style={{
              background: "var(--content-bg)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: bg,
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
            <div
              style={{
                fontSize: 10,
                color: up ? "var(--status-success)" : "var(--status-danger)",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />} {delta}
            </div>
          </div>
        ))}

        {/* Mini chart */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 12,
            }}
          >
            6-Month Trend
          </div>
          <BarChart data={MOCK_MONTHLY} />
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "var(--vyne-purple)",
                }}
              />{" "}
              Revenue
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "var(--status-danger)",
                }}
              />{" "}
              Expenses
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Journal Entries tab ──────────────────────────────────────────
function JournalTab() {
  const [entries, setEntries] = useState<ERPJournalEntry[]>(MOCK_JOURNAL);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ description: "", totalDebits: "" });

  useEffect(() => {
    erpApi
      .listJournalEntries()
      .then((r) => setEntries(r.data))
      .catch(() => {});
  }, []);

  function createEntry() {
    const entry: ERPJournalEntry = {
      id: `j${Date.now()}`,
      entryNumber: `JE-${String(entries.length + 1).padStart(3, "0")}`,
      description: form.description,
      postingDate: new Date().toISOString(),
      status: "draft",
      totalDebits: Number.parseFloat(form.totalDebits) || 0,
    };
    setEntries([entry, ...entries]);
    setNewOpen(false);
    setForm({ description: "", totalDebits: "" });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setNewOpen(true)}
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
          }}
        >
          <Plus size={13} /> New Entry
        </button>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7F7FB" }}>
              {["Entry #", "Description", "Date", "Amount (Dr)", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 16px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
                onMouseEnter={(ev) => {
                  (ev.currentTarget as HTMLTableRowElement).style.background =
                    "#FAFAFE";
                }}
                onMouseLeave={(ev) => {
                  (ev.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td
                  style={{
                    padding: "10px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--vyne-purple)",
                  }}
                >
                  {e.entryNumber}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                >
                  {e.description}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {new Date(e.postingDate).toLocaleDateString()}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {fmt(e.totalDebits)}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      background: e.status === "posted" ? "#F0FDF4" : "#FFFBEB",
                      color: e.status === "posted" ? "#166534" : "#92400E",
                    }}
                  >
                    {e.status === "posted" ? "Posted" : "Draft"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "var(--content-bg)",
              borderRadius: 12,
              width: 420,
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                New Journal Entry
              </span>
              <button
                onClick={() => setNewOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="je-desc"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Description
              </label>
              <input
                id="je-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Sales revenue batch"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #D8D8E8",
                  borderRadius: 8,
                  background: "#FAFAFE",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="je-amount"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Total Debits ($)
              </label>
              <input
                id="je-amount"
                type="number"
                value={form.totalDebits}
                onChange={(e) =>
                  setForm({ ...form, totalDebits: e.target.value })
                }
                placeholder="10000"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #D8D8E8",
                  borderRadius: 8,
                  background: "#FAFAFE",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setNewOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #D8D8E8",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={createEntry}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Create Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chart of Accounts tab ────────────────────────────────────────
function AccountsTab() {
  const groups = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
  const typeColor: Record<string, string> = {
    Asset: "var(--status-info)",
    Liability: "var(--status-danger)",
    Equity: "#8B5CF6",
    Revenue: "var(--status-success)",
    Expense: "var(--status-warning)",
  };

  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {groups.map((group) => {
        const accts = MOCK_ACCOUNTS.filter((a) => a.type === group);
        const total = accts.reduce((s, a) => s + a.balance, 0);
        return (
          <div key={group}>
            <div
              style={{
                padding: "10px 16px",
                background: "#F7F7FB",
                borderTop: "1px solid rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: typeColor[group],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {group}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {fmt(total)}
              </span>
            </div>
            {accts.map((a) => (
              <div
                key={a.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 16px 9px 32px",
                  borderTop: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "var(--text-tertiary)",
                    width: 48,
                    flexShrink: 0,
                  }}
                >
                  {a.code}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                  }}
                >
                  {a.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {fmt(a.balance)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<"pl" | "journal" | "accounts">("pl");

  const now = new Date();
  const currentMonth = MOCK_MONTHLY[MOCK_MONTHLY.length - 1];
  const profit = currentMonth.revenue - currentMonth.expenses;

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
          borderBottom: "1px solid rgba(0,0,0,0.08)",
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
              Finance
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                margin: "2px 0 0",
              }}
            >
              {MONTHS[now.getMonth()]} {now.getFullYear()} · Profit:{" "}
              {fmt(profit)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                color: "#166534",
              }}
            >
              Revenue {fmt(currentMonth.revenue)}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 20,
                background: "rgba(239,68,68,0.1)",
                color: "#991B1B",
              }}
            >
              Expenses {fmt(currentMonth.expenses)}
            </span>
            <ExportButton
              data={MOCK_JOURNAL as unknown as Record<string, unknown>[]}
              filename="vyne-journal-entries"
              columns={[
                { key: "entryNumber", header: "Entry #" },
                { key: "description", header: "Description" },
                { key: "postingDate", header: "Posting Date" },
                { key: "status", header: "Status" },
                { key: "totalDebits", header: "Total Debits" },
              ]}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <TabBtn
            label="P&L Statement"
            active={tab === "pl"}
            onClick={() => setTab("pl")}
          />
          <TabBtn
            label="Journal Entries"
            active={tab === "journal"}
            onClick={() => setTab("journal")}
          />
          <TabBtn
            label="Chart of Accounts"
            active={tab === "accounts"}
            onClick={() => setTab("accounts")}
          />
        </div>
      </div>

      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 20 }}
      >
        {tab === "pl" && <PLTab />}
        {tab === "journal" && <JournalTab />}
        {tab === "accounts" && <AccountsTab />}
      </div>
    </div>
  );
}
