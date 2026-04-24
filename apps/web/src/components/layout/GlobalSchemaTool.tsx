"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { FieldSchemaEditor } from "@/components/shared/FieldSchemaEditor";
import { useUser } from "@/lib/stores/auth";

// Modules whose record shape admins may customize. Keep labels friendly.
const MODULES: Array<{ id: string; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "crm", label: "CRM · Deals" },
  { id: "contacts", label: "Contacts" },
  { id: "sales", label: "Sales · Orders" },
  { id: "purchase", label: "Purchase · Bills" },
  { id: "invoicing", label: "Invoicing" },
  { id: "finance", label: "Finance · Journal" },
  { id: "hr", label: "HR · Employees" },
  { id: "expenses", label: "Expenses" },
  { id: "ops", label: "Ops / ERP" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "maintenance", label: "Maintenance" },
  { id: "marketing", label: "Marketing" },
];

// Admins can mutate the schema. Anyone else sees a tooltip explaining why.
const ADMIN_ROLES = new Set(["owner", "admin"]);

function inferModuleFromPath(pathname: string | null | undefined): string {
  if (!pathname) return "projects";
  const seg = pathname.split("/").filter(Boolean)[0];
  return MODULES.find((m) => m.id === seg)?.id ?? "projects";
}

/**
 * Floating top-right toolbar button. Only rendered on authenticated dashboard
 * pages (via DashboardLayout). Opens a module picker → FieldSchemaEditor so
 * admins can shape every module's fields + statuses per company.
 */
export function GlobalSchemaTool() {
  const user = useUser();
  const pathname = usePathname();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editorModule, setEditorModule] = useState<string | null>(null);

  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;

  function handleClick() {
    // Pre-select the module the user is already looking at
    setSelected(inferModuleFromPath(pathname));
    setPickerOpen(true);
  }

  const label = isAdmin
    ? "Customize fields for this company"
    : "Only admins can customize fields";

  return (
    <>
      {/* Top-nav rail — a fixed strip across the top of the dashboard.
          Lives above the page-level header so page-level "+ New" /
          search buttons never collide with this admin tool. */}
      <div
        role="toolbar"
        aria-label="Workspace admin"
        className="global-topnav-rail"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          pointerEvents: "none",
        }}
      >
        <button
          type="button"
          onClick={handleClick}
          disabled={!isAdmin}
          aria-label={label}
          title={label}
          style={{
            pointerEvents: "auto",
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            color: isAdmin ? "var(--vyne-teal)" : "var(--text-tertiary)",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.55,
            boxShadow: "var(--elev-1)",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isAdmin) return;
            (e.currentTarget as HTMLElement).style.borderColor = "var(--vyne-teal)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--content-border)";
          }}
        >
          <Wrench size={14} />
        </button>
      </div>

      {pickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            zIndex: 220,
            padding: 40,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pick a module to customize"
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 520,
              padding: 22,
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
              outline: "none",
            }}
          >
            <header style={{ marginBottom: 14 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Customize per-company schema
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12.5,
                  color: "var(--text-tertiary)",
                }}
              >
                Pick a module to edit its fields and statuses. Changes apply to
                every record in that module for your workspace.
              </p>
            </header>

            <div
              role="listbox"
              aria-label="Modules"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 6,
                maxHeight: 320,
                overflowY: "auto",
                padding: 4,
                border: "1px solid var(--content-border)",
                borderRadius: 10,
                background: "var(--content-secondary)",
              }}
            >
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={selected === m.id}
                  onClick={() => setSelected(m.id)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    border:
                      selected === m.id
                        ? "1.5px solid var(--vyne-teal)"
                        : "1.5px solid transparent",
                    background:
                      selected === m.id
                        ? "var(--vyne-teal-soft)"
                        : "var(--content-bg)",
                    color:
                      selected === m.id
                        ? "var(--vyne-teal)"
                        : "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-teal"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  setEditorModule(selected);
                  setPickerOpen(false);
                }}
              >
                Open editor
              </button>
            </div>
          </div>
        </div>
      )}

      {editorModule && (
        <FieldSchemaEditor
          moduleId={editorModule}
          open={!!editorModule}
          onClose={() => setEditorModule(null)}
          title={`Customize ${MODULES.find((m) => m.id === editorModule)?.label ?? editorModule} fields`}
        />
      )}
    </>
  );
}
