"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Hash,
  Mail,
  Calendar,
  CheckSquare,
  List as ListIcon,
  Save,
} from "lucide-react";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "date"
  | "select"
  | "checkbox";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  /** select-only */
  options?: string[];
}

export interface FormSchema {
  id: string;
  name: string;
  fields: FormField[];
  updatedAt: string;
}

interface Props {
  initialSchema?: FormSchema;
  onSave: (schema: FormSchema) => void;
}

const TYPE_META: Record<FieldType, { label: string; icon: React.ElementType }> = {
  text: { label: "Short text", icon: Type },
  textarea: { label: "Long text", icon: Type },
  number: { label: "Number", icon: Hash },
  email: { label: "Email", icon: Mail },
  date: { label: "Date", icon: Calendar },
  select: { label: "Dropdown", icon: ListIcon },
  checkbox: { label: "Checkbox", icon: CheckSquare },
};

function newField(type: FieldType): FormField {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    label: TYPE_META[type].label,
    placeholder: "",
    required: false,
    options: type === "select" ? ["Option 1", "Option 2"] : undefined,
  };
}

export function FormBuilder({ initialSchema, onSave }: Props) {
  const [name, setName] = useState(initialSchema?.name ?? "Untitled form");
  const [fields, setFields] = useState<FormField[]>(
    initialSchema?.fields ?? [],
  );

  const addField = useCallback((type: FieldType) => {
    setFields((prev) => [...prev, newField(type)]);
  }, []);

  const updateField = useCallback(
    (id: string, patch: Partial<FormField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const save = useCallback(() => {
    const schema: FormSchema = {
      id: initialSchema?.id ?? `form-${Date.now()}`,
      name: name.trim() || "Untitled form",
      fields,
      updatedAt: new Date().toISOString(),
    };
    onSave(schema);
  }, [initialSchema, name, fields, onSave]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: 16,
      }}
    >
      {/* ── Canvas ──────────────────────────────────────────── */}
      <section
        style={{
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          background: "var(--content-bg)",
          padding: 16,
          minHeight: 320,
        }}
        aria-label="Form canvas"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Form name"
          aria-label="Form name"
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid transparent",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 18,
            fontWeight: 700,
            outline: "none",
            marginBottom: 14,
            borderRadius: 6,
          }}
        />

        {fields.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              border: "2px dashed var(--content-border)",
              borderRadius: 10,
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            Drag a field from the palette →<br />
            or tap a type to add it.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {fields.map((f, i) => (
              <li key={f.id}>
                <FieldRow
                  field={f}
                  isFirst={i === 0}
                  isLast={i === fields.length - 1}
                  onUpdate={(patch) => updateField(f.id, patch)}
                  onRemove={() => removeField(f.id)}
                  onMoveUp={() => move(f.id, -1)}
                  onMoveDown={() => move(f.id, 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Palette + save ──────────────────────────────────── */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <section
          style={{
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            background: "var(--content-bg)",
            padding: 14,
          }}
          aria-label="Field palette"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 10,
            }}
          >
            Field types
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {(Object.keys(TYPE_META) as FieldType[]).map((t) => {
              const m = TYPE_META[t];
              const Icon = m.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => addField(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 10px",
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 7,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={12} style={{ color: "var(--vyne-purple)" }} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            background: "var(--content-bg)",
            padding: 14,
          }}
          aria-label="Live preview"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 10,
            }}
          >
            Preview
          </div>
          {fields.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              Add a field to see the preview.
            </div>
          ) : (
            <FormPreview schema={{ id: "preview", name, fields, updatedAt: "" }} />
          )}
        </section>

        <button
          type="button"
          onClick={save}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(6, 182, 212,0.25)",
          }}
        >
          <Save size={13} />
          Save form
        </button>
      </aside>
    </div>
  );
}

function FieldRow({
  field,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FormField;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const m = TYPE_META[field.type];
  const Icon = m.icon;

  return (
    <div
      style={{
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: 12,
        background: "var(--content-secondary)",
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
        <Icon size={14} style={{ color: "var(--vyne-purple)" }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {m.label}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          aria-label="Move up"
          onClick={onMoveUp}
          disabled={isFirst}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            cursor: isFirst ? "default" : "pointer",
            opacity: isFirst ? 0.4 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={onMoveDown}
          disabled={isLast}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            cursor: isLast ? "default" : "pointer",
            opacity: isLast ? 0.4 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowDown size={12} />
        </button>
        <button
          type="button"
          aria-label="Remove field"
          onClick={onRemove}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--status-danger)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <input
        value={field.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="Field label"
        aria-label="Field label"
        style={{
          width: "100%",
          padding: "7px 10px",
          borderRadius: 6,
          border: "1px solid var(--input-border)",
          background: "var(--input-bg)",
          color: "var(--text-primary)",
          fontSize: 13,
          marginBottom: 8,
          outline: "none",
        }}
      />
      {field.type !== "checkbox" && (
        <input
          value={field.placeholder ?? ""}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Placeholder / help text"
          aria-label="Placeholder"
          style={{
            width: "100%",
            padding: "7px 10px",
            borderRadius: 6,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
        />
      )}

      {field.type === "select" && (
        <textarea
          value={(field.options ?? []).join("\n")}
          onChange={(e) =>
            onUpdate({
              options: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="One option per line"
          aria-label="Select options"
          rows={3}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "7px 10px",
            borderRadius: 6,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 12,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      )}

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
          fontSize: 12,
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={field.required ?? false}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          style={{ accentColor: "#06B6D4" }}
        />
        Required
      </label>
    </div>
  );
}

/** Renders the live preview using real HTML inputs. */
export function FormPreview({ schema }: { schema: FormSchema }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      {schema.fields.map((f) => (
        <div key={f.id}>
          <label
            htmlFor={`preview-${f.id}`}
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            {f.label}{" "}
            {f.required && (
              <span style={{ color: "var(--status-danger)" }}>*</span>
            )}
          </label>
          {renderInput(f, values, setValues)}
        </div>
      ))}
    </form>
  );
}

function renderInput(
  f: FormField,
  values: Record<string, string | boolean>,
  setValues: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>,
): React.ReactNode {
  const id = `preview-${f.id}`;
  const base: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
  };

  switch (f.type) {
    case "textarea":
      return (
        <textarea
          id={id}
          rows={3}
          placeholder={f.placeholder}
          required={f.required}
          value={(values[f.id] as string) ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, [f.id]: e.target.value }))
          }
          style={{ ...base, resize: "vertical", minHeight: 68 }}
        />
      );
    case "select":
      return (
        <select
          id={id}
          value={(values[f.id] as string) ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, [f.id]: e.target.value }))
          }
          aria-label={f.label}
          style={{ ...base, cursor: "pointer" }}
        >
          <option value="">Select…</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <label
          htmlFor={id}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            id={id}
            type="checkbox"
            checked={Boolean(values[f.id])}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.id]: e.target.checked }))
            }
            style={{ accentColor: "#06B6D4" }}
          />
          {f.placeholder ?? "Yes"}
        </label>
      );
    default:
      return (
        <input
          id={id}
          type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "date" ? "date" : "text"}
          placeholder={f.placeholder}
          required={f.required}
          value={(values[f.id] as string) ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, [f.id]: e.target.value }))
          }
          style={base}
        />
      );
  }
}
