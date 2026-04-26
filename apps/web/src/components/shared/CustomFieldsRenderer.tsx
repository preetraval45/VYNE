"use client";

import type { CustomField } from "@/lib/stores/customFields";

// Shared input/list renderers for admin-defined custom fields. Used by
// any module (CRM deals, projects tasks, ops orders, etc.) so the
// schema editor's output actually shows up on real records.

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

interface FieldsFormProps {
  readonly fields: ReadonlyArray<CustomField>;
  readonly values: Record<string, string>;
  readonly onChange: (id: string, value: string) => void;
  readonly title?: string;
}

/** Editable form section. Renders nothing if there are no custom fields. */
export function CustomFieldsForm({
  fields,
  values,
  onChange,
  title = "Custom fields",
}: FieldsFormProps) {
  if (fields.length === 0) return null;
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "14px 16px",
        marginTop: 4,
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map((f) => (
          <label key={f.id} style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              {f.label}
            </span>
            {renderInput(f, values[f.id] ?? "", (v) => onChange(f.id, v))}
          </label>
        ))}
      </div>
    </section>
  );
}

function renderInput(
  f: CustomField,
  value: string,
  onChange: (v: string) => void,
) {
  if (f.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === "true"}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        aria-label={f.label}
      />
    );
  }
  if (f.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={f.label}
        style={inputStyle}
      >
        <option value="">—</option>
        {(f.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  let inputType: "text" | "number" | "date" = "text";
  if (f.type === "number") inputType = "number";
  else if (f.type === "date") inputType = "date";
  return (
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={f.label}
      style={inputStyle}
    />
  );
}

interface FieldsListProps {
  readonly fields: ReadonlyArray<CustomField>;
  readonly values: Record<string, string> | undefined;
}

/** Read-only renderer for detail panels. */
export function CustomFieldsList({ fields, values }: FieldsListProps) {
  if (fields.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {fields.map((f) => {
        const v = values?.[f.id];
        return (
          <div
            key={f.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 160px) 1fr",
              gap: 12,
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-tertiary)" }}>{f.label}</span>
            <span style={{ color: "var(--text-primary)" }}>
              {formatValue(f, v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(f: CustomField, v: string | undefined): string {
  if (v === undefined || v === "") return "—";
  if (f.type === "checkbox") return v === "true" ? "Yes" : "No";
  return v;
}
