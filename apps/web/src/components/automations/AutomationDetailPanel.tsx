import { useState } from "react";
import { Play, Pause, Check, X, Zap } from "lucide-react";
import {
  type Automation,
  type AutomationStatus,
  type AutomationAction,
  type Condition,
  type DetailTab,
  getStatusColor,
  formatRelativeTime,
  generateId,
  getTriggerLabel,
  TEMPLATES,
} from "./types";
import TriggerSection from "./TriggerSection";
import ConditionEditor from "./ConditionEditor";
import ActionConfigurator from "./ActionConfigurator";
import RunHistory from "./RunHistory";
import CreateAutomationModal from "./CreateAutomationModal";

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-tertiary)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "rgba(6, 182, 212,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Zap size={26} color="#06B6D4" strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        Select an automation
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          textAlign: "center",
          maxWidth: 240,
        }}
      >
        Choose an automation from the list, or create a new one to get started.
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge(props: Readonly<{ status: AutomationStatus }>) {
  const labelMap: Record<AutomationStatus, string> = {
    active: "Active",
    paused: "Paused",
    draft: "Draft",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: `${getStatusColor(props.status)}18`,
        color: getStatusColor(props.status),
        borderRadius: 20,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: getStatusColor(props.status),
        }}
      />
      {labelMap[props.status]}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

export default function AutomationDetailPanel(
  props: Readonly<{
    automation: Automation | null;
    showTemplateGallery: boolean;
    automations: Automation[];
    onSetAutomations: (updater: (prev: Automation[]) => Automation[]) => void;
    onSelectId: (id: string) => void;
    onCloseGallery: () => void;
    onToggleStatus: (id: string) => void;
  }>,
) {
  const {
    automation,
    showTemplateGallery,
    automations,
    onSetAutomations,
    onSelectId,
    onCloseGallery,
    onToggleStatus,
  } = props;

  const [detailTab, setDetailTab] = useState<DetailTab>("editor");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // ─ Template selection ─

  function handleTemplateSelect(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl === undefined) return;
    const newId = generateId();
    const newAuto: Automation = {
      id: newId,
      name: tpl.label === "Custom" ? "Untitled Automation" : tpl.label,
      status: "draft",
      triggerType: tpl.triggerType,
      triggerSummary:
        tpl.triggerType === ""
          ? "No trigger set"
          : getTriggerLabel(tpl.triggerType),
      triggerConfig: { ...tpl.triggerConfig } as Record<string, string>,
      conditions: [],
      conditionLogic: "AND",
      actions: tpl.actions.map((a) => ({
        ...a,
        id: generateId(),
        config: { ...a.config },
      })) as Automation["actions"],
      runCount: 0,
      lastRun: "",
      history: [],
    };
    onSetAutomations((prev) => [newAuto, ...prev]);
    onSelectId(newId);
    onCloseGallery();
    setDetailTab("editor");
  }

  // ─ Name editing ─

  function handleNameEdit() {
    if (automation === null) return;
    setNameInput(automation.name);
    setEditingName(true);
  }

  function handleNameSave() {
    if (automation === null) return;
    const trimmed = nameInput.trim();
    if (trimmed !== "") {
      onSetAutomations((prev) =>
        prev.map((a) => (a.id === automation.id ? { ...a, name: trimmed } : a)),
      );
    }
    setEditingName(false);
  }

  // ─ Trigger editing ─

  function handleTriggerChange(value: string) {
    if (automation === null) return;
    onSetAutomations((prev) =>
      prev.map((a) =>
        a.id === automation.id
          ? {
              ...a,
              triggerType: value,
              triggerSummary: getTriggerLabel(value),
              triggerConfig: {},
            }
          : a,
      ),
    );
  }

  function handleTriggerConfigChange(key: string, value: string) {
    if (automation === null) return;
    onSetAutomations((prev) =>
      prev.map((a) =>
        a.id === automation.id
          ? { ...a, triggerConfig: { ...a.triggerConfig, [key]: value } }
          : a,
      ),
    );
  }

  // ─ Condition editing ─

  function handleAddCondition() {
    if (automation === null) return;
    if (automation.conditions.length >= 3) return;
    const newCond: Condition = {
      id: generateId(),
      field: "",
      operator: "equals",
      value: "",
    };
    onSetAutomations((prev) =>
      prev.map((a) =>
        a.id === automation.id
          ? { ...a, conditions: [...a.conditions, newCond] }
          : a,
      ),
    );
  }

  function handleUpdateCondition(
    id: string,
    field: keyof Condition,
    value: string,
  ) {
    if (automation === null) return;
    const autoId = automation.id;
    function patchCond(c: Condition) {
      return c.id === id ? { ...c, [field]: value } : c;
    }
    function patchAuto(a: Automation) {
      return a.id === autoId
        ? { ...a, conditions: a.conditions.map(patchCond) }
        : a;
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleDeleteCondition(id: string) {
    if (automation === null) return;
    const autoId = automation.id;
    function filterCond(c: Condition) {
      return c.id !== id;
    }
    function patchAuto(a: Automation) {
      return a.id === autoId
        ? { ...a, conditions: a.conditions.filter(filterCond) }
        : a;
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleToggleConditionLogic() {
    if (automation === null) return;
    onSetAutomations((prev) =>
      prev.map((a) =>
        a.id === automation.id
          ? { ...a, conditionLogic: a.conditionLogic === "AND" ? "OR" : "AND" }
          : a,
      ),
    );
  }

  // ─ Action editing ─

  function handleAddAction() {
    if (automation === null) return;
    const newAction: AutomationAction = {
      id: generateId(),
      type: "",
      config: {
        field1Label: "",
        field1Value: "",
        field2Label: "",
        field2Value: "",
      },
    };
    onSetAutomations((prev) =>
      prev.map((a) =>
        a.id === automation.id
          ? { ...a, actions: [...a.actions, newAction] }
          : a,
      ),
    );
  }

  function handleActionTypeChange(id: string, type: string) {
    if (automation === null) return;
    const autoId = automation.id;
    const blankConfig = {
      field1Label: "",
      field1Value: "",
      field2Label: "",
      field2Value: "",
    };
    function patchAction(act: AutomationAction) {
      return act.id === id ? { ...act, type, config: blankConfig } : act;
    }
    function patchAuto(a: Automation) {
      return a.id === autoId
        ? { ...a, actions: a.actions.map(patchAction) }
        : a;
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleActionConfigChange(
    id: string,
    field: "field1Value" | "field2Value",
    value: string,
  ) {
    if (automation === null) return;
    const autoId = automation.id;
    function patchAction(act: AutomationAction) {
      return act.id === id
        ? { ...act, config: { ...act.config, [field]: value } }
        : act;
    }
    function patchAuto(a: Automation) {
      return a.id === autoId
        ? { ...a, actions: a.actions.map(patchAction) }
        : a;
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleActionMoveUp(id: string) {
    if (automation === null) return;
    const autoId = automation.id;
    function patchAuto(a: Automation) {
      if (a.id !== autoId) return a;
      const idx = a.actions.findIndex((act) => act.id === id);
      if (idx <= 0) return a;
      const next = [...a.actions];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return { ...a, actions: next };
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleActionMoveDown(id: string) {
    if (automation === null) return;
    const autoId = automation.id;
    function patchAuto(a: Automation) {
      if (a.id !== autoId) return a;
      const idx = a.actions.findIndex((act) => act.id === id);
      if (idx === -1 || idx >= a.actions.length - 1) return a;
      const next = [...a.actions];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return { ...a, actions: next };
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  function handleActionDelete(id: string) {
    if (automation === null) return;
    const autoId = automation.id;
    function filterAction(act: AutomationAction) {
      return act.id !== id;
    }
    function patchAuto(a: Automation) {
      return a.id === autoId
        ? { ...a, actions: a.actions.filter(filterAction) }
        : a;
    }
    onSetAutomations((prev) => prev.map(patchAuto));
  }

  // ─ Render ─

  if (showTemplateGallery) {
    return (
      <CreateAutomationModal
        onSelect={handleTemplateSelect}
        onCancel={onCloseGallery}
      />
    );
  }

  if (automation === null) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Detail Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          {editingName ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}
            >
              <input
                id="automation-name-input"
                type="text"
                aria-label="Automation name"
                placeholder="Automation name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSave();
                }}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  border: "1px solid #06B6D4",
                  borderRadius: 7,
                  padding: "4px 8px",
                  background: "var(--content-secondary)",
                  outline: "none",
                }}
              />
              <button aria-label="Confirm"
                onClick={handleNameSave}
                style={{
                  background: "#06B6D4",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 7px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Save name"
              >
                <Check size={13} color="#fff" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 4,
                }}
                title="Cancel"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {automation.name}
              </span>
              <button
                onClick={handleNameEdit}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  padding: 3,
                  display: "flex",
                  alignItems: "center",
                }}
                title="Edit name"
              >
                <span style={{ fontSize: 11 }}>{"\u270F\uFE0F"}</span>
              </button>
            </div>
          )}
          <button
            onClick={() => onToggleStatus(automation.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background:
                automation.status === "active"
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(34,197,94,0.1)",
              border: `1px solid ${automation.status === "active" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: automation.status === "active" ? "#F59E0B" : "#22C55E",
              cursor: "pointer",
            }}
          >
            {automation.status === "active" ? (
              <Pause size={11} />
            ) : (
              <Play size={11} />
            )}
            {automation.status === "active" ? "Pause" : "Activate"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusBadge status={automation.status} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>{automation.runCount}</strong>{" "}
            runs total
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Last run:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {formatRelativeTime(automation.lastRun)}
            </strong>
          </span>
        </div>
      </div>

      {/* Detail Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--content-border)",
          padding: "0 20px",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        {(["editor", "history"] as DetailTab[]).map((tab) => {
          const labelMap: Record<DetailTab, string> = {
            editor: "Workflow Editor",
            history: "Run History",
          };
          const isActive = detailTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setDetailTab(tab)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#06B6D4" : "#6B6B8A",
                borderBottom: isActive
                  ? "2px solid #06B6D4"
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {labelMap[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {detailTab === "editor" ? (
        <div
          style={{ padding: "20px", overflowY: "auto", flex: 1 }}
          className="content-scroll"
        >
          <TriggerSection
            triggerType={automation.triggerType}
            triggerConfig={automation.triggerConfig}
            onTriggerChange={handleTriggerChange}
            onConfigChange={handleTriggerConfigChange}
          />
          <ConditionEditor
            conditions={automation.conditions}
            logic={automation.conditionLogic}
            onAdd={handleAddCondition}
            onUpdate={handleUpdateCondition}
            onDelete={handleDeleteCondition}
            onToggleLogic={handleToggleConditionLogic}
          />
          <ActionConfigurator
            actions={automation.actions}
            onAdd={handleAddAction}
            onTypeChange={handleActionTypeChange}
            onConfigChange={handleActionConfigChange}
            onMoveUp={handleActionMoveUp}
            onMoveDown={handleActionMoveDown}
            onDelete={handleActionDelete}
          />
        </div>
      ) : (
        <RunHistory history={automation.history} />
      )}
    </>
  );
}
