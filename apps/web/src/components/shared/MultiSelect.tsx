"use client";

import { ReactNode, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/** Hook: manages a Set<string> of selected ids and the select-all
 *  tri-state against a list of all visible ids.
 *
 *   const sel = useMultiSelect()
 *   <Checkbox checked={sel.has(id)} onChange={() => sel.toggle(id)} />
 *   <HeaderCheckbox state={sel.allState(allIds)} onChange={() => sel.toggleAll(allIds)} />
 */
export function useMultiSelect(): {
  selected: Set<string>;
  size: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  toggleAll: (ids: string[]) => void;
  allState: (ids: string[]) => "none" | "some" | "all";
  setMany: (ids: string[], value: boolean) => void;
} {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: string[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (ids: string[]) => {
      setSelected((prev) => {
        const allCurrentlySelected = ids.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allCurrentlySelected) {
          for (const id of ids) next.delete(id);
        } else {
          for (const id of ids) next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const allState = useCallback(
    (ids: string[]): "none" | "some" | "all" => {
      if (ids.length === 0) return "none";
      let inCount = 0;
      for (const id of ids) if (selected.has(id)) inCount++;
      if (inCount === 0) return "none";
      if (inCount === ids.length) return "all";
      return "some";
    },
    [selected],
  );

  return useMemo(
    () => ({
      selected,
      size: selected.size,
      has: (id: string) => selected.has(id),
      toggle,
      clear,
      toggleAll,
      allState,
      setMany,
    }),
    [selected, toggle, clear, toggleAll, allState, setMany],
  );
}

/* ── Checkbox primitives ─────────────────────────────────────────── */

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Deselect row" : "Select row")}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1.5px solid ${checked ? "var(--vyne-purple)" : "var(--content-border-strong)"}`,
        background: checked ? "var(--vyne-purple)" : "var(--content-bg)",
        color: "#fff",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "all 0.1s var(--ease-out-quart)",
      }}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 5l2 2 4-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function HeaderCheckbox({
  state,
  onChange,
  label,
}: {
  state: "none" | "some" | "all";
  onChange: () => void;
  label?: string;
}) {
  const checked = state === "all";
  const indeterminate = state === "some";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label ?? "Select all rows"}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1.5px solid ${
          state === "none"
            ? "var(--content-border-strong)"
            : "var(--vyne-purple)"
        }`,
        background:
          state === "none" ? "var(--content-bg)" : "var(--vyne-purple)",
        color: "#fff",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5l2 2 4-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

/* ── Floating bulk-actions bar ───────────────────────────────────── */

export function MultiSelectBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px 10px 16px",
            borderRadius: 14,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border-strong)",
            boxShadow: "var(--elev-4)",
            minWidth: 320,
          }}
          role="region"
          aria-label="Bulk actions"
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.005em",
            }}
          >
            {count} selected
          </span>
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 20,
              background: "var(--content-border)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {children}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            style={{
              marginLeft: 4,
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A default button style intended for use inside <MultiSelectBar>. */
export function BulkActionBtn({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 11px",
        borderRadius: 8,
        border: danger
          ? "1px solid rgba(239,68,68,0.25)"
          : "1px solid var(--content-border)",
        background: danger ? "rgba(239,68,68,0.06)" : "var(--content-bg)",
        color: danger ? "var(--status-danger)" : "var(--text-primary)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        letterSpacing: "-0.005em",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
