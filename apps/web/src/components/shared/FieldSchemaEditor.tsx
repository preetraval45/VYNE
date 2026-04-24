"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, GripVertical, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCustomFieldsStore,
  type FieldType,
  type CustomField,
  type CustomStatus,
} from "@/lib/stores/customFields";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
];

const STATUS_COLORS = [
  "#06B6D4", // teal
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#0EA5E9", // sky
  "#EC4899", // pink
  "#71717A", // neutral
];

export function FieldSchemaEditor({
  moduleId,
  open,
  onClose,
  title = "Customize fields & statuses",
}: {
  moduleId: string;
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  // Subscribe to the schemas map only; resolve this module's schema via
  // the store's getSchema (now backed by frozen defaults, so repeated
  // calls return the same reference and don't trigger re-render loops).
  const schemasMap = useCustomFieldsStore((s) => s.schemas);
  const schema = schemasMap[moduleId] ?? useCustomFieldsStore.getState().getSchema(moduleId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);

  const [tab, setTab] = useState<"fields" | "statuses">("fields");
  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          background: "var(--content-bg)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          outline: "none",
          border: "1px solid var(--content-border)",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
              Add, rename, or remove custom fields and workflow statuses.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Schema section"
          style={{ display: "flex", padding: "0 22px", borderBottom: "1px solid var(--content-border)" }}
        >
          {(["fields", "statuses"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              style={{
                padding: "12px 14px",
                background: "transparent",
                border: "none",
                borderBottom: tab === k ? "2px solid var(--vyne-teal)" : "2px solid transparent",
                color: tab === k ? "var(--vyne-teal)" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              {k === "fields" ? "Fields" : "Statuses"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {tab === "fields" ? (
            <FieldsTab schema={schema} moduleId={moduleId} />
          ) : (
            <StatusesTab schema={schema} moduleId={moduleId} />
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderTop: "1px solid var(--content-border)",
            background: "var(--content-bg-secondary)",
          }}
        >
          <button
            type="button"
            onClick={() => useCustomFieldsStore.getState().resetModule(moduleId)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--text-tertiary)",
              background: "transparent",
              border: "1px solid var(--content-border)",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
          <button type="button" onClick={onClose} className="btn-teal">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── Fields tab ───────────────────────────────────────────── */
function FieldsTab({
  schema,
  moduleId,
}: {
  schema: { fields: CustomField[] };
  moduleId: string;
}) {
  const addField = useCustomFieldsStore((s) => s.addField);
  const updateField = useCustomFieldsStore((s) => s.updateField);
  const removeField = useCustomFieldsStore((s) => s.removeField);
  const reorderFields = useCustomFieldsStore((s) => s.reorderFields);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div>
      {schema.fields.length === 0 && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            margin: "0 0 12px",
            textAlign: "center",
            padding: "16px 12px",
            background: "var(--content-secondary)",
            borderRadius: 10,
            border: "1px dashed var(--content-border)",
          }}
        >
          No custom fields yet. Add one below.
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {schema.fields.map((field, i) => (
          <li
            key={field.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", `field:${i}`);
              setDraggingIdx(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverIdx(i);
            }}
            onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              if (raw.startsWith("field:")) {
                const from = Number(raw.slice(6));
                if (!Number.isNaN(from) && from !== i) reorderFields(moduleId, from, i);
              }
              setDraggingIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDraggingIdx(null);
              setOverIdx(null);
            }}
            style={{
              display: "grid",
              gridTemplateColumns: "18px 1fr 130px 36px",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${overIdx === i && draggingIdx !== null && draggingIdx !== i ? "var(--vyne-teal)" : "var(--content-border)"}`,
              background: overIdx === i && draggingIdx !== null && draggingIdx !== i ? "var(--vyne-teal-soft)" : "var(--content-bg)",
              opacity: draggingIdx === i ? 0.45 : 1,
              transition: "border-color 0.12s, background 0.12s",
              cursor: "grab",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--text-tertiary)", cursor: "grab" }}>
              <GripVertical size={14} />
            </span>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(moduleId, field.id, { label: e.target.value })}
              aria-label={`Field label for ${field.label || "new field"}`}
              placeholder="Field name"
              style={fieldInput}
            />
            <select
              value={field.type}
              onChange={(e) =>
                updateField(moduleId, field.id, { type: e.target.value as FieldType })
              }
              aria-label="Field type"
              style={fieldInput}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeField(moduleId, field.id)}
              aria-label={`Remove ${field.label || "field"}`}
              style={iconBtn}
            >
              <Trash2 size={14} />
            </button>

            {/* Select options (second row when applicable) */}
            {field.type === "select" && (
              <div style={{ gridColumn: "2 / -1", marginTop: 4 }}>
                <input
                  type="text"
                  value={field.options?.join(", ") ?? ""}
                  onChange={(e) =>
                    updateField(moduleId, field.id, {
                      options: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  aria-label="Select options, comma separated"
                  placeholder="Options, comma separated (e.g. Low, Medium, High)"
                  style={{ ...fieldInput, width: "100%" }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          addField(moduleId, { label: "New field", type: "text" });
          toast.success("Field added — visible now on create forms and task detail");
        }}
        style={addBtn}
      >
        <Plus size={14} /> Add field
      </button>
    </div>
  );
}

/* ─── Statuses tab ───────────────────────────────────────────── */
function StatusesTab({
  schema,
  moduleId,
}: {
  schema: { statuses: CustomStatus[] };
  moduleId: string;
}) {
  const addStatus = useCustomFieldsStore((s) => s.addStatus);
  const updateStatus = useCustomFieldsStore((s) => s.updateStatus);
  const removeStatus = useCustomFieldsStore((s) => s.removeStatus);
  const reorderStatuses = useCustomFieldsStore((s) => s.reorderStatuses);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div>
      {schema.statuses.length === 0 && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            margin: "0 0 12px",
            textAlign: "center",
            padding: "16px 12px",
            background: "var(--content-secondary)",
            borderRadius: 10,
            border: "1px dashed var(--content-border)",
          }}
        >
          No statuses yet. Add one below.
        </p>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {schema.statuses.map((status, i) => (
          <li
            key={status.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", `status:${i}`);
              setDraggingIdx(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverIdx(i);
            }}
            onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              if (raw.startsWith("status:")) {
                const from = Number(raw.slice(7));
                if (!Number.isNaN(from) && from !== i) reorderStatuses(moduleId, from, i);
              }
              setDraggingIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDraggingIdx(null);
              setOverIdx(null);
            }}
            style={{
              display: "grid",
              gridTemplateColumns: "18px 36px 1fr 36px",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${overIdx === i && draggingIdx !== null && draggingIdx !== i ? "var(--vyne-teal)" : "var(--content-border)"}`,
              background: overIdx === i && draggingIdx !== null && draggingIdx !== i ? "var(--vyne-teal-soft)" : "var(--content-bg)",
              opacity: draggingIdx === i ? 0.45 : 1,
              transition: "border-color 0.12s, background 0.12s",
              cursor: "grab",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--text-tertiary)", cursor: "grab" }}>
              <GripVertical size={14} />
            </span>
            <ColorPickerPill
              value={status.color}
              onChange={(c) => updateStatus(moduleId, status.id, { color: c })}
            />
            <input
              type="text"
              value={status.label}
              onChange={(e) => updateStatus(moduleId, status.id, { label: e.target.value })}
              aria-label={`Status label for ${status.label}`}
              placeholder="Status name"
              style={fieldInput}
            />
            <button
              type="button"
              onClick={() => removeStatus(moduleId, status.id)}
              aria-label={`Remove ${status.label}`}
              style={iconBtn}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          {
            addStatus(moduleId, { label: "New status", color: STATUS_COLORS[0] });
            toast.success("Status added — pipelines and boards will pick it up");
          }
        }
        style={addBtn}
      >
        <Plus size={14} /> Add status
      </button>
    </div>
  );
}

function ColorPickerPill({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change color"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: value,
          border: "2px solid var(--content-bg)",
          boxShadow: `0 0 0 1px var(--content-border)`,
          cursor: "pointer",
          padding: 0,
        }}
      />
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            padding: 8,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            zIndex: 5,
          }}
        >
          {STATUS_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c,
                border: value === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const fieldInput: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  color: "var(--text-tertiary)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const addBtn: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px dashed var(--content-border)",
  background: "transparent",
  color: "var(--vyne-teal)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};
