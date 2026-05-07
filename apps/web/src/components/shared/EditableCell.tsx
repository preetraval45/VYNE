"use client";

import {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { optimisticAction } from "@/lib/optimistic";
import {
  subscribe,
  publishFromClient,
  isRealtimeEnabled,
} from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";

interface RemoteEditor {
  id: string;
  name: string;
  color: string;
  ts: number;
}

const PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** A Linear-style cell that displays a value until double-clicked, then
 *  becomes an input until Enter / blur (save) or Escape (cancel).
 *
 *  <EditableCell value={deal.value} onSave={(v) => update(id, { value: v })} type="number" />
 *
 *  Keyboard:
 *    - Double-click / Enter / F2 to edit
 *    - Enter / blur to save (calls onSave; no-op if unchanged or invalid)
 *    - Escape to cancel
 */
export interface EditableCellProps<V> {
  value: V;
  /** Called with the new, validated value. Do your own optimistic
   *  update here. Return a Promise to block the Enter keystroke while
   *  the save is in flight (currently not awaited — this is a mock-
   *  store app — but we accept it for future real-server use). */
  onSave: (next: V) => void | Promise<void>;
  /** "text" (default), "number", or "select". */
  type?: "text" | "number" | "select";
  /** Options required when type === "select". */
  options?: ReadonlyArray<{ value: V; label: string }>;
  /** Validate before save. Return a string for an error message to show
   *  as a tooltip, or null/undefined if valid. */
  validate?: (next: string) => string | null | undefined;
  /** How to render the value while not editing. Gets the current value
   *  and should return inline content that fits the cell. */
  render?: (v: V) => ReactNode;
  /** Extra style for the display state. */
  style?: CSSProperties;
  /** Extra style for the <input> when editing. */
  inputStyle?: CSSProperties;
  /** Applied to the outer container always. */
  className?: string;
  /** aria-label for the input in edit mode. */
  label?: string;
  /** Render as disabled-looking; double-click won't enter edit mode. */
  disabled?: boolean;
  /** Optional remote commit. When provided, the edit is optimistic: the
   *  local `onSave` runs first, then `commit` runs in the background.
   *  Throwing from `commit` rolls back to the previous value via a
   *  reverse `onSave(previousValue)` call and shows an error toast. */
  commit?: (next: V) => Promise<unknown>;
  /** Toast label on success: "deal name" → "Deal name updated". When
   *  commit is omitted the success toast is suppressed so silent inline
   *  edits don't spam react-hot-toast. */
  toastLabel?: string;
  /** Stable scope key — e.g. `deal:DEAL-123#value`. When set, the cell
   *  broadcasts edit-start / edit-end over Pusher so other clients see
   *  a coloured border + name chip while a teammate is editing. No-op
   *  when realtime isn't configured. */
  cellKey?: string;
}

export function EditableCell<V extends string | number>({
  value,
  onSave,
  type = "text",
  options,
  validate,
  render,
  style,
  inputStyle,
  className,
  label,
  disabled = false,
  commit: remoteCommit,
  toastLabel,
  cellKey,
}: EditableCellProps<V>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value ?? ""));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const me = useAuthStore((s) => s.user);
  const [remoteEditor, setRemoteEditor] = useState<RemoteEditor | null>(null);

  // Realtime: subscribe to edit-start / edit-end on this cell scope.
  useEffect(() => {
    if (!cellKey || !isRealtimeEnabled()) return;
    const channel = `presence-cell-${cellKey}`;
    const myId = me?.id ?? me?.email ?? "anon";
    const offStart = subscribe<RemoteEditor>(channel, "cell:edit-start", (r) => {
      if (r.id === myId) return;
      setRemoteEditor({ ...r, ts: Date.now() });
    });
    const offEnd = subscribe<{ id: string }>(channel, "cell:edit-end", ({ id }) => {
      setRemoteEditor((prev) => (prev && prev.id === id ? null : prev));
    });
    // Auto-clear stale lock after 12s in case the editor's tab crashed.
    const gc = window.setInterval(() => {
      setRemoteEditor((prev) => {
        if (!prev) return prev;
        return Date.now() - prev.ts > 12_000 ? null : prev;
      });
    }, 4_000);
    return () => {
      offStart();
      offEnd();
      window.clearInterval(gc);
    };
  }, [cellKey, me]);

  // Broadcast edit-start / edit-end while editing.
  useEffect(() => {
    if (!cellKey || !isRealtimeEnabled() || !me) return;
    if (!editing) return;
    const channel = `presence-cell-${cellKey}`;
    const id = me.id ?? me.email ?? "anon";
    void publishFromClient(channel, "cell:edit-start", {
      id,
      name: me.name ?? "Teammate",
      color: colorFor(id),
      ts: Date.now(),
    });
    return () => {
      void publishFromClient(channel, "cell:edit-end", { id });
    };
  }, [editing, cellKey, me]);

  // Reset draft when the underlying value changes and we're not editing
  useEffect(() => {
    if (!editing) setDraft(String(value ?? ""));
  }, [value, editing]);

  // Auto-select on edit entry
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    });
  }, [editing]);

  function enter() {
    if (disabled) return;
    setDraft(String(value ?? ""));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
    setDraft(String(value ?? ""));
  }

  function commit() {
    const next = draft;
    // Cheap validation path
    const err = validate?.(next);
    if (err) {
      setError(err);
      return;
    }
    let coerced: V;
    if (type === "number") {
      const n = Number(next);
      if (!Number.isFinite(n)) {
        setError("Must be a number");
        return;
      }
      coerced = n as V;
    } else {
      coerced = next as V;
    }
    if (coerced === value) {
      setEditing(false);
      return;
    }
    const previous = value;
    setEditing(false);
    setError(null);
    void optimisticAction({
      apply: () => {
        void onSave(coerced);
      },
      commit: remoteCommit ? () => remoteCommit(coerced) : undefined,
      rollback: () => {
        void onSave(previous);
      },
      successMessage: toastLabel ? `${toastLabel} updated` : null,
      errorMessage: toastLabel
        ? `Couldn't save ${toastLabel.toLowerCase()} — reverted.`
        : "Save failed — reverted.",
      silent: !remoteCommit,
    });
  }

  const baseContainer: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 22,
    borderRadius: 4,
    padding: editing ? 0 : "1px 4px",
    margin: "-1px -4px",
    cursor: disabled ? "default" : editing ? "text" : "pointer",
    outline: "none",
    position: "relative",
    ...(remoteEditor
      ? {
          boxShadow: `0 0 0 2px ${remoteEditor.color}`,
          background: `${remoteEditor.color}1A`,
        }
      : {}),
    ...style,
  };

  if (!editing) {
    return (
      <span
        tabIndex={disabled || remoteEditor ? -1 : 0}
        role={disabled ? undefined : "button"}
        aria-label={
          remoteEditor
            ? `${remoteEditor.name} is editing`
            : label
              ? `Edit ${label}`
              : "Double-click to edit"
        }
        title={remoteEditor ? `${remoteEditor.name} is editing` : undefined}
        className={className}
        onDoubleClick={remoteEditor ? undefined : enter}
        onKeyDown={(e) => {
          if (disabled || remoteEditor) return;
          if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            enter();
          }
        }}
        onMouseEnter={(e) => {
          if (disabled || remoteEditor) return;
          (e.currentTarget as HTMLElement).style.background = "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)";
        }}
        onMouseLeave={(e) => {
          if (remoteEditor) return;
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
        style={{
          ...baseContainer,
          opacity: disabled ? 0.6 : 1,
          cursor: remoteEditor ? "not-allowed" : baseContainer.cursor,
        }}
      >
        {render ? render(value) : String(value)}
        {remoteEditor && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -10,
              right: -2,
              padding: "1px 6px",
              borderRadius: 6,
              background: remoteEditor.color,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
              pointerEvents: "none",
            }}
          >
            {remoteEditor.name.split(" ")[0]}
          </span>
        )}
      </span>
    );
  }

  const commonInputStyle: CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 60,
    padding: "2px 6px",
    borderRadius: 4,
    border: error
      ? "1px solid var(--status-danger)"
      : "1px solid var(--vyne-accent, var(--vyne-purple))",
    outline: "none",
    background: "var(--content-bg)",
    color: "var(--text-primary)",
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
    boxShadow: error
      ? "0 0 0 3px rgba(239,68,68,0.18)"
      : "0 0 0 3px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)",
    ...inputStyle,
  };

  if (type === "select" && options) {
    return (
      <span className={className} style={baseContainer} title={error ?? undefined}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          aria-label={label}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          style={{ ...commonInputStyle, cursor: "pointer" }}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </span>
    );
  }

  return (
    <span className={className} style={baseContainer} title={error ?? undefined}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === "number" ? "number" : "text"}
        aria-label={label}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        style={commonInputStyle}
      />
    </span>
  );
}
