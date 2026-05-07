"use client";

import {
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * SlashMenu — Notion / Linear-style "/" trigger that opens a
 * keyboard-navigable command list. Generic over the action type so
 * any rich-text editor / composer / form can drop it in.
 *
 *   const [open, setOpen] = useState(false);
 *   const [query, setQuery] = useState("");
 *
 *   onKeyDown:
 *     if (e.key === "/") setOpen(true);
 *
 *   <SlashMenu
 *     open={open}
 *     query={query}
 *     items={[
 *       { id: "h1", label: "Heading 1", hint: "Big section heading", run: () => insert("# ") },
 *       { id: "todo", label: "To-do list", hint: "Track work items", run: () => insert("- [ ] ") },
 *     ]}
 *     onClose={() => setOpen(false)}
 *   />
 *
 * The component is presentation-only — it does not hijack the host's
 * input. The host detects the "/" trigger and feeds the query down.
 */

export interface SlashMenuItem {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  /** Group label for visual sectioning. */
  group?: string;
  /** Keyword aliases used for fuzzy match (in addition to label). */
  aliases?: string[];
  run: () => void;
}

export interface SlashMenuProps {
  open: boolean;
  query: string;
  items: SlashMenuItem[];
  onClose: () => void;
  /** Anchor placement (relative to its parent). Default: bottom-left. */
  placement?: "top" | "bottom";
  /** Custom max height. */
  maxHeight?: number;
  /** Style passthrough for the popover wrapper. */
  style?: CSSProperties;
}

export function SlashMenu({
  open,
  query,
  items,
  onClose,
  placement = "bottom",
  maxHeight = 320,
  style,
}: SlashMenuProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const popRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const haystack = `${i.label} ${i.hint ?? ""} ${(i.aliases ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, items]);

  useEffect(() => {
    if (!open) return;
    setActiveIdx(0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(
          (i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1),
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filtered[activeIdx]) {
          e.preventDefault();
          filtered[activeIdx].run();
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx, onClose]);

  if (!open) return null;
  if (filtered.length === 0) {
    return (
      <div
        ref={popRef}
        role="listbox"
        aria-label="Slash commands"
        style={{
          position: "absolute",
          ...(placement === "top" ? { bottom: "100%" } : { top: "100%" }),
          left: 0,
          marginTop: 4,
          zIndex: 60,
          minWidth: 240,
          padding: "12px 14px",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
          fontSize: 12,
          color: "var(--text-tertiary)",
          ...style,
        }}
      >
        No commands match "{query}".
      </div>
    );
  }

  // Group rows for sectioned rendering.
  const rendered: ReactNode[] = [];
  let currentGroup: string | undefined = undefined;
  filtered.forEach((item, i) => {
    if (item.group && item.group !== currentGroup) {
      currentGroup = item.group;
      rendered.push(
        <div
          key={`group-${item.group}-${i}`}
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            padding: "8px 10px 4px",
          }}
        >
          {item.group}
        </div>,
      );
    }
    const active = i === activeIdx;
    rendered.push(
      <button
        key={item.id}
        type="button"
        role="option"
        aria-selected={active ? "true" : "false"}
        onMouseEnter={() => setActiveIdx(i)}
        onClick={() => {
          item.run();
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          background: active ? "var(--content-secondary)" : "transparent",
          color: "var(--text-primary)",
          fontSize: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {item.icon && (
          <span
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {item.icon}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontWeight: 600 }}>{item.label}</strong>
          {item.hint && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              {item.hint}
            </div>
          )}
        </span>
      </button>,
    );
  });

  return (
    <div
      ref={popRef}
      role="listbox"
      aria-label="Slash commands"
      style={{
        position: "absolute",
        ...(placement === "top" ? { bottom: "100%" } : { top: "100%" }),
        left: 0,
        marginTop: 4,
        zIndex: 60,
        minWidth: 280,
        maxHeight,
        overflow: "auto",
        padding: 4,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
        ...style,
      }}
    >
      {rendered}
    </div>
  );
}
