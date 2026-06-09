"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CRMDashboardView } from "@/components/crm/CRMDashboardView";
import { useSearchIndex } from "@/hooks/useSearchIndex";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  ArrowRight,
  TrendingUp,
  Search,
  Edit2,
  Check,
  XCircle,
} from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { DemoDataBanner } from "@/components/shared/DemoDataBanner";
import {
  PageHeader,
  Pill,
  PrimaryLink,
  type Tone,
} from "@/components/shared/Kit";
import { erpApi, type ERPCustomer } from "@/lib/api/client";
import { useCRMStore } from "@/lib/stores/crm";
import { STAGES, type Stage, type Deal } from "@/lib/fixtures/crm";
import { useListKeyboardNav } from "@/hooks/useListKeyboardNav";
import { undoableDelete } from "@/lib/undo";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import { EditableCell } from "@/components/shared/EditableCell";
import { PageDashboard } from "@/components/shared/PageDashboard";
import { usePageDashboard } from "@/hooks/usePageDashboard";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { Sparkles, Download, BarChart3 } from "lucide-react";
import { DealCoachCard } from "@/components/crm/DealCoachCard";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import { ShareLinkButton } from "@/components/shared/ShareLinkButton";
import { PresenceBubbles } from "@/components/shared/PresenceBubbles";
import { AskAiButton } from "@/components/shared/AskAiButton";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";
import { useRegisterAiCommands } from "@/hooks/useRegisterAiCommands";
import { useSavedViews } from "@/hooks/useSavedViews";
import { LeadScoreBadge } from "@/components/crm/LeadScoreCard";
import { scoreDeal } from "@/lib/crm/scoring";

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
    Lead: "var(--content-bg-secondary)",
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
  if (!isActive) return "var(--content-bg-secondary)";
  if (s === "All") return "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)";
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

// Deal-owners used in the assignee filter. Derived from fixture seed data —
// keep in sync with whichever names appear on `deal.assignee` below.
const ASSIGNEES = ["Alex", "Jamie", "Morgan", "Sam", "Taylor"] as const;

// Stage → semantic tone map. Keeps pill colors muted and consistent
// instead of each stage shouting its own candy-bright hex.
const STAGE_TONE: Record<Stage, Tone> = {
  Lead: "neutral",
  Qualified: "info",
  Proposal: "purple",
  Negotiation: "warn",
  Won: "success",
  Lost: "danger",
};

function StagePill({ stage }: Readonly<{ stage: Stage }>) {
  return (
    <Pill tone={STAGE_TONE[stage]} dot>
      {stage}
    </Pill>
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
        // Weighted total = sum(value × probability/100). Won/Lost short-circuit
        // to 100/0 so columns at the ends still match raw totals when expected.
        const stageWeighted = stageDeals.reduce((s, d) => {
          const prob =
            stage === "Won" ? 100 : stage === "Lost" ? 0 : d.probability;
          return s + d.value * (prob / 100);
        }, 0);
        // % of overall pipeline (excludes Lost) so users see column importance.
        const overallPipeline = deals
          .filter((d) => d.stage !== "Lost")
          .reduce((s, d) => s + d.value, 0);
        const sharePct =
          overallPipeline > 0 && stage !== "Lost"
            ? Math.round((stageTotal / overallPipeline) * 100)
            : 0;

        return (
          <div
            key={stage}
            className="min-w-[260px] max-w-[260px] shrink-0 flex flex-col gap-2"
          >
            {/* Column header — muted, uses kit Pill tone */}
            <div
              className="rounded-[10px] px-3 py-2.5"
              style={{
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <StagePill stage={stage} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stageDeals.length}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  marginTop: 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmt(stageTotal)}
              </div>
              {/* Weighted line: value × probability — what actually rolls into forecast */}
              {stage !== "Lost" && stageDeals.length > 0 && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--text-tertiary)",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>≈ {fmt(stageWeighted)} weighted</span>
                  {sharePct > 0 && (
                    <>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span>{sharePct}% of pipeline</span>
                    </>
                  )}
                </div>
              )}
              {/* Share-of-pipeline bar (omit on Lost) */}
              {stage !== "Lost" && stageDeals.length > 0 && (
                <div
                  style={{
                    height: 3,
                    borderRadius: 999,
                    background: "var(--content-secondary)",
                    overflow: "hidden",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, sharePct)}%`,
                      height: "100%",
                      background: "var(--vyne-accent, var(--vyne-purple))",
                      transition: "width 0.4s var(--ease-out-quart, ease-out)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Deal cards */}
            <div className="flex flex-col gap-2 flex-1">
              {stageDeals.map((deal) => {
                const days = daysSince(deal.lastActivity);
                const priority = priorityFromDays(days);
                const daysColor = priorityColor(priority);
                const showOrange = priority === "urgent";
                const priorityWeightClass =
                  priority === "normal" ? "font-normal" : "font-semibold";

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
                    <div className="flex items-center justify-between gap-2 mb-[3px]">
                      <span className="text-xs font-bold truncate text-text-primary">
                        {deal.company}
                      </span>
                      <LeadScoreBadge deal={deal} />
                    </div>
                    <div className="text-[11px] mb-2 truncate text-text-secondary">
                      {deal.contactName}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-text-primary">
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-vyne-purple bg-vyne-purple/[12%]">
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
type SortKey = "company" | "value" | "stage" | "lastActivity" | "score";
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

  // DSA: token-trie search index — O(prefix-len + matches) per keystroke.
  const searchHits = useSearchIndex(
    deals,
    (d) => [d.company, d.contactName, d.email],
    search,
  );
  const filtered = searchHits
    .filter(
      (d) =>
        (stageFilter === "All" || d.stage === stageFilter) &&
        (assigneeFilter === "All" || d.assignee === assigneeFilter),
    )
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
      else if (sortKey === "score")
        cmp = scoreDeal(a).score - scoreDeal(b).score;
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
              s === "All"
                ? "var(--vyne-accent, var(--vyne-purple))"
                : stageColor(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStageFilter(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150"
                style={{
                  borderRadius: 999,
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
        <table className="m-cards w-full border-collapse">
          <thead>
            <tr className="bg-[var(--table-header-bg)]">
              <th className={thClass} onClick={() => toggleSort("company")}>
                Company{sortArrow("company")}
              </th>
              <th className={thNoSortClass}>Contact</th>
              <th className={thClass} onClick={() => toggleSort("value")}>
                Value{sortArrow("value")}
              </th>
              <th className={thClass} onClick={() => toggleSort("stage")}>
                Stage{sortArrow("stage")}
              </th>
              <th className={thClass} onClick={() => toggleSort("score")}>
                Score{sortArrow("score")}
              </th>
              <th className={thNoSortClass}>Source</th>
              <th className={thNoSortClass}>Assignee</th>
              <th
                className={thClass}
                onClick={() => toggleSort("lastActivity")}
              >
                Last Activity{sortArrow("lastActivity")}
              </th>
              <th className={thNoSortClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => {
              const days = daysSince(deal.lastActivity);
              const priority = priorityFromDays(days);
              const daysColor = priorityColor(priority);
              const priorityWeightClass =
                priority === "normal" ? "font-normal" : "font-semibold";

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
                  onTouchStart={(e) => {
                    const tr = e.currentTarget;
                    const timer = window.setTimeout(() => {
                      if (
                        typeof navigator !== "undefined" &&
                        "vibrate" in navigator
                      ) {
                        navigator.vibrate?.(10);
                      }
                      onDealClick(deal);
                    }, 480);
                    (tr as unknown as { _vyneLP?: number })._vyneLP = timer;
                  }}
                  onTouchEnd={(e) => {
                    const tr = e.currentTarget as unknown as {
                      _vyneLP?: number;
                    };
                    if (tr._vyneLP) window.clearTimeout(tr._vyneLP);
                    tr._vyneLP = undefined;
                  }}
                  onTouchMove={(e) => {
                    const tr = e.currentTarget as unknown as {
                      _vyneLP?: number;
                    };
                    if (tr._vyneLP) window.clearTimeout(tr._vyneLP);
                    tr._vyneLP = undefined;
                  }}
                  onTouchCancel={(e) => {
                    const tr = e.currentTarget as unknown as {
                      _vyneLP?: number;
                    };
                    if (tr._vyneLP) window.clearTimeout(tr._vyneLP);
                    tr._vyneLP = undefined;
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
                        style={{
                          color: "var(--vyne-accent, var(--vyne-purple))",
                          fontWeight: 700,
                        }}
                      />
                    </span>
                  </td>
                  <td className="px-[14px] py-[10px] text-xs text-text-secondary">
                    <EditableCell
                      value={deal.contactName}
                      onSave={(v) => {
                        updateDeal(deal.id, { contactName: v });
                        toast.success("Contact updated");
                      }}
                      label="Contact name"
                    />
                  </td>
                  <td className="px-[14px] py-[10px] text-xs font-bold whitespace-nowrap text-text-primary">
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
                  <td className="px-[14px] py-[10px]">
                    <LeadScoreBadge deal={deal} />
                  </td>
                  <td className="px-[14px] py-[10px] text-[11px] capitalize text-text-tertiary">
                    {deal.source}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-vyne-purple bg-vyne-purple/[12%]">
                        {initials(deal.assignee)}
                      </div>
                      <span className="text-xs text-text-primary">
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
          <div className="p-8 text-center text-[13px] text-text-tertiary">
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

  // ── Scenario forecast (Salesforce-style categories) ──────────────
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const openDeals = deals.filter(
    (d) => d.stage !== "Won" && d.stage !== "Lost",
  );
  const weighted = openDeals.reduce(
    (s, d) => s + d.value * (d.probability / 100),
    0,
  );
  // Commit = high-confidence open deals (≥60% or in Negotiation).
  const commit = openDeals
    .filter((d) => d.probability >= 60 || d.stage === "Negotiation")
    .reduce((s, d) => s + d.value, 0);
  const bestCase = openDeals.reduce((s, d) => s + d.value, 0); // everything open
  const forecast = wonValue + weighted; // closed + weighted pipeline

  // Editable quota (persisted) → attainment bar. Default to a sensible round
  // target above the current forecast so the bar is meaningful out of the box.
  const [quota, setQuota] = useState<number>(() => {
    if (typeof window === "undefined") return 500_000;
    const saved = Number(localStorage.getItem("vyne-crm-quota"));
    return Number.isFinite(saved) && saved > 0 ? saved : 500_000;
  });
  const [editingQuota, setEditingQuota] = useState(false);
  const closedPct = quota > 0 ? Math.min(100, (wonValue / quota) * 100) : 0;
  const commitPct =
    quota > 0 ? Math.min(100 - closedPct, (commit / quota) * 100) : 0;

  const scenarios: Array<{
    label: string;
    value: number;
    color: string;
    sub: string;
  }> = [
    {
      label: "Closed Won",
      value: wonValue,
      color: "var(--status-success)",
      sub: `${wonDeals.length} deals`,
    },
    {
      label: "Commit",
      value: wonValue + commit,
      color: "var(--vyne-accent, var(--vyne-purple))",
      sub: "won + high-confidence",
    },
    {
      label: "Forecast",
      value: forecast,
      color: "var(--status-warning)",
      sub: "won + weighted pipeline",
    },
    {
      label: "Best Case",
      value: wonValue + bestCase,
      color: "var(--text-secondary)",
      sub: "won + all open",
    },
  ];

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

  // ── Conversion funnel ────────────────────────────────────────────
  // Count of deals that reached *at least* each stage (current stage index ≥
  // target), so the funnel narrows Lead → Won and shows step conversion %.
  const stageIdx = (s: Stage) => STAGES.indexOf(s);
  const funnel = STAGES.filter((s) => s !== "Lost").map((stage) => ({
    stage,
    reached: deals.filter(
      (d) => d.stage !== "Lost" && stageIdx(d.stage) >= stageIdx(stage),
    ).length,
  }));
  const funnelTop = Math.max(funnel[0]?.reached ?? 0, 1);

  // ── Pipeline by owner ────────────────────────────────────────────
  const byOwner = Object.entries(
    deals
      .filter((d) => d.stage !== "Lost")
      .reduce<Record<string, { total: number; count: number }>>((acc, d) => {
        const o = d.assignee || "Unassigned";
        acc[o] = {
          total: (acc[o]?.total ?? 0) + d.value,
          count: (acc[o]?.count ?? 0) + 1,
        };
        return acc;
      }, {}),
  )
    .map(([owner, v]) => ({ owner, ...v }))
    .sort((a, b) => b.total - a.total);
  const byOwnerMax = Math.max(...byOwner.map((o) => o.total), 1);

  return (
    <div className="flex flex-col gap-[18px]">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-[14px]">
        {[
          {
            label: "Pipeline Total",
            value: fmt(totalPipeline),
            sub: "active deals excl. lost",
            color: "var(--vyne-accent, var(--vyne-purple))",
            bg: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
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
            <div className="text-2xl font-bold text-text-primary tracking-[-0.04em]">
              {value}
            </div>
            <div className="text-xs font-semibold mt-1 text-text-primary">
              {label}
            </div>
            <div className="text-[11px] mt-0.5 text-text-tertiary">{sub}</div>
          </div>
        ))}
      </div>

      {/* Scenario forecast + quota attainment */}
      <div
        className="rounded-xl px-5 py-[18px]"
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-bold text-text-primary">
            Forecast scenarios
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span>Quota</span>
            {editingQuota ? (
              <input
                autoFocus
                type="number"
                aria-label="Quota target"
                title="Quota target"
                placeholder="Quota"
                defaultValue={quota}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v > 0) {
                    setQuota(v);
                    try {
                      localStorage.setItem("vyne-crm-quota", String(v));
                    } catch {
                      /* ignore */
                    }
                  }
                  setEditingQuota(false);
                }}
                className="w-28 px-2 py-1 rounded-md text-xs outline-none"
                style={{
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                  color: "var(--text-primary)",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingQuota(true)}
                className="font-semibold text-text-secondary underline decoration-dotted underline-offset-2"
              >
                {fmt(quota)}
              </button>
            )}
          </div>
        </div>

        {/* Scenario numbers */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {scenarios.map((sc) => (
            <div key={sc.label}>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: sc.color }}
                />
                <span className="text-[11px] font-semibold text-text-secondary">
                  {sc.label}
                </span>
              </div>
              <div className="text-lg font-bold text-text-primary tracking-[-0.02em]">
                {fmt(Math.round(sc.value))}
              </div>
              <div className="text-[10px] text-text-tertiary">{sc.sub}</div>
            </div>
          ))}
        </div>

        {/* Attainment bar: closed (solid) + commit (lighter) toward quota */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-text-secondary">
            Quota attainment
          </span>
          <span className="text-[11px] font-bold text-text-primary">
            {((wonValue / Math.max(quota, 1)) * 100).toFixed(0)}% closed ·{" "}
            {(((wonValue + commit) / Math.max(quota, 1)) * 100).toFixed(0)}%
            committed
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-[var(--content-bg-secondary)]">
          <div
            className="h-full"
            style={{
              width: `${closedPct}%`,
              background: "var(--status-success)",
            }}
            title={`Closed ${fmt(wonValue)}`}
          />
          <div
            className="h-full"
            style={{
              width: `${commitPct}%`,
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.45)",
            }}
            title={`Commit ${fmt(commit)}`}
          />
        </div>
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
          <div className="text-[13px] font-bold mb-4 text-text-primary">
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
                      <span className="text-xs font-medium text-text-primary">
                        {stage}
                      </span>
                      <span className="text-[11px] text-text-tertiary">
                        ({count})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-text-primary">
                      {fmt(total)}
                    </span>
                  </div>
                  <div className="h-2 rounded overflow-hidden bg-[var(--content-bg-secondary)]">
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
          <div className="text-[13px] font-bold mb-4 text-text-primary">
            Top Deals by Value
          </div>
          <div className="flex flex-col">
            {topDeals.map((deal, i) => (
              <div
                key={deal.id}
                className="flex items-center gap-3 py-2.5"
                style={{
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--content-border)",
                }}
              >
                <span className="text-xs font-bold w-[18px] text-center text-text-tertiary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-text-primary">
                    {deal.company}
                  </div>
                  <div className="text-[11px] mt-px text-text-tertiary">
                    {deal.contactName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-text-primary">
                    {fmt(deal.value)}
                  </div>
                  <StagePill stage={deal.stage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div
        className="rounded-xl px-5 py-[18px]"
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <div className="text-[13px] font-bold mb-4 text-text-primary">
          Conversion funnel
        </div>
        <div className="flex flex-col gap-2.5">
          {funnel.map(({ stage, reached }, i) => {
            const widthPct = (reached / funnelTop) * 100;
            const prev = i > 0 ? funnel[i - 1].reached : reached;
            const stepConv = prev > 0 ? (reached / prev) * 100 : 0;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-[88px] shrink-0 text-xs font-medium text-text-secondary">
                  {stage}
                </span>
                <div className="flex-1 h-6 rounded-md overflow-hidden bg-[var(--content-bg-secondary)]">
                  <div
                    className="h-full rounded-md flex items-center px-2 text-[11px] font-bold text-white transition-[width] duration-500"
                    style={{
                      width: `${Math.max(widthPct, 6)}%`,
                      background: stageColor(stage),
                    }}
                  >
                    {reached}
                  </div>
                </div>
                <span className="w-[64px] shrink-0 text-right text-[11px] text-text-tertiary">
                  {i === 0 ? "—" : `${stepConv.toFixed(0)}%`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-text-tertiary">
          Right column = step conversion from the previous stage.
        </div>
      </div>

      {/* Pipeline by owner */}
      <div
        className="rounded-xl px-5 py-[18px]"
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <div className="text-[13px] font-bold mb-4 text-text-primary">
          Pipeline by owner
        </div>
        <div className="flex flex-col gap-3">
          {byOwner.map(({ owner, total, count }) => {
            const pct = (total / byOwnerMax) * 100;
            return (
              <div key={owner}>
                <div className="flex justify-between mb-[5px]">
                  <div className="flex items-center gap-[7px]">
                    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold text-vyne-purple bg-vyne-purple/[12%]">
                      {initials(owner)}
                    </div>
                    <span className="text-xs font-medium text-text-primary">
                      {owner}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      ({count})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-text-primary">
                    {fmt(total)}
                  </span>
                </div>
                <div className="h-2 rounded overflow-hidden bg-[var(--content-bg-secondary)]">
                  <div
                    className="h-full rounded transition-[width] duration-[0.6s] ease-in-out"
                    style={{
                      width: `${pct}%`,
                      background: "var(--vyne-accent, var(--vyne-purple))",
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

// ─── Main Page ────────────────────────────────────────────────────
function CRMPageInner() {
  const router = useRouter();
  const deals = useCRMStore((s) => s.deals);
  const setDeals = useCRMStore((s) => s.setDeals);
  const updateDealInStore = useCRMStore((s) => s.updateDeal);
  const deleteDealFromStore = useCRMStore((s) => s.deleteDeal);
  const detail = useDetailParam();
  const selectedDeal = detail.id
    ? deals.find((d) => d.id === detail.id)
    : undefined;

  // j/k row navigation, e/Enter to open the focused deal, Backspace to
  // delete (with 5s undo). Disabled while typing in inputs.
  useListKeyboardNav({
    count: deals.length,
    onOpen: (idx) => {
      const d = deals[idx];
      if (d) detail.open(d.id);
    },
    onDelete: (idx) => {
      const d = deals[idx];
      if (!d) return;
      const snapshot = { ...d };
      undoableDelete({
        label: `Deleted deal — ${snapshot.company}`,
        mutate: () => deleteDealFromStore(snapshot.id),
        restore: () => useCRMStore.getState().addDeal(snapshot),
      });
    },
  });

  const [tab, setTab] = useState<
    "dashboard" | "pipeline" | "table" | "forecasting"
  >("pipeline");

  // Honour ?view=dashboard from the sidebar Dashboard sub-link.
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  useEffect(() => {
    if (
      urlView === "dashboard" ||
      urlView === "pipeline" ||
      urlView === "table" ||
      urlView === "forecasting"
    ) {
      setTab(urlView);
    }
  }, [urlView]);

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

  const dash = usePageDashboard("crm", "30d");

  // Saved views — URL-shareable filter presets for the deals table.
  interface CrmFilters extends Record<string, unknown> {
    stage?: string;
    minValue?: number;
    idleDays?: number;
  }
  const views = useSavedViews<CrmFilters>({
    storageKey: "crm-deals",
    defaultFilters: {},
    builtinViews: [
      {
        id: "stalling",
        name: "Stalling 14d+",
        filters: { idleDays: 14 },
        pinned: true,
      },
      {
        id: "negotiation",
        name: "Negotiation",
        filters: { stage: "Negotiation" },
      },
      { id: "high-value", name: "$50k+", filters: { minValue: 50000 } },
    ],
  });

  // ─── Real KPIs computed from the deals store ───────────────────
  const wonDeals = deals.filter((d) => d.stage === "Won");
  const lostDeals = deals.filter((d) => d.stage === "Lost");
  const activeDeals = deals.filter(
    (d) => d.stage !== "Won" && d.stage !== "Lost",
  );
  const weightedForecast = activeDeals.reduce(
    (s, d) => s + d.value * (d.probability / 100),
    0,
  );
  const wonValueMTD = wonDeals.reduce((s, d) => s + d.value, 0);
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
        )
      : 0;

  // 14-day sparkline of weighted forecast based on lastActivity bucketing
  const forecastSparkline = (() => {
    const buckets = Array.from({ length: 14 }, () => 0);
    const now = Date.now();
    for (const d of deals) {
      if (d.stage === "Won" || d.stage === "Lost") continue;
      const t = new Date(d.lastActivity).getTime();
      if (Number.isNaN(t)) continue;
      const daysAgo = Math.floor((now - t) / 86400000);
      if (daysAgo < 0 || daysAgo >= 14) continue;
      buckets[13 - daysAgo] += d.value * (d.probability / 100);
    }
    // Cumulative so the line trends meaningfully
    let acc = 0;
    return buckets.map((v) => (acc += v));
  })();

  // Page-scoped Cmd+K commands
  useRegisterCommands("crm", [
    {
      id: "crm-new-deal",
      label: "New deal",
      icon: <Plus size={16} />,
      action: () => router.push("/crm/deals/new"),
      keywords: "create add opportunity",
    },
    {
      id: "crm-ai-coach",
      label: "AI deal coach for stalled deals",
      description: "Suggest next moves on idle deals",
      icon: <Sparkles size={16} />,
      action: () => router.push("/ai?prompt=Coach%20me%20on%20stalled%20deals"),
      badge: "AI",
    },
    {
      id: "crm-forecast",
      label: "Open forecasting view",
      icon: <BarChart3 size={16} />,
      action: () => setTab("forecasting"),
    },
    {
      id: "crm-export",
      label: "Export pipeline as CSV",
      icon: <Download size={16} />,
      action: () => {
        const link = document.querySelector<HTMLButtonElement>(
          "[data-export-button]",
        );
        link?.click();
      },
    },
  ]);

  const aiPrompts = useAiSuggestedPrompts();
  useRegisterAiCommands("crm");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DemoDataBanner
        moduleName="CRM"
        ctaLabel="Ask Vyne how to import"
        ctaHref="/ai/chat?prompt=How%20do%20I%20import%20my%20CRM%20data%20into%20VYNE%3F"
      />
      <PageHeader
        icon={<TrendingUp size={16} />}
        title="CRM Pipeline"
        subtitle={`${activeCount} active · ${fmt(totalPipeline)} pipeline`}
        actions={
          <>
            <Pill tone="success" dot>
              {deals.filter((d) => d.stage === "Won").length} won
            </Pill>
            <Pill tone="danger" dot>
              {deals.filter((d) => d.stage === "Lost").length} lost
            </Pill>
            <AskAiButton noun="deals" suggestions={aiPrompts} />
            <ExportButton
              data={deals as unknown as Record<string, unknown>[]}
              filename="vyne-deals"
              audit={{
                noun: "crm-deals",
                viewName: views.activeView?.name ?? null,
                filters: views.filters,
              }}
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
            <PrimaryLink href="/crm/deals/new">
              <Plus size={13} /> New deal
            </PrimaryLink>
          </>
        }
      />

      <SavedViewsBar store={views} noun="deal" />

      <PageDashboard
        storageKey="crm"
        range={dash.range}
        onRangeChange={dash.setRange}
        kpis={[
          {
            label: "Pipeline value",
            value: fmt(totalPipeline),
            sparkline: forecastSparkline,
            hint: `${activeCount} active`,
          },
          {
            label: "Weighted forecast",
            value: fmt(weightedForecast),
            sparkline: forecastSparkline,
            hint: "value × probability",
          },
          {
            label: "Won (revenue)",
            value: fmt(wonValueMTD),
            hint: `${wonDeals.length} deal${wonDeals.length === 1 ? "" : "s"}`,
          },
          {
            label: "Win rate",
            value: `${winRate}%`,
            hint: `${wonDeals.length} won · ${lostDeals.length} lost`,
            goodWhenUp: true,
          },
        ]}
      />

      {/* Section heading — section navigation now lives in the left sidebar. */}
      <div
        className="shrink-0"
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {(
          {
            dashboard: "Dashboard",
            pipeline: "Pipeline",
            table: "Deals Table",
            forecasting: "Forecasting",
          } as Record<string, string>
        )[tab] ?? tab}
      </div>

      {/* Content */}
      <div
        className="content-scroll flex-1 p-5"
        style={{
          overflowY: tab === "pipeline" ? "hidden" : "auto",
          overflowX: tab === "pipeline" ? "auto" : "hidden",
        }}
      >
        {tab === "dashboard" ? (
          <CRMDashboardView />
        ) : deals.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={20} />}
            title="No deals yet"
            description="Track your pipeline by creating a first deal — or have Vyne AI draft it for you in seconds."
            primary={{ label: "New deal", href: "/crm/deals/new" }}
            aiPrompt="Create a deal for "
          />
        ) : (
          <>
            {tab === "pipeline" && (
              <>
                <DealCoachCard />
                <PipelineTab
                  deals={deals}
                  onDealClick={openDeal}
                  onAddDeal={(stage) =>
                    router.push(`/crm/deals/new?stage=${stage}`)
                  }
                />
              </>
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
          </>
        )}
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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              position: "relative",
            }}
          >
            <PresenceBubbles entityKey={`deal:${deal.id}`} />
            <ShareLinkButton
              entityId={deal.id}
              href={`/crm?deal=${deal.id}`}
              label="deal"
              iconOnly
            />
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
          </div>
        )
      }
    >
      {!deal ? null : (
        <>
          <DetailSection title="Deal value">
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
            <DetailRow label="Contact" value={deal.contactName} />
            <DetailRow
              label="Email"
              value={deal.email || "—"}
              mono={!!deal.email}
            />
            <DetailRow label="Source" value={deal.source} />
            <DetailRow label="Assignee" value={deal.assignee} />
            {deal.nextAction && (
              <DetailRow label="Next action" value={deal.nextAction} />
            )}
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
