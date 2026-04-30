"use client";

import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Optional callback when the user wants to escalate to workspace search. */
  onWorkspaceSearch?: () => void;
  /** Width override for desktop. Default 280. */
  width?: number;
}

/**
 * Standard search input — keyboard-accessible, clearable, optional
 * "Search workspace" CTA on the right that escalates the query into
 * the global Cmd+K palette. Drop-in replacement for the ad-hoc filter
 * inputs scattered across module pages.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel,
  onWorkspaceSearch,
  width = 280,
}: Props) {
  return (
    <div
      role="search"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--input-bg, var(--content-secondary))",
        width: "100%",
        maxWidth: width,
      }}
    >
      <Search size={13} color="var(--text-tertiary)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text-primary)",
          fontSize: 13,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
          }}
        >
          <X size={13} />
        </button>
      )}
      {onWorkspaceSearch && value && (
        <button
          type="button"
          onClick={onWorkspaceSearch}
          aria-label="Search across workspace"
          title="Search across all of VYNE (⌘K)"
          style={{
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 6,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ⌘K all
        </button>
      )}
    </div>
  );
}
