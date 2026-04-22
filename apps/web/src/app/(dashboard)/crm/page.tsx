"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Pencil, ArrowRight } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { erpApi, type ERPCustomer } from "@/lib/api/client";
import { useCRMStore } from "@/lib/stores/crm";
import {
  STAGES,
  MOCK_ACTIVITIES,
  type Stage,
  type Deal,
} from "@/lib/fixtures/crm";
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import { EditableCell } from "@/components/shared/EditableCell";

// ─── API adapter ─────────────────────────────────────────────────
function statusToStage(status: string): Stage {
  if (status === "active") return "Won";
  if (status === "inactive") return "Lost";
  return "Lead";
}

function statusToProbability(status: string): number {
  if (status === "active") return 80;
  if (status === "inactive") return 0;
  return 20;
}

function customerToDeal(c: ERPCustomer): Deal {
  return {
    id: c.id,
    company: c.name,
    contactName: c.name,
    email: c.email ?? "",
    stage: statusToStage(c.status),
    value: c.totalRevenue ?? 0,
    probability: statusToProbability(c.status),
    assignee: "Alex",
    lastActivity: new Date().toISOString(),
    nextAction: "Follow up",
    source: "inbound",
    notes: "",
  };
}

// ─── Helper Functions (no nested ternaries) ───────────────────────
function stageColor(stage: Stage): string {
  const map: Record<Stage, string> = {
    Lead: "var(--text-secondary)",
    Qualified: "var(--status-info)",
    Proposal: "var(--status-warning)",
    Negotiation: "#8B5CF6",
    Won: "var(--status-success)",
    Lost: "var(--status-danger)",
  };
  return map[stage];
}

function stageBg(stage: Stage): string {
  const map: Record<Stage, string> = {
    Lead: "#F4F4F8",
    Qualified: "#EFF6FF",
    Proposal: "#FFFBEB",
    Negotiation: "#F5F3FF",
    Won: "#F0FDF4",
    Lost: "#FEF2F2",
  };
  return map[stage];
}

function priorityFromDays(days: number): "urgent" | "normal" | "cold" {
  if (days > 14) return "cold";
  if (days > 7) return "urgent";
  return "normal";
}

function priorityColor(priority: "urgent" | "normal" | "cold"): string {
  if (priority === "urgent") return "#F97316";
  if (priority === "cold") return "var(--text-tertiary)";
  return "var(--text-primary)";
}

function probabilityColor(prob: number): string {
  if (prob >= 75) return "var(--status-success)";
  if (prob >= 40) return "var(--status-warning)";
  if (prob === 0) return "var(--status-danger)";
  return "var(--status-info)";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function pillBg(isActive: boolean, s: Stage | "All"): string {
  if (!isActive) return "#F4F4F8";
  if (s === "All") return "rgba(108,71,255,0.1)";
  return stageBg(s);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Shared UI ────────────────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-[14px] py-2 border-0 cursor-pointer text-xs font-medium bg-transparent transition-all duration-150",
        "border-b-2",
        active
          ? "border-b-vyne-purple text-vyne-purple"
          : "border-b-transparent text-text-secondary",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StagePill({ stage }: Readonly<{ stage: Stage }>) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: stageBg(stage), color: stageColor(stage) }}
    >
      {stage}
    </span>
  );
}

// ─── Pipeline Tab (Kanban) ────────────────────────────────────────
function PipelineTab({
  deals,
  onDealClick,
  onAddDeal,
}: Readonly<{
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onAddDeal: (stage: Stage) => void;
}>) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
        const color = stageColor(stage);

        return (
          <div
            key={stage}
            className="min-w-[240px] max-w-[240px] shrink-0 flex flex-col gap-2"
          >
            {/* Column header */}
            <div
              className="rounded-[10px] px-3 py-2.5"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-[7px]">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span
                    className="text-xs font-bold text-text-primary"
                  >
                    {stage}
                  </span>
                </div>
                <span
                  className="text-[11px] font-semibold px-[7px] py-px rounded-full bg-[#F4F4F8] text-text-tertiary"
                >
                  {stageDeals.length}
                </span>
              </div>
              <div className="text-xs font-semibold" style={{ color }}>
                {fmt(stageTotal)}
              </div>
            </div>

            {/* Deal cards */}
            <div className="flex flex-col gap-2 flex-1">
              {stageDeals.map((deal) => {
                const days = daysSince(deal.lastActivity);
                const priority = priorityFromDays(days);
                const daysColor = priorityColor(priority);
                const showOrange = priority === "urgent";
                const priorityWeightClass = priority === "normal" ? "font-normal" : "font-semibold";

                return (
                  <button
                    key={deal.id}
                    onClick={() => onDealClick(deal)}
                    className="rounded-[10px] cursor-pointer text-left w-full transition-shadow duration-150"
                    style={{
                      background: "var(--content-bg)",
                      padding: "12px 13px",
                      border: showOrange
                        ? "1px solid rgba(249,115,22,0.3)"
                        : "1px solid var(--content-border)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      className="text-xs font-bold mb-[3px] truncate text-text-primary"
                    >
                      {deal.company}
                    </div>
                    <div
                      className="text-[11px] mb-2 truncate text-text-secondary"
                    >
                      {deal.contactName}
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[13px] font-bold text-text-primary"
                      >
                        {fmt(deal.value)}
                      </span>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: probabilityColor(deal.probability) }}
                      >
                        {deal.probability}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-vyne-purple bg-vyne-purple/[12%]"
                      >
                        {initials(deal.assignee)}
                      </div>
                      <span
                        className={`text-[10px] ${priorityWeightClass}`}
                        style={{ color: daysColor }}
                      >
                        {days}d ago
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add deal button */}
            <button
              onClick={() => onAddDeal(stage)}
              className="w-full py-2 rounded-lg bg-transparent cursor-pointer text-xs flex items-center justify-center gap-[5px] transition-all duration-150"
              style={{
                border: "1px dashed var(--content-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <Plus size={12} /> Add Deal
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Deals Table Tab ──────────────────────────────────────────────
type SortKey = "company" | "value" | "stage" | "lastActivity";
type SortDir = "asc" | "desc";

function DealsTableTab({
  deals,
  onDealClick,
  onMarkWon,
  onMarkLost,
}: Readonly<{
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onMarkWon: (id: string) => void;
  onMarkLost: (id: string) => void;
}>) {
  const updateDeal = useCRMStore((s) => s.updateDeal);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = deals
    .filter((d) => {
      const matchSearch =
        d.company.toLowerCase().includes(search.toLowerCase()) ||
        d.contactName.toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === "All" || d.stage === stageFilter;
      const matchAssignee =
        assigneeFilter === "All" || d.assignee === assigneeFilter;
      return matchSearch && matchStage && matchAssignee;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "company") cmp = a.company.localeCompare(b.company);
      else if (sortKey === "value") cmp = a.value - b.value;
      else if (sortKey === "stage")
        cmp = STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
      else if (sortKey === "lastActivity")
        cmp =
          new Date(a.lastActivity).getTime() -
          new Date(b.lastActivity).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

  function sortArrow(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const thClass =
    "px-[14px] py-[9px] text-left text-[10px] font-semibold uppercase whitespace-nowrap select-none cursor-pointer text-text-secondary tracking-[0.06em]";
  const thNoSortClass =
    "px-[14px] py-[9px] text-left text-[10px] font-semibold uppercase whitespace-nowrap select-none cursor-default text-text-secondary tracking-[0.06em]";

  return (
    <div>
      {/* Filters row */}
      <div className="flex gap-[10px] mb-[14px] items-center flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            aria-label="Search deals"
            className="w-full py-[7px] pr-2.5 pl-[30px] rounded-lg outline-none text-xs box-border"
            style={{
              border: "1px solid var(--input-border)",
              background: "var(--content-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Stage filter pills */}
        <div className="flex gap-[5px] flex-wrap">
          {(["All", ...STAGES] as Array<Stage | "All">).map((s) => {
            const isActive = stageFilter === s;
            const pillColor =
              s === "All" ? "var(--vyne-purple)" : stageColor(s);
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                style={{
                  border: isActive
                    ? `1.5px solid ${pillColor}`
                    : "1.5px solid transparent",
                  background: pillBg(isActive, s),
                  color: isActive ? pillColor : "var(--text-secondary)",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Assignee filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          aria-label="Filter by assignee"
          className="px-2.5 py-1.5 rounded-lg outline-none text-xs cursor-pointer"
          style={{
            border: "1px solid var(--input-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="All">All Assignees</option>
          {ASSIGNEES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-[10px] overflow-hidden"
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--table-header-bg)]">
              <th
                className={thClass}
                onClick={() => toggleSort("company")}
              >
                Company{sortArrow("company")}
              </th>
              <th
                className={thNoSortClass}
              >Contact</th>
              <th
                className={thClass}
                onClick={() => toggleSort("value")}
              >
                Value{sortArrow("value")}
              </th>
              <th
                className={thClass}
                onClick={() => toggleSort("stage")}
              >
                Stage{sortArrow("stage")}
              </th>
              <th
                className={thNoSortClass}
              >Source</th>
              <th
                className={thNoSortClass}
              >Assignee</th>
              <th
                className={thClass}
                onClick={() => toggleSort("lastActivity")}
              >
                Last Activity{sortArrow("lastActivity")}
              </th>
              <th
                className={thNoSortClass}
              >Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => {
              const days = daysSince(deal.lastActivity);
              const priority = priorityFromDays(days);
              const daysColor = priorityColor(priority);
              const priorityWeightClass = priority === "normal" ? "font-normal" : "font-semibold";

              return (
                <tr
                  key={deal.id}
                  className="border-t border-black/[0.05]"
                  onMouseEnter={(ev) => {
                    (ev.currentTarget as HTMLTableRowElement).style.background =
                      "var(--content-secondary)";
                  }}
                  onMouseLeave={(ev) => {
                    (ev.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }}
                >
                  <td className="px-[14px] py-[10px]">
                    <span
                      className="flex items-center gap-1.5 text-xs font-bold text-vyne-purple"
                      title="Click to open · Double-click to edit"
                    >
                      <button
                        type="button"
                        onClick={() => onDealClick(deal)}
                        className="bg-transparent border-0 cursor-pointer p-0 text-left text-vyne-purple"
                        aria-label={`Open ${deal.company}`}
                      >
                        ↗
                      </button>
                      <EditableCell
                        value={deal.company}
                        onSave={(v) => {
                          updateDeal(deal.id, { company: v });
                          toast.success(`Renamed to "${v}"`);
                        }}
                        label="Company"
                        style={{ color: "var(--vyne-purple)", fontWeight: 700 }}
                      />
                    </span>
                  </td>
                  <td
                    className="px-[14px] py-[10px] text-xs text-text-secondary"
                  >
                    <EditableCell
                      value={deal.contactName}
                      onSave={(v) => {
                        updateDeal(deal.id, { contactName: v });
                        toast.success("Contact updated");
                      }}
                      label="Contact name"
                    />
                  </td>
                  <td
                    className="px-[14px] py-[10px] text-xs font-bold whitespace-nowrap text-text-primary"
                  >
                    <EditableCell
                      value={deal.value}
                      onSave={(v) => {
                        const n = Number(v) || 0;
                        updateDeal(deal.id, { value: n });
                        toast.success(`Value updated to ${fmt(n)}`);
                      }}
                      type="number"
                      label="Deal value"
                      validate={(s) => {
                        const n = Number(s);
                        if (!Number.isFinite(n) || n < 0) return "Must be ≥ 0";
                      }}
                      render={(v) => fmt(Number(v))}
                      style={{ fontWeight: 700 }}
                    />
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <EditableCell
                      value={deal.stage}
                      onSave={(v) => {
                        updateDeal(deal.id, { stage: v as Stage });
                        toast.success(`Moved to ${v}`);
                      }}
                      type="select"
                      label="Stage"
                      options={STAGES.map((s) => ({ value: s, label: s }))}
                      render={(v) => <StagePill stage={v as Stage} />}
                    />
                  </td>
                  <td
                    className="px-[14px] py-[10px] text-[11px] capitalize text-text-tertiary"
                  >
                    {deal.source}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-vyne-purple bg-vyne-purple/[12%]"
                      >
                        {initials(deal.assignee)}
                      </div>
                      <span
                        className="text-xs text-text-primary"
                      >
                        {deal.assignee}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`px-[14px] py-[10px] text-[11px] whitespace-nowrap ${priorityWeightClass}`}
                    style={{ color: daysColor }}
                  >
                    {days}d ago
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <div className="flex gap-[5px]">
                      <button
                        onClick={() => onDealClick(deal)}
                        title="Edit"
                        className="px-2 py-1 rounded-md bg-transparent cursor-pointer flex items-center"
                        style={{
                          border: "1px solid var(--content-border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => onMarkWon(deal.id)}
                        title="Mark Won"
                        className="px-2 py-1 rounded-md cursor-pointer flex items-center"
                        style={{
                          border: "1px solid rgba(34,197,94,0.3)",
                          background: "rgba(34,197,94,0.06)",
                          color: "var(--status-success)",
                        }}
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => onMarkLost(deal.id)}
                        title="Mark Lost"
                        className="px-2 py-1 rounded-md cursor-pointer flex items-center"
                        style={{
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.06)",
                          color: "var(--status-danger)",
                        }}
                      >
                        <XCircle size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            className="p-8 text-center text-[13px] text-text-tertiary"
          >
            No deals match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Forecasting Tab ──────────────────────────────────────────────
function ForecastingTab({ deals }: Readonly<{ deals: Deal[] }>) {
  const totalPipeline = deals
    .filter((d) => d.stage !== "Lost")
    .reduce((s, d) => s + d.value, 0);
  const expectedClose = deals
    .filter((d) => d.stage !== "Lost" && d.stage !== "Won")
    .reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const wonDeals = deals.filter((d) => d.stage === "Won");
  const closedDeals = deals.filter(
    (d) => d.stage === "Won" || d.stage === "Lost",
  );
  const winRate =
    closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;

  const stageData = STAGES.filter((s) => s !== "Lost").map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage);
    const total = stageDeals.reduce((s, d) => s + d.value, 0);
    return { stage, total, count: stageDeals.length };
  });

  const maxBarVal = Math.max(...stageData.map((s) => s.total), 1);

  const topDeals = [...deals]
    .filter((d) => d.stage !== "Lost")
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-[14px]">
        {[
          {
            label: "Pipeline Total",
            value: fmt(totalPipeline),
            sub: "active deals excl. lost",
            color: "var(--vyne-purple)",
            bg: "rgba(108,71,255,0.08)",
          },
          {
            label: "Expected Close (This Month)",
            value: fmt(Math.round(expectedClose)),
            sub: "probability-weighted",
            color: "var(--status-warning)",
            bg: "rgba(245,158,11,0.08)",
          },
          {
            label: "Win Rate (90 Days)",
            value: `${winRate.toFixed(0)}%`,
            sub: `${wonDeals.length} won of ${closedDeals.length} closed`,
            color: "var(--status-success)",
            bg: "rgba(34,197,94,0.08)",
          },
        ].map(({ label, value, sub, color, bg }) => (
          <div
            key={label}
            className="rounded-xl px-5 py-[18px]"
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ background: color }}
              />
            </div>
            <div
              className="text-2xl font-bold text-text-primary tracking-[-0.04em]" 
            >
              {value}
            </div>
            <div
              className="text-xs font-semibold mt-1 text-text-primary"
            >
              {label}
            </div>
            <div
              className="text-[11px] mt-0.5 text-text-tertiary"
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-[14px]">
        {/* Bar chart by stage */}
        <div
          className="rounded-xl px-5 py-[18px]"
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
          }}
        >
          <div
            className="text-[13px] font-bold mb-4 text-text-primary"
          >
            Pipeline by Stage
          </div>
          <div className="flex flex-col gap-3">
            {stageData.map(({ stage, total, count }) => {
              const pct = maxBarVal > 0 ? (total / maxBarVal) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between mb-[5px]">
                    <div className="flex items-center gap-[7px]">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: stageColor(stage) }}
                      />
                      <span
                        className="text-xs font-medium text-text-primary"
                      >
                        {stage}
                      </span>
                      <span
                        className="text-[11px] text-text-tertiary"
                      >
                        ({count})
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold text-text-primary"
                    >
                      {fmt(total)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded overflow-hidden bg-[#F0F0F8]"
                  >
                    <div
                      className="h-full rounded transition-[width] duration-[0.6s] ease-in-out"
                      style={{
                        width: `${pct}%`,
                        background: stageColor(stage),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top deals */}
        <div
          className="rounded-xl px-5 py-[18px]"
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
          }}
        >
          <div
            className="text-[13px] font-bold mb-4 text-text-primary"
          >
            Top Deals by Value
          </div>
          <div className="flex flex-col">
            {topDeals.map((deal, i) => (
              <div
                key={deal.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--content-border)" }}
              >
                <span
                  className="text-xs font-bold w-[18px] text-center text-text-tertiary"
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold truncate text-text-primary"
                  >
                    {deal.company}
                  </div>
                  <div
                    className="text-[11px] mt-px text-text-tertiary"
                  >
                    {deal.contactName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-[13px] font-bold text-text-primary"
                  >
                    {fmt(deal.value)}
                  </div>
                  <StagePill stage={deal.stage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
function CRMPageInner() {
  const router = useRouter();
  const deals = useCRMStore((s) => s.deals);
  const setDeals = useCRMStore((s) => s.setDeals);
  const updateDealInStore = useCRMStore((s) => s.updateDeal);
  const detail = useDetailParam();
  const selectedDeal = detail.id ? deals.find((d) => d.id === detail.id) : undefined;

  const [tab, setTab] = useState<"pipeline" | "table" | "forecasting">(
    "pipeline",
  );

  useEffect(() => {
    erpApi
      .listCustomers()
      .then((r) => {
        if (r.data?.length) {
          setDeals(r.data.map(customerToDeal));
        }
      })
      .catch(() => {});
  }, [setDeals]);

  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function openDeal(deal: Deal) {
    detail.open(deal.id);
  }

  function handleMarkWon(id: string) {
    updateDealInStore(id, { stage: "Won", probability: 100 });
    const deal = deals.find((d) => d.id === id);
    showToast(`Marked Won: ${deal?.company ?? ""}`);
  }

  function handleMarkLost(id: string) {
    updateDealInStore(id, { stage: "Lost", probability: 0 });
    const deal = deals.find((d) => d.id === id);
    showToast(`Marked Lost: ${deal?.company ?? ""}`);
  }

  const totalPipeline = deals
    .filter((d) => d.stage !== "Lost")
    .reduce((s, d) => s + d.value, 0);
  const activeCount = deals.filter(
    (d) => d.stage !== "Won" && d.stage !== "Lost",
  ).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0"
        style={{
          padding: "14px 20px 0",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1
              className="text-base font-bold m-0 text-text-primary"
            >
              CRM Pipeline
            </h1>
            <p
              className="text-xs mt-0.5 mb-0 text-text-tertiary"
            >
              {activeCount} active deals · {fmt(totalPipeline)} pipeline
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span
              className="text-[11px] px-2 py-[3px] rounded-full bg-status-success/10 text-[var(--badge-success-text)]"
              
            >
              {deals.filter((d) => d.stage === "Won").length} won
            </span>
            <span
              className="text-[11px] px-2 py-[3px] rounded-full bg-status-danger/10 text-[var(--badge-danger-text)]"
              
            >
              {deals.filter((d) => d.stage === "Lost").length} lost
            </span>
            <ExportButton
              data={deals as unknown as Record<string, unknown>[]}
              filename="vyne-deals"
              columns={[
                { key: "company", header: "Company" },
                { key: "contactName", header: "Contact" },
                { key: "email", header: "Email" },
                { key: "stage", header: "Stage" },
                { key: "value", header: "Value" },
                { key: "probability", header: "Probability %" },
                { key: "assignee", header: "Assignee" },
                { key: "source", header: "Source" },
                { key: "nextAction", header: "Next Action" },
              ]}
            />
            <Link
              href="/crm/deals/new"
              className="flex items-center gap-1.5 px-[14px] py-[7px] rounded-lg border-0 text-white cursor-pointer text-xs font-semibold bg-vyne-purple"
            >
              <Plus size={13} /> Add Deal
            </Link>
          </div>
        </div>
        <div className="flex gap-0.5">
          <TabBtn
            label="Pipeline"
            active={tab === "pipeline"}
            onClick={() => setTab("pipeline")}
          />
          <TabBtn
            label="Deals Table"
            active={tab === "table"}
            onClick={() => setTab("table")}
          />
          <TabBtn
            label="Forecasting"
            active={tab === "forecasting"}
            onClick={() => setTab("forecasting")}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll flex-1 p-5"
        style={{
          overflowY: tab === "pipeline" ? "hidden" : "auto",
          overflowX: tab === "pipeline" ? "auto" : "hidden",
        }}
      >
        {tab === "pipeline" && (
          <PipelineTab
            deals={deals}
            onDealClick={openDeal}
            onAddDeal={(stage) => router.push(`/crm/deals/new?stage=${stage}`)}
          />
        )}
        {tab === "table" && (
          <DealsTableTab
            deals={deals}
            onDealClick={openDeal}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
          />
        )}
        {tab === "forecasting" && <ForecastingTab deals={deals} />}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-7 left-1/2 -translate-x-1/2 text-white px-[18px] py-2.5 rounded-[10px] text-[13px] font-medium z-[400] whitespace-nowrap pointer-events-none"
          style={{
            background: "var(--text-primary)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Slide-in detail panel */}
      <DealDetailPanel deal={selectedDeal} onClose={detail.close} />
    </div>
  );
}

export default function CRMPage() {
  return (
    <Suspense fallback={null}>
      <CRMPageInner />
    </Suspense>
  );
}

// ─── Slide-in detail panel ────────────────────────────────────────

function stageBgDetail(stage: string): string {
  const map: Record<string, string> = {
    Lead: "rgba(148,144,184,0.15)",
    Qualified: "rgba(59,130,246,0.15)",
    Proposal: "rgba(245,158,11,0.15)",
    Negotiation: "rgba(139,92,246,0.15)",
    Won: "rgba(34,197,94,0.15)",
    Lost: "rgba(239,68,68,0.15)",
  };
  return map[stage] ?? "rgba(148,144,184,0.15)";
}
function stageColorDetail(stage: string): string {
  const map: Record<string, string> = {
    Lead: "var(--text-secondary)",
    Qualified: "var(--status-info)",
    Proposal: "var(--status-warning)",
    Negotiation: "#8B5CF6",
    Won: "var(--status-success)",
    Lost: "var(--status-danger)",
  };
  return map[stage] ?? "var(--text-secondary)";
}

function DealDetailPanel({
  deal,
  onClose,
}: {
  deal: Deal | undefined;
  onClose: () => void;
}) {
  const weighted = deal ? Math.round((deal.value * deal.probability) / 100) : 0;

  return (
    <DetailPanel
      open={!!deal}
      onClose={onClose}
      title={deal?.company ?? ""}
      subtitle={
        deal
          ? `${deal.contactName}${deal.email ? ` · ${deal.email}` : ""}`
          : undefined
      }
      fullPageHref={deal ? `/crm/deals/${deal.id}` : undefined}
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
              background: stageBgDetail(deal.stage),
              color: stageColorDetail(deal.stage),
            }}
          >
            {deal.stage}
          </span>
        )
      }
      headerActions={
        deal && (
          <Link
            href={`/crm/deals/${deal.id}/edit`}
            title="Edit deal"
            aria-label="Edit deal"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pencil size={14} />
          </Link>
        )
      }
    >
      {!deal ? null : (
        <>
          <DetailSection title="Deal value">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
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
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 4 }}>
                  {deal.probability}% probability
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="text-aurora"
                  style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}
                >
                  ${weighted.toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Weighted
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Details">
            <DetailRow label="Contact" value={deal.contactName} />
            <DetailRow label="Email" value={deal.email || "—"} mono={!!deal.email} />
            <DetailRow label="Source" value={deal.source} />
            <DetailRow label="Assignee" value={deal.assignee} />
            {deal.nextAction && <DetailRow label="Next action" value={deal.nextAction} />}
            <DetailRow
              label="Last activity"
              value={new Date(deal.lastActivity).toLocaleDateString()}
            />
          </DetailSection>

          {deal.notes && (
            <DetailSection title="Notes">
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {deal.notes}
              </p>
            </DetailSection>
          )}

          <Link
            href={`/crm/deals/${deal.id}`}
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 10,
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid var(--content-border)",
              letterSpacing: "-0.005em",
            }}
          >
            Open full deal page
            <ArrowRight size={13} />
          </Link>
        </>
      )}
    </DetailPanel>
  );
}
