"use client";

import { useState } from "react";
import { Bookmark, Plus, Pin, X, Link2 } from "lucide-react";
import type { UseSavedViewsResult, SavedView } from "@/hooks/useSavedViews";

interface Props<T extends Record<string, unknown>> {
  store: UseSavedViewsResult<T>;
  /** Short page label, e.g. "deals" — used in the save-prompt placeholder. */
  noun: string;
}

export function SavedViewsBar<T extends Record<string, unknown>>({
  store,
  noun,
}: Props<T>) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [copied, setCopied] = useState(false);

  function copyShareUrl() {
    const url = store.getShareUrl();
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      role="toolbar"
      aria-label="Saved views"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        padding: "8px 14px",
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      <Bookmark size={13} style={{ color: "var(--text-tertiary)" }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
          marginRight: 4,
        }}
      >
        Views
      </span>

      <button
        type="button"
        onClick={() => store.selectView(null)}
        aria-pressed={!store.activeViewId}
        style={chip(!store.activeViewId)}
      >
        All
      </button>

      {store.views.map((v: SavedView<T>) => {
        const active = v.id === store.activeViewId;
        return (
          <span
            key={v.id}
            style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          >
            <button type="button" onClick={() => store.selectView(v.id)} aria-pressed={active} style={chip(active, v.color)}>
              {v.pinned && <Pin size={10} />}
              {v.name}
            </button>
            {!v.builtin && active && (
              <button
                type="button"
                onClick={() => store.deleteView(v.id)}
                aria-label={`Delete view ${v.name}`}
                title="Delete view"
                style={miniBtn}
              >
                <X size={10} />
              </button>
            )}
          </span>
        );
      })}

      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = draftName.trim();
            if (!name) {
              setRenaming(false);
              return;
            }
            store.saveView(name);
            setRenaming(false);
            setDraftName("");
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => setRenaming(false)}
            placeholder={`Save current ${noun} view…`}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              fontSize: 11.5,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              minWidth: 160,
            }}
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setRenaming(true)}
          aria-label="Save current filters as a view"
          title="Save current filters as a view"
          style={miniBtn}
        >
          <Plus size={11} />
        </button>
      )}

      <button
        type="button"
        onClick={copyShareUrl}
        aria-label="Copy shareable URL for current view"
        title={copied ? "Copied!" : "Copy share URL"}
        style={{
          ...miniBtn,
          color: copied ? "#0F9D58" : "var(--text-tertiary)",
        }}
      >
        <Link2 size={11} />
      </button>
    </div>
  );
}

function chip(active: boolean, color?: string): React.CSSProperties {
  const accent = color ?? "var(--vyne-accent, var(--vyne-purple))";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    height: 24,
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? accent : "var(--content-border)"}`,
    background: active ? "rgba(108,71,255,0.10)" : "var(--content-bg)",
    color: active ? accent : "var(--text-secondary)",
  };
}

const miniBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-tertiary)",
  cursor: "pointer",
};
