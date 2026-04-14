"use client";

import { useState } from "react";
import { Plus, Trash2, Edit3, Save, X } from "lucide-react";
import { useSnippetsStore, type Snippet } from "@/lib/stores/snippets";
import { openProductTour } from "@/components/layout/ProductTour";

interface Props {
  readonly onToast: (message: string) => void;
}

const CATEGORIES: Snippet["category"][] = ["chat", "docs", "email", "other"];

export default function SnippetsSettings({ onToast }: Props) {
  const snippets = useSnippetsStore((s) => s.snippets);
  const createSnippet = useSnippetsStore((s) => s.create);
  const updateSnippet = useSnippetsStore((s) => s.update);
  const removeSnippet = useSnippetsStore((s) => s.remove);

  const [draft, setDraft] = useState<{
    shortcut: string;
    title: string;
    body: string;
    category: Snippet["category"];
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function startCreate() {
    setDraft({ shortcut: "/", title: "", body: "", category: "chat" });
    setEditingId(null);
  }

  function startEdit(s: Snippet) {
    setDraft({
      shortcut: s.shortcut,
      title: s.title,
      body: s.body,
      category: s.category,
    });
    setEditingId(s.id);
  }

  function cancel() {
    setDraft(null);
    setEditingId(null);
  }

  function save() {
    if (!draft) return;
    const shortcut = draft.shortcut.startsWith("/")
      ? draft.shortcut
      : "/" + draft.shortcut;
    if (!shortcut.trim() || !draft.title.trim() || !draft.body.trim()) {
      onToast("Shortcut, title, and body are all required");
      return;
    }
    if (editingId) {
      updateSnippet(editingId, { ...draft, shortcut });
      onToast("Snippet updated");
    } else {
      createSnippet({ ...draft, shortcut });
      onToast("Snippet added");
    }
    cancel();
  }

  return (
    <div>
      {/* Intro + quick actions */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Saved responses
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Type a shortcut in chat ({" "}
              <code
                style={{
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  background: "var(--content-secondary)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                /eta
              </code>{" "}
              ) to insert the body. Use <code>{"{{variable}}"}</code> for
              placeholders you&apos;ll fill in manually.
            </div>
          </div>
          <button
            type="button"
            onClick={startCreate}
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
            <Plus size={13} /> New snippet
          </button>
        </div>

        {/* Draft form */}
        {draft && (
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid var(--content-border)",
              background: "rgba(108,71,255,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={draft.shortcut}
                onChange={(e) => setDraft({ ...draft, shortcut: e.target.value })}
                placeholder="/shortcut"
                aria-label="Shortcut"
                style={{
                  width: 140,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                  outline: "none",
                }}
              />
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Title (e.g. ETA reminder)"
                aria-label="Title"
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as Snippet["category"],
                  })
                }
                aria-label="Category"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="The snippet body — supports {{placeholders}}."
              aria-label="Body"
              rows={5}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                minHeight: 80,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={cancel}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
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
                <Save size={12} /> Save snippet
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {snippets.length === 0 && (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              No snippets yet — hit &ldquo;New snippet&rdquo; above.
            </div>
          )}
          {snippets.map((s, idx) => (
            <div
              key={s.id}
              style={{
                padding: "14px 18px",
                borderTop:
                  idx > 0 ? "1px solid var(--content-border)" : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "rgba(108,71,255,0.12)",
                  color: "var(--vyne-purple)",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                  flexShrink: 0,
                }}
              >
                {s.shortcut}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {s.category}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {s.body}
                </p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  aria-label={`Edit ${s.title}`}
                  onClick={() => startEdit(s)}
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
                  <Edit3 size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${s.title}`}
                  onClick={() => {
                    removeSnippet(s.id);
                    onToast(`Deleted "${s.title}"`);
                  }}
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
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replay tour */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          padding: "14px 18px",
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
            Replay product tour
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            See the 7-step walkthrough again.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            openProductTour();
            onToast("Tour starting…");
          }}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--vyne-purple)",
            background: "transparent",
            color: "var(--vyne-purple)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <X size={12} style={{ transform: "rotate(45deg)" }} />
          Start tour
        </button>
      </div>
    </div>
  );
}
