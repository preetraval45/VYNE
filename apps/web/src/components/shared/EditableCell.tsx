"use client";

import {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

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
}: EditableCellProps<V>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value ?? ""));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

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
    try {
      Promise.resolve(onSave(coerced))
        .then(() => {
          setEditing(false);
          setError(null);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Save failed");
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
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
    ...style,
  };

  if (!editing) {
    return (
      <span
        tabIndex={disabled ? -1 : 0}
        role={disabled ? undefined : "button"}
        aria-label={label ? `Edit ${label}` : "Double-click to edit"}
        className={className}
        onDoubleClick={enter}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            enter();
          }
        }}
        onMouseEnter={(e) => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).style.background = "rgba(108,71,255,0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
        style={{ ...baseContainer, opacity: disabled ? 0.6 : 1 }}
      >
        {render ? render(value) : String(value)}
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
      : "1px solid var(--vyne-purple)",
    outline: "none",
    background: "var(--content-bg)",
    color: "var(--text-primary)",
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
    boxShadow: error
      ? "0 0 0 3px rgba(239,68,68,0.18)"
      : "0 0 0 3px rgba(108,71,255,0.18)",
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
