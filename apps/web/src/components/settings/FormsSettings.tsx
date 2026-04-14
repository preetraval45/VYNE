"use client";

import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, ArrowLeft, FormInput } from "lucide-react";
import { FormBuilder, type FormSchema } from "@/components/shared/FormBuilder";

interface Props {
  readonly onToast: (message: string) => void;
}

const STORAGE_KEY = "vyne-forms";

function loadForms(): FormSchema[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FormSchema[];
  } catch {
    return [];
  }
}

function saveForms(forms: FormSchema[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
  } catch {
    // ignore
  }
}

export default function FormsSettings({ onToast }: Props) {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [editing, setEditing] = useState<FormSchema | "new" | null>(null);

  useEffect(() => {
    setForms(loadForms());
  }, []);

  function handleSave(schema: FormSchema) {
    setForms((prev) => {
      const exists = prev.some((f) => f.id === schema.id);
      const next = exists
        ? prev.map((f) => (f.id === schema.id ? schema : f))
        : [schema, ...prev];
      saveForms(next);
      return next;
    });
    onToast(`Form "${schema.name}" saved`);
    setEditing(null);
  }

  function handleRemove(id: string) {
    setForms((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveForms(next);
      return next;
    });
    onToast("Form deleted");
  }

  if (editing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 14,
          }}
        >
          <ArrowLeft size={14} /> Back to forms
        </button>
        <FormBuilder
          initialSchema={editing === "new" ? undefined : editing}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Custom forms
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Build forms with the drag-style field palette. Use them in custom
              workflows, automations, or embed them in docs.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={13} /> New form
          </button>
        </div>

        {forms.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            <FormInput
              size={22}
              style={{
                margin: "0 auto 8px",
                color: "var(--text-tertiary)",
                display: "block",
              }}
            />
            No forms yet. Build your first form above.
          </div>
        ) : (
          forms.map((f, idx) => (
            <div
              key={f.id}
              style={{
                padding: "12px 18px",
                borderTop: idx > 0 ? "1px solid var(--content-border)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <FormInput size={14} style={{ color: "var(--vyne-purple)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {f.fields.length} field{f.fields.length === 1 ? "" : "s"} · updated{" "}
                  {new Date(f.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Edit ${f.name}`}
                onClick={() => setEditing(f)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Edit3 size={12} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${f.name}`}
                onClick={() => handleRemove(f.id)}
                style={{
                  width: 28,
                  height: 28,
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
          ))
        )}
      </div>
    </div>
  );
}
