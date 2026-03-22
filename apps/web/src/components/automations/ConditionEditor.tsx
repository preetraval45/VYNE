import { Plus, X, AlertTriangle } from "lucide-react";
import {
  type Condition,
  type ConditionOperator,
  type LogicOp,
  CONDITION_FIELDS,
  OPERATORS,
} from "./types";

// ─── Condition Row ────────────────────────────────────────────────────────────

function ConditionRow(
  props: Readonly<{
    condition: Condition;
    index: number;
    total: number;
    logic: LogicOp;
    onUpdate: (id: string, field: keyof Condition, value: string) => void;
    onDelete: (id: string) => void;
    onToggleLogic: () => void;
  }>,
) {
  const { condition, index, total, logic, onUpdate, onDelete, onToggleLogic } =
    props;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <select
          id={`cond-field-${condition.id}`}
          value={condition.field}
          onChange={(e) => onUpdate(condition.id, "field", e.target.value)}
          style={{
            flex: 2,
            padding: "5px 6px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 11,
            color: "#1A1A2E",
            background: "#FAFAFE",
          }}
        >
          <option value="">Field</option>
          {CONDITION_FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          id={`cond-op-${condition.id}`}
          value={condition.operator}
          onChange={(e) =>
            onUpdate(
              condition.id,
              "operator",
              e.target.value as ConditionOperator,
            )
          }
          style={{
            flex: 2,
            padding: "5px 6px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 11,
            color: "#1A1A2E",
            background: "#FAFAFE",
          }}
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <input
          id={`cond-val-${condition.id}`}
          type="text"
          value={condition.value}
          onChange={(e) => onUpdate(condition.id, "value", e.target.value)}
          placeholder="Value"
          style={{
            flex: 2,
            padding: "5px 6px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 11,
            color: "#1A1A2E",
            background: "#FAFAFE",
          }}
        />
        <button
          onClick={() => onDelete(condition.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#EF4444",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="Delete condition"
        >
          <X size={13} />
        </button>
      </div>
      {index < total - 1 && (
        <div
          style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}
        >
          <button
            onClick={onToggleLogic}
            style={{
              background: "rgba(108,71,255,0.1)",
              border: "1px solid rgba(108,71,255,0.2)",
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: "#6C47FF",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {logic}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Conditions Section ───────────────────────────────────────────────────────

export default function ConditionEditor(
  props: Readonly<{
    conditions: Condition[];
    logic: LogicOp;
    onAdd: () => void;
    onUpdate: (id: string, field: keyof Condition, value: string) => void;
    onDelete: (id: string) => void;
    onToggleLogic: () => void;
  }>,
) {
  const { conditions, logic, onAdd, onUpdate, onDelete, onToggleLogic } = props;
  const canAdd = conditions.length < 3;

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
            background: "rgba(245,158,11,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={12} color="#F59E0B" />
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
          Conditions{" "}
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              color: "#A0A0B8",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (optional)
          </span>
        </span>
        {canAdd && (
          <button
            onClick={onAdd}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px dashed rgba(0,0,0,0.2)",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              color: "#6B6B8A",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={11} /> Add Condition
          </button>
        )}
      </div>
      {conditions.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed rgba(0,0,0,0.12)",
            borderRadius: 10,
            padding: "16px",
            textAlign: "center",
            color: "#A0A0B8",
            fontSize: 11,
          }}
        >
          No conditions \u2014 automation runs on every trigger
        </div>
      )}
      {conditions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {conditions.map((cond, i) => (
            <ConditionRow
              key={cond.id}
              condition={cond}
              index={i}
              total={conditions.length}
              logic={logic}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleLogic={onToggleLogic}
            />
          ))}
        </div>
      )}
    </div>
  );
}
