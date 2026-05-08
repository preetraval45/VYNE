"use client";

// Field-level permissions editor (UI_UPGRADE_PLAN.md 7.3).
//
// Settings → Security surface that lists every {entity, field, action,
// roles[]} rule + lets admins author new ones. Drives the existing
// useFieldPermissions store; helpers in lib/stores/fieldPermissions
// (canRead / canWrite / maskField) read this same store at call time
// so the rules light up immediately across detail panels + lists.

import { useState } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Edit3,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useFieldPermissions,
  type FieldAction,
  type FieldPermissionRule,
} from "@/lib/stores/fieldPermissions";
import type { RoleId } from "@/lib/stores/securityPolicy";

const ROLES: RoleId[] = ["owner", "admin", "manager", "member", "guest"];
const ACTIONS: Array<{
  id: FieldAction;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  {
    id: "mask",
    label: "Mask",
    description: "Hide value behind ••• for these roles",
    icon: EyeOff,
  },
  {
    id: "read",
    label: "Read-only",
    description: "Show value but block writes for these roles",
    icon: Eye,
  },
  {
    id: "write",
    label: "Write",
    description: "Allow these roles to update the field",
    icon: Edit3,
  },
];

const COMMON_ENTITIES = [
  "contact",
  "deal",
  "customer",
  "invoice",
  "product",
  "order",
  "supplier",
  "task",
  "project",
  "account",
  "employee",
  "expense",
  "integration",
  "journalEntry",
];

const ACTION_BG: Record<FieldAction, string> = {
  mask: "var(--accent-error-soft)",
  read: "rgba(245, 158, 11, 0.10)",
  write: "var(--vyne-accent-soft, var(--content-elevated))",
};

const ACTION_FG: Record<FieldAction, string> = {
  mask: "var(--accent-error)",
  read: "rgb(245, 158, 11)",
  write: "var(--vyne-accent, var(--vyne-purple))",
};

function emptyDraft(): Omit<FieldPermissionRule, "id" | "createdAt"> {
  return {
    entity: "",
    field: "",
    action: "mask",
    roles: ["member", "guest"],
  };
}

export function FieldPermissionsEditor() {
  const rules = useFieldPermissions((s) => s.rules);
  const addRule = useFieldPermissions((s) => s.addRule);
  const removeRule = useFieldPermissions((s) => s.removeRule);

  const [draft, setDraft] = useState<
    Omit<FieldPermissionRule, "id" | "createdAt"> | null
  >(null);

  function start() {
    setDraft(emptyDraft());
  }
  function cancel() {
    setDraft(null);
  }
  function save() {
    if (!draft) return;
    if (!draft.entity.trim() || !draft.field.trim()) {
      toast.error("entity and field are required");
      return;
    }
    if (draft.roles.length === 0) {
      toast.error("Pick at least one role");
      return;
    }
    addRule({
      entity: draft.entity.trim(),
      field: draft.field.trim(),
      action: draft.action,
      roles: draft.roles,
    });
    toast.success("Rule added");
    setDraft(null);
  }

  function toggleRole(role: RoleId) {
    if (!draft) return;
    setDraft({
      ...draft,
      roles: draft.roles.includes(role)
        ? draft.roles.filter((r) => r !== role)
        : [...draft.roles, role],
    });
  }

  // Group rules by entity for compact display.
  const grouped = rules.reduce<Record<string, FieldPermissionRule[]>>(
    (acc, r) => {
      if (!acc[r.entity]) acc[r.entity] = [];
      acc[r.entity].push(r);
      return acc;
    },
    {},
  );
  const entities = Object.keys(grouped).sort();

  return (
    <section
      aria-labelledby="field-perms-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lock size={16} aria-hidden="true" />
        <h2 id="field-perms-heading" style={{ margin: 0, fontSize: 16 }}>
          Field permissions
        </h2>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {rules.length} rule{rules.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={start}
          disabled={draft !== null}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 12px",
            fontSize: 12,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: draft === null ? "pointer" : "not-allowed",
            opacity: draft === null ? 1 : 0.5,
          }}
        >
          <Plus size={12} />
          New rule
        </button>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        Restrict who can read or write specific fields. <code>mask</code>{" "}
        replaces the value with ••• for the listed roles, <code>read</code>{" "}
        blocks writes only, and <code>write</code> allows mutations. Server
        gates in <code>lib/api/crud.ts</code> mirror these rules so the
        client and server agree.
      </p>

      {draft && (
        <div
          style={{
            padding: 12,
            background: "var(--content-elevated)",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
                minWidth: 160,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Entity
              </span>
              <input
                value={draft.entity}
                onChange={(e) =>
                  setDraft({ ...draft, entity: e.target.value })
                }
                list="field-perm-entities"
                placeholder="contact, deal, employee…"
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                }}
              />
              <datalist id="field-perm-entities">
                {COMMON_ENTITIES.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
                minWidth: 160,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Field
              </span>
              <input
                value={draft.field}
                onChange={(e) =>
                  setDraft({ ...draft, field: e.target.value })
                }
                placeholder="ssn, salary, secret…"
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono, ui-monospace, monospace)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Action
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACTIONS.map((a) => {
                const active = draft.action === a.id;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, action: a.id })}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 12px",
                      fontSize: 12,
                      border: `1px solid ${active ? ACTION_FG[a.id] : "var(--content-border)"}`,
                      borderRadius: 6,
                      background: active ? ACTION_BG[a.id] : "transparent",
                      color: active ? ACTION_FG[a.id] : "var(--text-primary)",
                      cursor: "pointer",
                    }}
                    title={a.description}
                  >
                    <Icon size={11} />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Apply to roles
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {ROLES.map((role) => {
                const active = draft.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    aria-pressed={active}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                      borderRadius: 99,
                      background: active
                        ? "var(--vyne-accent, var(--vyne-purple))"
                        : "transparent",
                      color: active ? "#fff" : "var(--text-primary)",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={save}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                border: "1px solid var(--vyne-accent, var(--vyne-purple))",
                borderRadius: 6,
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Save rule
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{
                padding: "5px 10px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {entities.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--content-border)",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          No field rules yet. Click "New rule" to add one.
        </div>
      ) : (
        entities.map((entity) => (
          <div
            key={entity}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {entity}
            </h3>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {grouped[entity].map((rule) => (
                <li
                  key={rule.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "var(--content-elevated)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 6,
                  }}
                >
                  <Shield
                    size={13}
                    aria-hidden="true"
                    color={ACTION_FG[rule.action]}
                  />
                  <code
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    }}
                  >
                    {rule.entity}.{rule.field}
                  </code>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: ACTION_BG[rule.action],
                      color: ACTION_FG[rule.action],
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {rule.action}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {rule.roles.map((r) => (
                      <span
                        key={r}
                        style={{
                          fontSize: 11,
                          padding: "1px 8px",
                          borderRadius: 99,
                          background: "var(--content-bg)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-secondary)",
                          textTransform: "capitalize",
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete the rule for ${rule.entity}.${rule.field}?`,
                        )
                      ) {
                        removeRule(rule.id);
                      }
                    }}
                    aria-label={`Delete rule for ${rule.entity}.${rule.field}`}
                    title="Delete"
                    style={{
                      marginLeft: "auto",
                      width: 26,
                      height: 26,
                      border: "1px solid var(--content-border)",
                      borderRadius: 5,
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
