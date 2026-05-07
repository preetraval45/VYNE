"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Search,
  Filter as FilterIcon,
  Layers,
  Star,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Pin,
} from "lucide-react";

/**
 * FilterSearchBar — Odoo-style search bar.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ [search…                                       ▼ ▲]  │
 *   └──────────────────────────────────────────────────────┘
 *      ┌──────────┬─────────────┬───────────┐  popover
 *      │ Filters  │  Group By   │ Favorites │
 *      │  My X    │  Manager    │  Saved 1  │
 *      │  ✓ Mine  │  Stage      │  + Save   │
 *      └──────────┴─────────────┴───────────┘
 *
 * The page owns the predicates — this component just hosts the UI for
 * picking which named filters / groupings are active and exposes a
 * controlled selection back via callbacks.
 *
 * Drop-in:
 *   <FilterSearchBar
 *     query={q} onQueryChange={setQ}
 *     filters={MY_FILTERS}
 *     activeFilterIds={activeIds}
 *     onToggleFilter={(id) => setActive((p) => p.includes(id) ? p.filter(...) : [...])}
 *     groupBy={GROUP_OPTIONS}
 *     activeGroupId={groupId}
 *     onChangeGroup={setGroupId}
 *     favorites={savedViews}
 *     onLoadFavorite={loadView}
 *     onSaveCurrent={(name) => saveView(name)}
 *     onDeleteFavorite={deleteView}
 *   />
 */

export interface FilterDef {
  id: string;
  label: string;
  /** Optional one-line hint shown right-aligned. */
  hint?: string;
  /** Optional icon next to the label. */
  icon?: ReactNode;
  /** When true, render as a section divider above this row. */
  divider?: boolean;
}

export interface GroupDef {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface FavoriteDef {
  id: string;
  label: string;
  pinned?: boolean;
  shareUrl?: string;
}

export interface FilterSearchBarProps {
  /** Free-text query. Controlled. */
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  /** Width override for the input, default 320. */
  width?: number;

  filters?: FilterDef[];
  /** Filters that may co-exist (multi-select). */
  activeFilterIds?: string[];
  onToggleFilter?: (id: string) => void;

  groupBy?: GroupDef[];
  /** Single-active grouping (or null). */
  activeGroupId?: string | null;
  onChangeGroup?: (id: string | null) => void;

  favorites?: FavoriteDef[];
  activeFavoriteId?: string | null;
  onLoadFavorite?: (id: string) => void;
  onDeleteFavorite?: (id: string) => void;
  /** Save the current search + active filters as a new favourite. */
  onSaveCurrent?: (name: string) => void;
  onPinFavorite?: (id: string, pinned: boolean) => void;

  /** Optional clear-all callback. When provided, an "X" appears when
   *  any filter or grouping is active. */
  onClearAll?: () => void;

  /** Render as the standalone version (no surrounding card padding). */
  bare?: boolean;
}

export function FilterSearchBar({
  query,
  onQueryChange,
  placeholder = "Search…",
  width = 320,
  filters = [],
  activeFilterIds = [],
  onToggleFilter,
  groupBy = [],
  activeGroupId = null,
  onChangeGroup,
  favorites = [],
  activeFavoriteId = null,
  onLoadFavorite,
  onDeleteFavorite,
  onSaveCurrent,
  onPinFavorite,
  onClearAll,
  bare = false,
}: FilterSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; kind: "filter" | "group" }> = [];
    for (const fid of activeFilterIds) {
      const f = filters.find((x) => x.id === fid);
      if (f) chips.push({ id: f.id, label: f.label, kind: "filter" });
    }
    if (activeGroupId) {
      const g = groupBy.find((x) => x.id === activeGroupId);
      if (g) chips.push({ id: g.id, label: `Group · ${g.label}`, kind: "group" });
    }
    return chips;
  }, [activeFilterIds, filters, activeGroupId, groupBy]);

  // Click-outside / Esc dismiss.
  useEffect(() => {
    if (!open && !savePromptOpen) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setSavePromptOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSavePromptOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, savePromptOpen]);

  const hasAnyActive =
    activeFilterIds.length > 0 || Boolean(activeGroupId) || Boolean(query);

  return (
    <div
      ref={containerRef}
      role="search"
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        width: "100%",
        maxWidth: width,
        ...(bare ? {} : {}),
      }}
    >
      {/* Pill input row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 36,
          padding: "0 8px 0 12px",
          borderRadius: 10,
          border: open
            ? "1px solid var(--vyne-accent, var(--vyne-purple))"
            : "1px solid var(--content-border)",
          background: "var(--input-bg, var(--content-secondary))",
          boxShadow: open
            ? "0 0 0 3px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)"
            : "none",
          flexWrap: "wrap",
        }}
      >
        <Search size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />

        {/* Active-filter chips inline before the input */}
        {activeChips.map((c) => (
          <span
            key={`${c.kind}-${c.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 4px 2px 8px",
              borderRadius: 999,
              background:
                c.kind === "filter"
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)"
                  : "rgba(139, 92, 246, 0.12)",
              color:
                c.kind === "filter"
                  ? "var(--vyne-accent, var(--vyne-purple))"
                  : "var(--vyne-purple, #8B5CF6)",
              border:
                c.kind === "filter"
                  ? "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32)"
                  : "1px solid rgba(139, 92, 246, 0.32)",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
            <button
              type="button"
              onClick={() =>
                c.kind === "filter"
                  ? onToggleFilter?.(c.id)
                  : onChangeGroup?.(null)
              }
              aria-label={`Remove ${c.label}`}
              style={{
                width: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                borderRadius: "50%",
                padding: 0,
              }}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          onFocus={() => setOpen(true)}
          style={{
            flex: 1,
            minWidth: 80,
            height: 30,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        />

        {hasAnyActive && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label="Clear all filters"
            title="Clear search and filters"
            style={iconBtnStyle}
          >
            <X size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close filters" : "Open filters"}
          aria-expanded={open ? "true" : "false"}
          style={{
            ...iconBtnStyle,
            background: open ? "var(--content-bg)" : "transparent",
            border: open ? "1px solid var(--content-border)" : "1px solid transparent",
          }}
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Dropdown: Filters | Group By | Favorites */}
      {open && (
        <div
          role="dialog"
          aria-label="Filters and groupings"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            minWidth: 520,
            maxWidth: "min(720px, calc(100vw - 24px))",
            zIndex: 60,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            boxShadow:
              "var(--shadow-lg, 0 18px 36px rgba(15, 23, 42, 0.18))",
            display: "grid",
            gridTemplateColumns:
              filters.length && groupBy.length && favorites.length
                ? "1fr 1fr 1fr"
                : filters.length && (groupBy.length || favorites.length)
                  ? "1fr 1fr"
                  : "1fr",
          }}
        >
          {filters.length > 0 && (
            <Section
              icon={<FilterIcon size={13} />}
              accent="var(--vyne-accent, var(--vyne-purple))"
              title="Filters"
            >
              {filters.map((f, idx) => {
                const active = activeFilterIds.includes(f.id);
                return (
                  <div key={f.id}>
                    {f.divider && idx > 0 && <Divider />}
                    <RowButton
                      active={active}
                      onClick={() => onToggleFilter?.(f.id)}
                      icon={f.icon}
                      label={f.label}
                      hint={f.hint}
                    />
                  </div>
                );
              })}
            </Section>
          )}

          {groupBy.length > 0 && (
            <Section
              icon={<Layers size={13} />}
              accent="var(--vyne-purple, #8B5CF6)"
              title="Group By"
            >
              {groupBy.map((g) => {
                const active = activeGroupId === g.id;
                return (
                  <RowButton
                    key={g.id}
                    active={active}
                    onClick={() => onChangeGroup?.(active ? null : g.id)}
                    icon={g.icon}
                    label={g.label}
                  />
                );
              })}
              {activeGroupId && (
                <>
                  <Divider />
                  <RowButton
                    onClick={() => onChangeGroup?.(null)}
                    label="Clear grouping"
                    icon={<X size={11} />}
                  />
                </>
              )}
            </Section>
          )}

          {(favorites.length > 0 || onSaveCurrent) && (
            <Section
              icon={<Star size={13} />}
              accent="#F59E0B"
              title="Favorites"
            >
              {favorites.map((fav) => {
                const active = activeFavoriteId === fav.id;
                return (
                  <div
                    key={fav.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <RowButton
                      flex
                      active={active}
                      onClick={() => onLoadFavorite?.(fav.id)}
                      label={fav.label}
                      icon={
                        fav.pinned ? (
                          <Pin size={11} style={{ color: "#F59E0B" }} />
                        ) : undefined
                      }
                    />
                    {onPinFavorite && (
                      <button
                        type="button"
                        onClick={() => onPinFavorite(fav.id, !fav.pinned)}
                        aria-label={fav.pinned ? "Unpin" : "Pin"}
                        title={fav.pinned ? "Unpin" : "Pin"}
                        style={iconBtnStyle}
                      >
                        <Pin size={11} />
                      </button>
                    )}
                    {onDeleteFavorite && (
                      <button
                        type="button"
                        onClick={() => onDeleteFavorite(fav.id)}
                        aria-label="Delete favorite"
                        title="Delete"
                        style={iconBtnStyle}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
              {favorites.length > 0 && onSaveCurrent && <Divider />}
              {onSaveCurrent && !savePromptOpen && (
                <RowButton
                  onClick={() => {
                    setDraftName(query || "Saved view");
                    setSavePromptOpen(true);
                  }}
                  label="Save current search"
                  icon={<Plus size={11} />}
                />
              )}
              {onSaveCurrent && savePromptOpen && (
                <div
                  style={{
                    padding: "8px 6px 4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const name = draftName.trim();
                        if (name) {
                          onSaveCurrent(name);
                          setSavePromptOpen(false);
                          setDraftName("");
                        }
                      } else if (e.key === "Escape") {
                        setSavePromptOpen(false);
                      }
                    }}
                    placeholder="Name this view"
                    aria-label="View name"
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--input-border)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setSavePromptOpen(false)}
                      style={ghostBtnStyle}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const name = draftName.trim();
                        if (name) {
                          onSaveCurrent(name);
                          setSavePromptOpen(false);
                          setDraftName("");
                        }
                      }}
                      style={primaryBtnStyle}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  accent,
  title,
  children,
}: {
  icon: ReactNode;
  accent: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRight: "1px solid var(--content-border)",
      }}
    >
      <header
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
          padding: "0 4px 6px",
          color: accent,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          width: "100%",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <span style={{ color: accent }}>{icon}</span>
        {title}
      </header>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RowButton({
  active,
  onClick,
  icon,
  label,
  hint,
  flex,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  label: string;
  hint?: string;
  flex?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 6,
        border: "none",
        background: active
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)"
          : "transparent",
        color: active
          ? "var(--vyne-accent, var(--vyne-purple))"
          : "var(--text-primary)",
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        textAlign: "left",
        width: flex ? "auto" : "100%",
        flex: flex ? 1 : undefined,
      }}
      onMouseEnter={(e) => {
        if (active) return;
        (e.currentTarget as HTMLElement).style.background =
          "var(--content-secondary)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon && (
        <span style={{ display: "inline-flex", color: "var(--text-tertiary)" }}>
          {icon}
        </span>
      )}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {hint}
        </span>
      )}
      {active && (
        <span aria-hidden="true" style={{ fontSize: 11, fontWeight: 700 }}>
          ✓
        </span>
      )}
    </button>
  );
}

function Divider() {
  return (
    <div
      role="separator"
      style={{
        height: 1,
        background: "var(--content-border)",
        margin: "4px 4px",
      }}
    />
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
