import {
  Plus,
  Play,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowDown,
} from "lucide-react";
import {
  type AutomationAction,
  ACTION_GROUPS,
  ACTION_CONFIG_FIELDS,
} from "./types";

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard(
  props: Readonly<{
    action: AutomationAction;
    index: number;
    total: number;
    onTypeChange: (id: string, type: string) => void;
    onConfigChange: (
      id: string,
      field: "field1Value" | "field2Value",
      value: string,
    ) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onDelete: (id: string) => void;
  }>,
) {
  const {
    action,
    index,
    total,
    onTypeChange,
    onConfigChange,
    onMoveUp,
    onMoveDown,
    onDelete,
  } = props;
  const configDefs = ACTION_CONFIG_FIELDS[action.type] ?? [];

  return (
    <div>
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: "rgba(34,197,94,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "#22C55E" }}>
              {index + 1}
            </span>
          </div>
          <select
            id={`action-type-${action.id}`}
            value={action.type}
            onChange={(e) => onTypeChange(action.id, e.target.value)}
            style={{
              flex: 1,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid rgba(0,0,0,0.12)",
              fontSize: 12,
              color: "#1A1A2E",
              background: "#FAFAFE",
              appearance: "none",
              cursor: "pointer",
            }}
          >
            <option value="">\u2014 Select action \u2014</option>
            {ACTION_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div style={{ display: "flex", gap: 2 }}>
            <button
              onClick={() => onMoveUp(action.id)}
              disabled={index === 0}
              style={{
                background: "none",
                border: "none",
                cursor: index === 0 ? "not-allowed" : "pointer",
                color: index === 0 ? "#D0D0E0" : "#6B6B8A",
                padding: 3,
                display: "flex",
                alignItems: "center",
              }}
              title="Move up"
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={() => onMoveDown(action.id)}
              disabled={index === total - 1}
              style={{
                background: "none",
                border: "none",
                cursor: index === total - 1 ? "not-allowed" : "pointer",
                color: index === total - 1 ? "#D0D0E0" : "#6B6B8A",
                padding: 3,
                display: "flex",
                alignItems: "center",
              }}
              title="Move down"
            >
              <ChevronDown size={13} />
            </button>
            <button
              onClick={() => onDelete(action.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#EF4444",
                padding: 3,
                display: "flex",
                alignItems: "center",
              }}
              title="Delete action"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {configDefs.map((def, di) => (
          <div
            key={`${action.id}-cfg-${di}`}
            style={{ marginBottom: di < configDefs.length - 1 ? 8 : 0 }}
          >
            <label
              htmlFor={`action-cfg-${action.id}-${di}`}
              style={{
                fontSize: 11,
                color: "#6B6B8A",
                marginBottom: 3,
                display: "block",
              }}
            >
              {def.label}
            </label>
            <input
              id={`action-cfg-${action.id}-${di}`}
              type="text"
              value={
                di === 0
                  ? action.config.field1Value
                  : (action.config.field2Value ?? "")
              }
              onChange={(e) =>
                onConfigChange(
                  action.id,
                  di === 0 ? "field1Value" : "field2Value",
                  e.target.value,
                )
              }
              placeholder={def.placeholder}
              style={{
                width: "100%",
                padding: "6px 9px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 11,
                color: "#1A1A2E",
                background: "#FAFAFE",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
      {index < total - 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "6px 0",
            color: "#A0A0B8",
          }}
        >
          <ArrowDown size={14} />
        </div>
      )}
    </div>
  );
}

// ─── Actions Section ──────────────────────────────────────────────────────────

export default function ActionConfigurator(
  props: Readonly<{
    actions: AutomationAction[];
    onAdd: () => void;
    onTypeChange: (id: string, type: string) => void;
    onConfigChange: (
      id: string,
      field: "field1Value" | "field2Value",
      value: string,
    ) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onDelete: (id: string) => void;
  }>,
) {
  const {
    actions,
    onAdd,
    onTypeChange,
    onConfigChange,
    onMoveUp,
    onMoveDown,
    onDelete,
  } = props;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "rgba(34,197,94,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={12} color="#22C55E" />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#1A1A2E",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Actions
        </span>
        <button
          onClick={onAdd}
          style={{
            marginLeft: "auto",
            background: "rgba(108,71,255,0.08)",
            border: "1px solid rgba(108,71,255,0.2)",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            color: "#6C47FF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={11} /> Add Action
        </button>
      </div>
      {actions.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed rgba(0,0,0,0.12)",
            borderRadius: 10,
            padding: "24px",
            textAlign: "center",
            color: "#A0A0B8",
            fontSize: 11,
          }}
        >
          No actions yet \u2014 add one above
        </div>
      )}
      {actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {actions.map((action, i) => (
            <ActionCard
              key={action.id}
              action={action}
              index={i}
              total={actions.length}
              onTypeChange={onTypeChange}
              onConfigChange={onConfigChange}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
