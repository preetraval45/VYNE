"use client";

import { useState, useEffect } from "react";
import { Plus, X, Search, Edit2, Check, XCircle } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { erpApi, type ERPCustomer } from "@/lib/api/client";
import {
  INITIAL_DEALS,
  STAGES,
  ASSIGNEES,
  SOURCES,
  MOCK_ACTIVITIES,
  type Stage,
  type Source,
  type Deal,
} from "@/lib/fixtures/crm";

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

// ─── Deal Detail Modal ────────────────────────────────────────────
function DealModal({
  deal,
  onClose,
  onUpdate,
}: Readonly<{
  deal: Deal;
  onClose: () => void;
  onUpdate: (updated: Deal) => void;
}>) {
  const [stage, setStage] = useState<Stage>(deal.stage);
  const [nextAction, setNextAction] = useState(deal.nextAction);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleConvert() {
    showToast("Order created in Ops module");
  }

  function handleWon() {
    onUpdate({ ...deal, stage: "Won", probability: 100 });
    onClose();
  }

  function handleLost() {
    onUpdate({ ...deal, stage: "Lost", probability: 0 });
    onClose();
  }

  function handleSave() {
    onUpdate({ ...deal, stage, nextAction });
    onClose();
  }

  const days = daysSince(deal.lastActivity);
  const priority = priorityFromDays(days);
  const actColor = priorityColor(priority);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[300] bg-black/40"
    >
      <div
        className="rounded-[14px] w-[580px] max-h-[88vh] overflow-hidden flex flex-col"
        style={{
          background: "var(--content-bg)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between"
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <div>
            <div
              className="text-base font-bold mb-1 text-text-primary"
            >
              {deal.company}
            </div>
            <div className="text-xs text-text-secondary">
              {deal.contactName} · {deal.email}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="border-0 bg-transparent cursor-pointer p-1 rounded-md flex text-text-tertiary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]" >
          {/* Value + Probability */}
          <div className="flex gap-4 mb-5">
            <div
              className="flex-1 rounded-[10px] border"
              style={{
                background: "var(--content-secondary)",
                padding: "14px 16px",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1 text-text-tertiary tracking-[0.06em]" 
              >
                Deal Value
              </div>
              <div
                className="text-[22px] font-bold text-text-primary tracking-[-0.03em]" 
              >
                {fmt(deal.value)}
              </div>
            </div>
            <div
              className="flex-1 rounded-[10px]"
              style={{
                background: "var(--content-secondary)",
                padding: "14px 16px",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1 text-text-tertiary tracking-[0.06em]" 
              >
                Probability
              </div>
              <div
                className="text-[22px] font-bold"
                style={{ color: probabilityColor(deal.probability), letterSpacing: "-0.03em" }}
              >
                {deal.probability}%
              </div>
              <div
                className="mt-2 h-[6px] rounded-full overflow-hidden bg-content-border"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-[0.4s]"
                  style={{
                    width: `${deal.probability}%`,
                    background: probabilityColor(deal.probability),
                  }}
                />
              </div>
            </div>
            <div
              className="flex-1 rounded-[10px]"
              style={{
                background: "var(--content-secondary)",
                padding: "14px 16px",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase mb-1 text-text-tertiary tracking-[0.06em]" 
              >
                Last Activity
              </div>
              <div className="text-sm font-semibold" style={{ color: actColor }}>
                {days}d ago
              </div>
              <div className="text-[11px] mt-0.5 text-text-tertiary">
                Source: {deal.source}
              </div>
            </div>
          </div>

          {/* Stage selector */}
          <div className="mb-5">
            <div
              className="text-[11px] font-semibold uppercase mb-2.5 text-text-secondary tracking-[0.06em]" 
            >
              Stage
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => {
                const isActive = stage === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className="px-3 py-[5px] rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
                    style={{
                      border: isActive
                        ? `2px solid ${stageColor(s)}`
                        : "2px solid transparent",
                      background: isActive ? stageBg(s) : "#F4F4F8",
                      color: isActive ? stageColor(s) : "var(--text-secondary)",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Action */}
          <div className="mb-5">
            <label
              htmlFor="modal-next-action"
              className="block text-[11px] font-semibold uppercase mb-1.5 text-text-secondary tracking-[0.06em]" 
            >
              Next Action
            </label>
            <input
              id="modal-next-action"
              title="Next Action"
              placeholder="Schedule follow-up call"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg text-[13px] outline-none box-border"
              style={{
                border: "1px solid var(--input-border)",
                background: "var(--content-secondary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Notes */}
          {deal.notes && (
            <div
              className="mb-5 px-[14px] py-3 rounded-lg"
              style={{
                background: "var(--badge-warning-bg)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <div className="text-[11px] font-semibold mb-1 text-[var(--badge-warning-text)]" >
                Notes
              </div>
              <div className="text-xs text-[#78350F]" >{deal.notes}</div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="mb-5">
            <div
              className="text-[11px] font-semibold uppercase mb-3 text-text-secondary tracking-[0.06em]" 
            >
              Activity Timeline
            </div>
            <div className="flex flex-col">
              {MOCK_ACTIVITIES.map((a, actIdx) => (
                <div key={a.time} className="flex gap-3 pb-[14px]">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1 bg-vyne-purple"
                    />
                    {actIdx < MOCK_ACTIVITIES.length - 1 && (
                      <div
                        className="w-px flex-1 mt-1 bg-content-border"
                      />
                    )}
                  </div>
                  <div>
                    <div
                      className="text-xs mb-0.5 text-text-primary"
                    >
                      {a.text}
                    </div>
                    <div className="text-[10px] text-text-tertiary">
                      {new Date(a.time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex gap-2 items-center"
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--content-border)",
          }}
        >
          <button
            onClick={handleConvert}
            className="flex-1 px-[14px] py-2 rounded-lg text-xs font-semibold cursor-pointer bg-transparent border-vyne-purple border text-vyne-purple"
          >
            Convert to Order
          </button>
          <button
            onClick={handleWon}
            className="px-[14px] py-2 rounded-lg border-0 text-white cursor-pointer text-xs font-semibold flex items-center gap-[5px] bg-status-success"
          >
            <Check size={13} /> Mark Won
          </button>
          <button
            onClick={handleLost}
            className="px-[14px] py-2 rounded-lg border-0 text-white cursor-pointer text-xs font-semibold flex items-center gap-[5px] bg-status-danger"
          >
            <XCircle size={13} /> Mark Lost
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg border-0 text-white cursor-pointer text-xs font-semibold bg-vyne-purple"
          >
            Save
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-7 left-1/2 -translate-x-1/2 text-white px-[18px] py-2.5 rounded-[10px] text-[13px] font-medium z-[400] whitespace-nowrap"
          style={{
            background: "var(--text-primary)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Add Deal Modal ───────────────────────────────────────────────
interface AddDealForm {
  company: string;
  contactName: string;
  email: string;
  value: string;
  stage: Stage;
  source: Source;
  assignee: string;
  notes: string;
}

const EMPTY_FORM: AddDealForm = {
  company: "",
  contactName: "",
  email: "",
  value: "",
  stage: "Lead",
  source: "website",
  assignee: "Alex",
  notes: "",
};

function AddDealModal({
  defaultStage,
  onClose,
  onAdd,
}: Readonly<{
  defaultStage: Stage;
  onClose: () => void;
  onAdd: (deal: Deal) => void;
}>) {
  const [form, setForm] = useState<AddDealForm>({
    ...EMPTY_FORM,
    stage: defaultStage,
  });

  function handleAdd() {
    if (!form.company || !form.contactName) return;
    const deal: Deal = {
      id: `d${Date.now()}`,
      company: form.company,
      contactName: form.contactName,
      email: form.email,
      stage: form.stage,
      value: Number.parseInt(form.value, 10) || 0,
      probability: 15,
      assignee: form.assignee,
      lastActivity: new Date().toISOString(),
      nextAction: "",
      source: form.source,
      notes: form.notes,
    };
    onAdd(deal);
    onClose();
  }

  const fieldInputClass =
    "w-full px-2.5 py-2 rounded-lg text-[13px] outline-none box-border";
  const fieldInputStyle: React.CSSProperties = {
    border: "1px solid var(--input-border)",
    background: "var(--content-secondary)",
    color: "var(--text-primary)",
  };

  function field(label: string, id: string, node: React.ReactNode) {
    return (
      <div className="mb-[14px]">
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold uppercase mb-[5px] text-text-secondary tracking-[0.06em]" 
        >
          {label}
        </label>
        {node}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[300] bg-black/40"
    >
      <div
        className="rounded-[14px] w-[480px] max-h-[88vh] overflow-hidden flex flex-col"
        style={{
          background: "var(--content-bg)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <span
            className="text-[15px] font-bold text-text-primary"
          >
            Add New Deal
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="border-0 bg-transparent cursor-pointer p-1 rounded-md flex text-text-tertiary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]" >
          <div className="grid grid-cols-2 gap-[14px]">
            <div className="col-span-2">
              {field(
                "Company Name",
                "add-company",
                <input
                  id="add-company"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Acme Corp"
                  className={fieldInputClass}
                  style={fieldInputStyle}
                />,
              )}
            </div>
            {field(
              "Contact Name",
              "add-contact",
              <input
                id="add-contact"
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                placeholder="Jane Smith"
                className={fieldInputClass}
                style={fieldInputStyle}
              />,
            )}
            {field(
              "Email",
              "add-email",
              <input
                id="add-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
                className={fieldInputClass}
                style={fieldInputStyle}
              />,
            )}
            {field(
              "Deal Value ($)",
              "add-value",
              <input
                id="add-value"
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="50000"
                className={fieldInputClass}
                style={fieldInputStyle}
              />,
            )}
            {field(
              "Stage",
              "add-stage",
              <select
                id="add-stage"
                title="Stage"
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as Stage })
                }
                className={`${fieldInputClass} cursor-pointer`}
                style={fieldInputStyle}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "Source",
              "add-source",
              <select
                id="add-source"
                title="Source"
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value as Source })
                }
                className={`${fieldInputClass} cursor-pointer`}
                style={fieldInputStyle}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "Assignee",
              "add-assignee",
              <select
                id="add-assignee"
                title="Assignee"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className={`${fieldInputClass} cursor-pointer`}
                style={fieldInputStyle}
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>,
            )}
            <div className="col-span-2">
              {field(
                "Notes",
                "add-notes",
                <textarea
                  id="add-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Add context about this deal..."
                  rows={3}
                  className={`${fieldInputClass} resize-y font-sans`}
                  style={fieldInputStyle}
                />,
              )}
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 justify-end"
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--content-border)",
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg cursor-pointer text-[13px] bg-transparent"
            style={{
              border: "1px solid var(--input-border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-[18px] py-2 rounded-lg border-0 text-white cursor-pointer text-[13px] font-semibold bg-vyne-purple"
          >
            Add Deal
          </button>
        </div>
      </div>
    </div>
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
                    <button
                      onClick={() => onDealClick(deal)}
                      className="bg-transparent border-0 cursor-pointer text-xs font-bold p-0 text-left text-vyne-purple"
                    >
                      {deal.company}
                    </button>
                  </td>
                  <td
                    className="px-[14px] py-[10px] text-xs text-text-secondary"
                  >
                    {deal.contactName}
                  </td>
                  <td
                    className="px-[14px] py-[10px] text-xs font-bold whitespace-nowrap text-text-primary"
                  >
                    {fmt(deal.value)}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <StagePill stage={deal.stage} />
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
export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
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
  }, []);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [addStage, setAddStage] = useState<Stage | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleUpdateDeal(updated: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    showToast(`Deal updated: ${updated.company}`);
  }

  function handleAddDeal(deal: Deal) {
    setDeals((prev) => [deal, ...prev]);
    showToast(`Deal added: ${deal.company}`);
  }

  function handleMarkWon(id: string) {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, stage: "Won", probability: 100 } : d,
      ),
    );
    const deal = deals.find((d) => d.id === id);
    showToast(`Marked Won: ${deal?.company ?? ""}`);
  }

  function handleMarkLost(id: string) {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, stage: "Lost", probability: 0 } : d,
      ),
    );
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
            <button
              onClick={() => setAddStage("Lead")}
              className="flex items-center gap-1.5 px-[14px] py-[7px] rounded-lg border-0 text-white cursor-pointer text-xs font-semibold bg-vyne-purple"
            >
              <Plus size={13} /> Add Deal
            </button>
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
            onDealClick={setSelectedDeal}
            onAddDeal={setAddStage}
          />
        )}
        {tab === "table" && (
          <DealsTableTab
            deals={deals}
            onDealClick={setSelectedDeal}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
          />
        )}
        {tab === "forecasting" && <ForecastingTab deals={deals} />}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal !== null && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={(updated) => {
            handleUpdateDeal(updated);
            setSelectedDeal(null);
          }}
        />
      )}

      {/* Add Deal Modal */}
      {addStage !== null && (
        <AddDealModal
          defaultStage={addStage}
          onClose={() => setAddStage(null)}
          onAdd={handleAddDeal}
        />
      )}

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
    </div>
  );
}
