import { Zap } from "lucide-react";
import { TRIGGER_GROUPS, TRIGGER_CONFIG_FIELDS } from "./types";

export default function TriggerSection(
  props: Readonly<{
    triggerType: string;
    triggerConfig: Record<string, string>;
    onTriggerChange: (value: string) => void;
    onConfigChange: (key: string, value: string) => void;
  }>,
) {
  const { triggerType, triggerConfig, onTriggerChange, onConfigChange } = props;
  const configFields = TRIGGER_CONFIG_FIELDS[triggerType] ?? [];

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
            background: "rgba(108,71,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap size={12} color="#6C47FF" />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Trigger
        </span>
      </div>
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <label
          htmlFor="trigger-type-select"
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            marginBottom: 5,
            display: "block",
          }}
        >
          Trigger Type
        </label>
        <select
          id="trigger-type-select"
          value={triggerType}
          onChange={(e) => onTriggerChange(e.target.value)}
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: 7,
            border: "1px solid var(--content-border)",
            fontSize: 12,
            color: "var(--text-primary)",
            background: "var(--content-secondary)",
            marginBottom: configFields.length > 0 ? 12 : 0,
            appearance: "none",
            cursor: "pointer",
          }}
        >
          <option value="">\u2014 Select a trigger \u2014</option>
          {TRIGGER_GROUPS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {configFields.map((field) => (
          <div key={`${triggerType}-${field.key}`} style={{ marginBottom: 10 }}>
            <label
              htmlFor={`trigger-cfg-${field.key}`}
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
                display: "block",
              }}
            >
              {field.label}
            </label>
            <input
              id={`trigger-cfg-${field.key}`}
              type="text"
              value={triggerConfig[field.key] ?? ""}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--content-border)",
                fontSize: 12,
                color: "var(--text-primary)",
                background: "var(--content-secondary)",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
