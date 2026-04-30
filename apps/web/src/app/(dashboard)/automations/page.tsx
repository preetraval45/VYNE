"use client";

import { useState } from "react";
import { Zap, Plus, Sparkles } from "lucide-react";
import {
  type Automation,
  type AutomationStatus,
  type FilterTab,
  INITIAL_AUTOMATIONS,
  matchesFilter,
  matchesSearch,
  generateId,
  TRIGGER_GROUPS,
  ACTION_GROUPS,
  getTriggerLabel,
} from "@/components/automations/types";
import {
  KpiStrip,
  AutomationsList,
  AutomationDetailPanel,
} from "@/components/automations";
import { notifyError, notifySuccess } from "@/lib/toast";

// ─── AI prose-to-rule types ──────────────────────────────────────────────────

interface ProseRule {
  name: string;
  trigger: {
    event: string;
    conditions?: Record<string, unknown> | null;
  };
  actions: Array<{
    type: string;
    params?: Record<string, unknown> | null;
  }>;
}

// Map the AI-suggested vocabulary onto the codebase's existing trigger/action
// vocabulary so the result actually shows up in the rules list with a real label.
const TRIGGER_EVENT_ALIAS: Record<string, string> = {
  "deal.stage_changed": "crm_deal_stage_changed",
  "deal.created": "crm_lead_created",
  "deal.won": "crm_deal_won_lost",
  "deal.lost": "crm_deal_won_lost",
  "task.created": "projects_create_issue",
  "task.status_changed": "projects_issue_status_changed",
  "message.posted": "chat_message_in_channel",
  "invoice.paid": "erp_invoice_overdue",
  "invoice.overdue": "erp_invoice_overdue",
};

const ACTION_TYPE_ALIAS: Record<string, string> = {
  post_message: "chat_post_channel",
  send_email: "email_send",
  create_task: "projects_create_issue",
  update_deal: "crm_update_stage",
  notify_user: "chat_send_dm",
};

function isKnownTriggerType(value: string): boolean {
  for (const group of TRIGGER_GROUPS) {
    for (const opt of group.options) if (opt.value === value) return true;
  }
  return false;
}

function isKnownActionType(value: string): boolean {
  for (const group of ACTION_GROUPS) {
    for (const opt of group.options) if (opt.value === value) return true;
  }
  return false;
}

function stripFences(raw: string): string {
  let s = raw.trim();
  // Strip ```json … ``` or ``` … ``` fences.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "");
    s = s.replace(/```\s*$/i, "");
  }
  // Some models prepend an explanation; pick the first { … last }.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s.trim();
}

/** Validate the AI shape, returning a typed rule or an error string. */
function parseProseRule(raw: string): ProseRule | string {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(raw));
  } catch (e) {
    return `AI did not return valid JSON: ${(e as Error).message}`;
  }
  if (typeof json !== "object" || json === null)
    return "AI response was not an object.";
  const obj = json as Record<string, unknown>;
  const name = obj.name;
  const trigger = obj.trigger as Record<string, unknown> | undefined;
  const actions = obj.actions;
  if (typeof name !== "string" || name.trim() === "")
    return "Missing 'name' field.";
  if (
    typeof trigger !== "object" ||
    trigger === null ||
    typeof trigger.event !== "string"
  ) {
    return "Missing or invalid 'trigger.event'.";
  }
  if (!Array.isArray(actions) || actions.length === 0)
    return "Missing 'actions' array.";
  const cleanActions: ProseRule["actions"] = [];
  for (const a of actions) {
    if (typeof a !== "object" || a === null) {
      return "Each action must be an object.";
    }
    const ar = a as Record<string, unknown>;
    if (typeof ar.type !== "string") return "Action is missing 'type'.";
    cleanActions.push({
      type: ar.type,
      params:
        typeof ar.params === "object" && ar.params !== null
          ? (ar.params as Record<string, unknown>)
          : null,
    });
  }
  return {
    name: name.trim(),
    trigger: {
      event: trigger.event,
      conditions:
        typeof trigger.conditions === "object" && trigger.conditions !== null
          ? (trigger.conditions as Record<string, unknown>)
          : null,
    },
    actions: cleanActions,
  };
}

function stringifyParam(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Convert the AI rule to the in-app Automation shape. */
function ruleToAutomation(rule: ProseRule): Automation {
  const triggerType =
    TRIGGER_EVENT_ALIAS[rule.trigger.event] ??
    (isKnownTriggerType(rule.trigger.event) ? rule.trigger.event : "");
  const triggerSummary = triggerType
    ? getTriggerLabel(triggerType)
    : rule.trigger.event;

  const triggerConfig: Record<string, string> = {};
  if (rule.trigger.conditions && typeof rule.trigger.conditions === "object") {
    for (const [k, v] of Object.entries(rule.trigger.conditions)) {
      triggerConfig[k] = stringifyParam(v);
    }
  }

  const actions = rule.actions.map((a, i) => {
    const mapped =
      ACTION_TYPE_ALIAS[a.type] ??
      (isKnownActionType(a.type) ? a.type : a.type);
    const params = a.params ?? {};
    const entries = Object.entries(params);
    const [k1, v1] = entries[0] ?? ["field1", ""];
    const [k2, v2] = entries[1] ?? [undefined, undefined];
    return {
      id: `${generateId()}-a${i}`,
      type: mapped,
      config: {
        field1Label: k1,
        field1Value: stringifyParam(v1),
        field2Label: k2,
        field2Value: k2 !== undefined ? stringifyParam(v2) : undefined,
      },
    };
  });

  return {
    id: generateId(),
    name: rule.name,
    status: "draft",
    triggerType,
    triggerSummary,
    triggerConfig,
    conditions: [],
    conditionLogic: "AND",
    actions,
    runCount: 0,
    lastRun: "",
    history: [],
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] =
    useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // AI prose-to-rule state
  const [proseInput, setProseInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [previewRule, setPreviewRule] = useState<ProseRule | null>(null);

  const selectedAutomation =
    automations.find((a) => a.id === selectedId) ?? null;

  const visibleAutomations = automations.filter(
    (a) => matchesFilter(a, filterTab) && matchesSearch(a, searchQuery),
  );

  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0);
  const activeCount = automations.filter((a) => a.status === "active").length;

  // ─ List actions ─

  function handleToggleStatus(id: string) {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next: AutomationStatus =
          a.status === "active" ? "paused" : "active";
        return { ...a, status: next };
      }),
    );
  }

  function handleNewAutomation() {
    setSelectedId(null);
    setShowTemplateGallery(true);
  }

  function handleSelectAutomation(id: string) {
    setSelectedId(id);
    setShowTemplateGallery(false);
  }

  function handleSelectIdFromPanel(id: string) {
    setSelectedId(id);
    setShowTemplateGallery(false);
  }

  // ─ AI prose-to-rule ─

  async function handleGenerate() {
    const text = proseInput.trim();
    if (text === "") {
      notifyError("Describe the automation you want first.", "Nothing to send");
      return;
    }
    setAiBusy(true);
    setPreviewRule(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            'Convert this prose automation into a JSON automation rule. Output ONLY JSON matching: {"name":string,"trigger":{"event":string,"conditions":{...}},"actions":[{"type":string,"params":{...}}]}. Available trigger events: deal.stage_changed, deal.created, task.created, task.status_changed, message.posted, invoice.paid. Available action types: post_message, send_email, create_task, update_deal, notify_user. No prose.',
          context: { userInput: text },
        }),
      });
      if (!res.ok) {
        notifyError(
          `Vyne AI request failed (${res.status})`,
          "Couldn't generate automation",
        );
        return;
      }
      const body = (await res.json()) as { answer?: string };
      const answer = body.answer ?? "";
      if (answer === "") {
        notifyError("AI returned an empty response.", "Couldn't generate automation");
        return;
      }
      const parsed = parseProseRule(answer);
      if (typeof parsed === "string") {
        notifyError(parsed, "Couldn't parse AI response");
        return;
      }
      setPreviewRule(parsed);
    } catch (err) {
      notifyError(err, "Couldn't generate automation");
    } finally {
      setAiBusy(false);
    }
  }

  function handleConfirmCreate() {
    if (!previewRule) return;
    const newAutomation = ruleToAutomation(previewRule);
    setAutomations((prev) => [newAutomation, ...prev]);
    setSelectedId(newAutomation.id);
    setShowTemplateGallery(false);
    setPreviewRule(null);
    setProseInput("");
    notifySuccess("Automation created");
  }

  function handleDiscardPreview() {
    setPreviewRule(null);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--content-secondary)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 44,
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 10,
          flexShrink: 0,
          background: "var(--content-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={12} color="var(--vyne-accent, #06B6D4)" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Automations
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {activeCount} active · {automations.length} total
          </span>
          <button
            type="button"
            onClick={handleNewAutomation}
            style={{
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={12} /> New Automation
          </button>
        </div>
      </div>

      {/* AI prose-to-rule card */}
      <div
        style={{
          padding: "12px 18px 0",
          background: "var(--content-bg)",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <div
          style={{
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            padding: 12,
            background: "var(--content-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            <Sparkles size={13} color="var(--vyne-accent, #06B6D4)" />
            Describe in plain English
          </div>
          <label
            htmlFor="ai-prose-textarea"
            style={{
              position: "absolute",
              left: -10000,
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
          >
            Describe the automation
          </label>
          <textarea
            id="ai-prose-textarea"
            value={proseInput}
            onChange={(e) => setProseInput(e.target.value)}
            disabled={aiBusy}
            rows={3}
            placeholder="Describe what should happen, e.g. 'When a deal moves to Won, post in #sales-wins channel'"
            style={{
              width: "100%",
              resize: "vertical",
              minHeight: 60,
              padding: 10,
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={handleGenerate}
              disabled={aiBusy || proseInput.trim() === ""}
              aria-busy={aiBusy}
              style={{
                background:
                  aiBusy || proseInput.trim() === ""
                    ? "var(--content-border)"
                    : "var(--vyne-accent, #06B6D4)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor:
                  aiBusy || proseInput.trim() === "" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={12} />
              {aiBusy ? "Generating…" : "Generate automation"}
            </button>
          </div>

          {previewRule !== null && (
            <div
              style={{
                marginTop: 4,
                border: "1px dashed var(--vyne-accent, #06B6D4)",
                borderRadius: 8,
                padding: 10,
                background: "var(--content-bg)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Preview · {previewRule.name}
              </div>
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  color: "var(--text-primary)",
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  padding: 8,
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(previewRule, null, 2)}
              </pre>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handleDiscardPreview}
                  style={{
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  style={{
                    background: "var(--vyne-accent, var(--vyne-purple))",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "5px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip
        totalAutomations={automations.length}
        activeCount={activeCount}
        totalRuns={totalRuns}
      />

      {/* Split view */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sidebar */}
        <AutomationsList
          automations={visibleAutomations}
          allAutomations={automations}
          selectedId={selectedId}
          filterTab={filterTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilterTab}
          onSelect={handleSelectAutomation}
          onToggle={handleToggleStatus}
        />

        {/* Right panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--table-header-bg)",
          }}
        >
          <AutomationDetailPanel
            automation={selectedAutomation}
            showTemplateGallery={showTemplateGallery}
            automations={automations}
            onSetAutomations={setAutomations}
            onSelectId={handleSelectIdFromPanel}
            onCloseGallery={() => setShowTemplateGallery(false)}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>
    </div>
  );
}
