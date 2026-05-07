"use client";

import {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Universal @mention input. Drop-in textarea / input replacement
 * that opens a typeahead dropdown when the user types `@`. Works
 * with arbitrary mentionable types (people / records / channels)
 * because the caller supplies the candidate list and a render fn.
 *
 *   <MentionInput
 *     value={draft}
 *     onChange={setDraft}
 *     candidates={[{ id: "u-1", label: "Sarah Kim" }, …]}
 *     onMention={(c) => trackMention(c.id)}
 *   />
 *
 * Inserted text is `@<label> ` so plain-text consumers (chat,
 * comments) get readable copy, while parsers can detect mentions
 * via `@\w+` post-hoc. Pass a `serializer` to inject custom syntax
 * (e.g. `[@Sarah Kim](user:u-1)` for markdown editors).
 */

export interface MentionCandidate {
  id: string;
  label: string;
  hint?: string;
  /** Optional avatar / icon node. */
  icon?: React.ReactNode;
}

export interface MentionInputProps {
  value: string;
  onChange: (next: string) => void;
  candidates: MentionCandidate[];
  /** Called whenever the user accepts a candidate. */
  onMention?: (c: MentionCandidate) => void;
  /** Build the inserted token. Default: `@${label} `. */
  serializer?: (c: MentionCandidate) => string;
  placeholder?: string;
  ariaLabel?: string;
  rows?: number;
  /** Render a single-line input instead of a textarea. */
  singleLine?: boolean;
  /** Style passthrough for the input. */
  inputStyle?: CSSProperties;
  /** Submit on Enter (without Shift). Useful for chat composers. */
  submitOnEnter?: boolean;
  onSubmit?: () => void;
}

export function MentionInput({
  value,
  onChange,
  candidates,
  onMention,
  serializer,
  placeholder,
  ariaLabel,
  rows = 2,
  singleLine = false,
  inputStyle,
  submitOnEnter = false,
  onSubmit,
}: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [trigger, setTrigger] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = query.toLowerCase();
    return candidates
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [open, query, candidates]);

  function detectTrigger(text: string, caret: number) {
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at < 0) return null;
    // @ must be at start or preceded by whitespace.
    if (at > 0 && !/\s/.test(text[at - 1])) return null;
    const after = before.slice(at + 1);
    if (!/^[\w.-]{0,40}$/.test(after)) return null;
    return { triggerAt: at, query: after };
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart ?? text.length;
    const t = detectTrigger(text, caret);
    if (t) {
      setOpen(true);
      setQuery(t.query);
      setTrigger(t.triggerAt);
      setActiveIdx(0);
    } else {
      setOpen(false);
      setTrigger(null);
    }
  }

  function commit(c: MentionCandidate) {
    if (trigger === null || !inputRef.current) return;
    const insertion = (serializer ?? ((m: MentionCandidate) => `@${m.label} `))(c);
    const before = value.slice(0, trigger);
    const after = value.slice(
      (inputRef.current.selectionStart ?? value.length),
    );
    const next = `${before}${insertion}${after}`;
    onChange(next);
    onMention?.(c);
    setOpen(false);
    setQuery("");
    setTrigger(null);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const pos = before.length + insertion.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (open && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        commit(filtered[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (
      submitOnEnter &&
      e.key === "Enter" &&
      !e.shiftKey &&
      !open &&
      onSubmit
    ) {
      e.preventDefault();
      onSubmit();
    }
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (inputRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const baseInputStyle: CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    resize: singleLine ? "none" : "vertical",
    ...inputStyle,
  };

  return (
    <span style={{ position: "relative", display: "block" }}>
      {singleLine ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={baseInputStyle}
        />
      ) : (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={rows}
          style={baseInputStyle}
        />
      )}
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention suggestions"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            minWidth: 220,
            listStyle: "none",
            padding: 4,
            margin: 0,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIdx ? "true" : "false"}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => commit(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    i === activeIdx
                      ? "var(--content-secondary)"
                      : "transparent",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {c.icon}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontWeight: 600 }}>{c.label}</strong>
                  {c.hint && (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-tertiary)",
                        marginLeft: 6,
                      }}
                    >
                      {c.hint}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
