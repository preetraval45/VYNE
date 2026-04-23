"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Plus,
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
import { useFinanceStore } from "@/lib/stores/finance";
import { ExportButton } from "@/components/shared/ExportButton";
import { PageHeader, Pill } from "@/components/shared/Kit";

// ─── Helpers ──────────────────────────────────────────────────────
const CURRENCY = typeof Intl !== "undefined"
  ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  : null;

function fmt(n: number) {
  if (n >= 1_000_000) return `${CURRENCY?.format(0).replace(/[0-9.,\s]/g, "") ?? "$"}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${CURRENCY?.format(0).replace(/[0-9.,\s]/g, "") ?? "$"}${(n / 1_000).toFixed(1)}K`;
  return CURRENCY ? CURRENCY.format(n) : `$${n.toLocaleString()}`;
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
        borderBottom: active ? "2px solid #06B6D4" : "2px solid transparent",
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
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--content-border)",
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
              border: "1px solid var(--content-border)",
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
                  borderTop: "1px solid var(--content-border)",
                  background: highlight
                    ? value >= 0
                      ? "var(--badge-success-bg)"
                      : "var(--badge-danger-bg)"
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
                          ? "var(--badge-success-text)"
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
            bg: "rgba(6, 182, 212,0.08)",
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
              border: "1px solid var(--content-border)",
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
            border: "1px solid var(--content-border)",
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
  const entries = useFinanceStore((s) => s.journalEntries);
  const setEntries = useFinanceStore((s) => s.setJournalEntries);

  useEffect(() => {
    erpApi
      .listJournalEntries()
      .then((r) => {
        if (r.data?.length) setEntries(r.data);
      })
      .catch(() => {});
  }, [setEntries]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <Link
          href="/finance/journal/new"
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
        </Link>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
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
                style={{ borderTop: "1px solid var(--content-border)" }}
                onMouseEnter={(ev) => {
                  (ev.currentTarget as HTMLTableRowElement).style.background =
                    "var(--content-secondary)";
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
                      background: e.status === "posted" ? "var(--badge-success-bg)" : "var(--badge-warning-bg)",
                      color: e.status === "posted" ? "var(--badge-success-text)" : "var(--badge-warning-text)",
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
        border: "1px solid var(--content-border)",
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
                background: "var(--table-header-bg)",
                borderTop: "1px solid var(--content-border)",
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
                  borderTop: "1px solid var(--content-border)",
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
  const [liveSummary, setLiveSummary] = useState<{
    revenue: number;
    expenses: number;
  } | null>(null);

  const now = new Date();

  useEffect(() => {
    erpApi
      .getFinanceSummary(now.getFullYear(), now.getMonth() + 1)
      .then((r) => {
        if (r.data) {
          setLiveSummary({
            revenue: r.data.revenue,
            expenses: r.data.expenses,
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallback = MOCK_MONTHLY[MOCK_MONTHLY.length - 1];
  const currentMonth = liveSummary ?? fallback;
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
      <PageHeader
        icon={<DollarSign size={16} />}
        title="Finance"
        subtitle={`${MONTHS[now.getMonth()]} ${now.getFullYear()} · Profit ${fmt(profit)}`}
        actions={
          <>
            <Pill tone="success" dot>Revenue {fmt(currentMonth.revenue)}</Pill>
            <Pill tone="danger" dot>Expenses {fmt(currentMonth.expenses)}</Pill>
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
          </>
        }
      />
      <div
        style={{
          padding: "8px 20px 0",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
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
