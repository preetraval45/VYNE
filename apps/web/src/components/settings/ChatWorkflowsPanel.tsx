"use client";

// Chat workflow editor (UI_UPGRADE_PLAN.md 6.3).
//
// Settings → Workspace surface that lists trigger-action rules + lets
// admins create new ones. Triggers: contains text / regex / @mention /
// reaction. Actions: post a notify, drop an inline action block, or
// run an AI tool. The matcher is in lib/stores/chatWorkflows.

import { useState } from "react";
import {
  Workflow,
  Plus,
  Save,
  Trash2,
  X,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useChatWorkflows,
  type ChatWorkflow,
  type TriggerKind,
  type ActionKind,
} from "@/lib/stores/chatWorkflows";

const TRIGGER_HELP: Record<TriggerKind, string> = {
  contains: "Message text contains this string (case-insensitive).",
  regex: "Message text matches this JS regex.",
  mention: "Message mentions this user id / display name.",
  reaction: "Message gets this emoji reaction (matched on the reaction bus).",
};

const ACTION_HELP: Record<ActionKind, string> = {
  tool: "Invoke a tool from the catalog (createDeal, queryTasks, …).",
  notify: "Drop a row in the notification bell.",
  "post-action-block":
    "Reply with an inline Approve/Reject card the user can click.",
};

function emptyDraft(): ChatWorkflow {
  return {
    id: "__new__",
    name: "",
    channelId: "*",
    conditions: [{ kind: "contains", value: "" }],
    action: { kind: "notify", notifyTitle: "", notifyBody: "" },
    enabled: true,
    createdAt: new Date().toISOString(),
    fireCount: 0,
  };
}

export function ChatWorkflowsPanel() {
  const workflows = useChatWorkflows((s) => s.workflows);
  const saveWorkflow = useChatWorkflows((s) => s.saveWorkflow);
  const removeWorkflow = useChatWorkflows((s) => s.removeWorkflow);
  const toggleWorkflow = useChatWorkflows((s) => s.toggleWorkflow);

  const [draft, setDraft] = useState<ChatWorkflow | null>(null);

  function start() {
    setDraft(emptyDraft());
  }
  function edit(w: ChatWorkflow) {
    setDraft({ ...w });
  }
  function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Name required");
      return;
    }
    saveWorkflow({
      id: draft.id === "__new__" ? undefined : draft.id,
      name: draft.name,
      channelId: draft.channelId.trim() || "*",
      conditions: draft.conditions,
      action: draft.action,
      enabled: draft.enabled,
    });
    toast.success("Workflow saved");
    setDraft(null);
  }

  return (
    <section
      aria-labelledby="chat-workflows-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Workflow size={16} aria-hidden="true" />
        <h2 id="chat-workflows-heading" style={{ margin: 0, fontSize: 16 }}>
          Chat workflows
        </h2>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {workflows.length} saved
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
          New workflow
        </button>
      </header>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
        When a message in a channel matches the trigger, the action fires.
        Use <code>*</code> for the channel id to match every channel.
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
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft({ ...draft, name: e.target.value })
              }
              placeholder="Name"
              style={{
                flex: 2,
                minWidth: 200,
                padding: "6px 10px",
                fontSize: 13,
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
            <input
              value={draft.channelId}
              onChange={(e) =>
                setDraft({ ...draft, channelId: e.target.value })
              }
              placeholder="Channel id (* = all)"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "6px 10px",
                fontSize: 13,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Conditions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              When (all must match)
            </span>
            {draft.conditions.map((c, idx) => (
              <div
                key={idx}
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                <select
                  value={c.kind}
                  onChange={(e) => {
                    const next = [...draft.conditions];
                    next[idx] = {
                      ...next[idx],
                      kind: e.target.value as TriggerKind,
                    };
                    setDraft({ ...draft, conditions: next });
                  }}
                  style={{
                    padding: "5px 8px",
                    fontSize: 12,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="contains">contains</option>
                  <option value="regex">regex</option>
                  <option value="mention">@mention</option>
                  <option value="reaction">reaction</option>
                </select>
                <input
                  value={c.value}
                  onChange={(e) => {
                    const next = [...draft.conditions];
                    next[idx] = { ...next[idx], value: e.target.value };
                    setDraft({ ...draft, conditions: next });
                  }}
                  placeholder={TRIGGER_HELP[c.kind]}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    fontSize: 12,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                  }}
                />
                {draft.conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = draft.conditions.filter((_, i) => i !== idx);
                      setDraft({ ...draft, conditions: next });
                    }}
                    aria-label="Remove condition"
                    style={{
                      width: 24,
                      height: 24,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  conditions: [
                    ...draft.conditions,
                    { kind: "contains", value: "" },
                  ],
                })
              }
              style={{
                alignSelf: "flex-start",
                fontSize: 11,
                padding: "3px 10px",
                border: "1px solid var(--content-border)",
                borderRadius: 5,
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              + Add condition
            </button>
          </div>

          {/* Action */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Then
            </span>
            <select
              value={draft.action.kind}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  action: { ...draft.action, kind: e.target.value as ActionKind },
                })
              }
              style={{
                padding: "5px 8px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 5,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
                alignSelf: "flex-start",
              }}
            >
              <option value="notify">notify</option>
              <option value="tool">tool</option>
              <option value="post-action-block">post action block</option>
            </select>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {ACTION_HELP[draft.action.kind]}
            </span>

            {draft.action.kind === "notify" && (
              <>
                <input
                  value={draft.action.notifyTitle ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      action: {
                        ...draft.action,
                        notifyTitle: e.target.value,
                      },
                    })
                  }
                  placeholder="Notification title"
                  style={{
                    padding: "5px 8px",
                    fontSize: 12,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  value={draft.action.notifyBody ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      action: {
                        ...draft.action,
                        notifyBody: e.target.value,
                      },
                    })
                  }
                  placeholder="Notification body (optional)"
                  style={{
                    padding: "5px 8px",
                    fontSize: 12,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                  }}
                />
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={save}
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
                cursor: "pointer",
              }}
            >
              <Save size={12} />
              Save
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
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

      {workflows.length === 0 ? (
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
          No chat workflows yet. Click "New workflow" to add one.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {workflows.map((w) => (
            <li
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "var(--content-elevated)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
              }}
            >
              <button
                type="button"
                onClick={() => toggleWorkflow(w.id)}
                aria-label={w.enabled ? "Disable" : "Enable"}
                title={w.enabled ? "Disable" : "Enable"}
                style={{
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "transparent",
                  color: w.enabled
                    ? "var(--accent-success)"
                    : "var(--text-tertiary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {w.enabled ? (
                  <ToggleRight size={16} />
                ) : (
                  <ToggleLeft size={16} />
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{w.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {w.channelId === "*" ? "all channels" : w.channelId} ·{" "}
                  {w.conditions.length} cond ·{" "}
                  fired {w.fireCount}× {w.lastFiredAt
                    ? `· last ${new Date(w.lastFiredAt).toLocaleDateString()}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => edit(w)}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  border: "1px solid var(--content-border)",
                  borderRadius: 5,
                  background: "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete workflow "${w.name}"?`))
                    removeWorkflow(w.id);
                }}
                aria-label="Delete"
                title="Delete"
                style={{
                  width: 28,
                  height: 28,
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
      )}
    </section>
  );
}
