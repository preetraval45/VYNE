"use client";

import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import {
  useAutomationsStore,
  ACTION_LABELS,
  type AutomationActionType,
} from "@/lib/stores/automations";
import { STAGES } from "@/lib/fixtures/crm";

interface Props {
  readonly onToast: (message: string) => void;
}

const ACTION_TYPES: AutomationActionType[] = [
  "log_note",
  "set_next_action",
  "set_probability",
];

function valuePlaceholder(a: AutomationActionType): string {
  if (a === "log_note") return "Note to log on the deal…";
  if (a === "set_next_action") return "e.g. Send proposal";
  return "0–100";
}

export default function AutomationsSettings({ onToast }: Props) {
  const rules = useAutomationsStore((s) => s.rules);
  const addRule = useAutomationsStore((s) => s.addRule);
  const updateRule = useAutomationsStore((s) => s.updateRule);
  const deleteRule = useAutomationsStore((s) => s.deleteRule);

  const [triggerStage, setTriggerStage] = useState<string>("Negotiation");
  const [actionType, setActionType] =
    useState<AutomationActionType>("log_note");
  const [actionValue, setActionValue] = useState("");

  const crmRules = rules.filter((r) => r.module === "crm");

  function add() {
    if (!actionValue.trim()) {
      onToast("Add an action value first");
      return;
    }
    addRule({
      name: `When deal → ${triggerStage}`,
      module: "crm",
      triggerStage,
      actionType,
      actionValue: actionValue.trim(),
      enabled: true,
    });
    setActionValue("");
    onToast("Automation added");
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--content-border)",
    background: "var(--content-secondary)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Zap
          size={16}
          style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}
        />
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          CRM Automations
        </h2>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-tertiary)",
          margin: "0 0 18px",
        }}
      >
        Run an action automatically when a deal enters a stage. Actions are
        applied instantly and recorded on the deal&apos;s activity timeline.
      </p>

      {/* Builder */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 8,
          alignItems: "center",
          padding: 14,
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            When stage →
          </span>
          <select
            value={triggerStage}
            onChange={(e) => setTriggerStage(e.target.value)}
            aria-label="Trigger stage"
            style={inputStyle}
          >
            {STAGES.filter((s) => s !== "Lost").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={actionType}
            onChange={(e) =>
              setActionType(e.target.value as AutomationActionType)
            }
            aria-label="Action type"
            style={inputStyle}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <input
          value={actionValue}
          onChange={(e) => setActionValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder={valuePlaceholder(actionType)}
          aria-label="Action value"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={add}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Rules list */}
      {crmRules.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          No automations yet. Add one above — e.g. &ldquo;When deal →
          Negotiation, log a note: Schedule the contract review&rdquo;.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {crmRules.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                opacity: r.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  When deal → <strong>{r.triggerStage}</strong>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {ACTION_LABELS[r.actionType]}: {r.actionValue}
                </div>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) =>
                    updateRule(r.id, { enabled: e.target.checked })
                  }
                  aria-label="Enabled"
                />
                {r.enabled ? "On" : "Off"}
              </label>
              <button
                type="button"
                onClick={() => {
                  deleteRule(r.id);
                  onToast("Automation removed");
                }}
                aria-label="Delete automation"
                title="Delete"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
