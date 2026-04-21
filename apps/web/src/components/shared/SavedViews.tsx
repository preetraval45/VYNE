"use client";

import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkPlus, X } from "lucide-react";

/* ── Saved view model ────────────────────────────────────────────── */

export interface SavedView {
  /** Stable id — slug of the name at save time. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** URL query-param fragment WITHOUT the leading "?". Eg. `filter=won&assignee=alex`. */
  query: string;
  /** Optional emoji / icon prefix. */
  icon?: string;
  /** Built-in views can't be renamed/deleted. */
  builtIn?: boolean;
}

/** Hook: read + write saved views for a given key ("crm", "projects", …).
 *  Persists to localStorage so views survive page reloads.
 *
 *   const { views, save, remove, current } = useSavedViews("crm", BUILT_INS)
 */
export function useSavedViews(
  key: string,
  builtIns: SavedView[] = [],
): {
  views: SavedView[];
  save: (name: string) => SavedView | null;
  remove: (id: string) => void;
  current: SavedView | null;
} {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [userViews, setUserViews] = useState<SavedView[]>([]);
  const storageKey = `vyne-views:${key}`;

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setUserViews(JSON.parse(raw) as SavedView[]);
    } catch {
      /* ignore bad JSON */
    }
  }, [storageKey]);

  function persist(next: SavedView[]) {
    setUserViews(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* quota exceeded — drop silently */
    }
  }

  const save = useCallback(
    (name: string): SavedView | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const qs = searchParams?.toString() ?? "";
      const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const view: SavedView = { id: id || `view-${Date.now()}`, name: trimmed, query: qs };
      // overwrite if same id already exists
      const filtered = userViews.filter((v) => v.id !== view.id);
      persist([...filtered, view]);
      return view;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, userViews],
  );

  const remove = useCallback(
    (id: string) => {
      persist(userViews.filter((v) => v.id !== id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userViews],
  );

  const views = useMemo(() => [...builtIns, ...userViews], [builtIns, userViews]);

  // A view is "current" iff its query exactly matches the current URL's
  // non-detail query params (ignore keys used for the detail panel).
  const current = useMemo(() => {
    const currentQs = new URLSearchParams(searchParams?.toString() ?? "");
    // Strip detail-panel keys so selecting a row doesn't deselect the view
    for (const k of Array.from(currentQs.keys())) {
      if (k === "detail" || k === "account" || k === "contact" || k === "opp" || k === "invoice" || k === "product") {
        currentQs.delete(k);
      }
    }
    const currentStr = currentQs.toString();
    return views.find((v) => v.query === currentStr) ?? null;
    // pathname keeps this tied to the active page
  }, [views, searchParams, pathname]);

  return { views, save, remove, current };
}

/* ── View chips row ──────────────────────────────────────────────── */

export interface SavedViewsBarProps {
  /** Identifier for this page (stored as "vyne-views:<key>") */
  storageKey: string;
  /** Views that always appear first, can't be removed. */
  builtIns?: SavedView[];
  /** Extra styles on the row container. */
  style?: CSSProperties;
  /** Slot at the right side — filter pills, search bar, etc. */
  trailing?: ReactNode;
}

export function SavedViewsBar({
  storageKey,
  builtIns = [],
  style,
  trailing,
}: SavedViewsBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { views, save, remove, current } = useSavedViews(storageKey, builtIns);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState("");

  function applyView(v: SavedView) {
    const target = v.query ? `${pathname}?${v.query}` : pathname;
    router.push(target, { scroll: false });
  }

  function clearView() {
    router.push(pathname, { scroll: false });
  }

  function handleSave() {
    if (!name.trim()) return;
    save(name);
    setName("");
    setNameOpen(false);
  }

  const hasUnsavedFilter =
    !current && (searchParams?.toString() ?? "").length > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        ...style,
      }}
    >
      {/* "All" default */}
      <Chip
        active={!current && !hasUnsavedFilter}
        onClick={clearView}
        icon={<Bookmark size={11} />}
        label="All"
      />

      {views.map((v) => (
        <Chip
          key={v.id}
          active={current?.id === v.id}
          onClick={() => applyView(v)}
          label={v.name}
          icon={v.icon ? <span>{v.icon}</span> : undefined}
          onRemove={v.builtIn ? undefined : () => remove(v.id)}
        />
      ))}

      {/* Save-current-as-view */}
      {hasUnsavedFilter &&
        (nameOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 4px 2px 8px",
              borderRadius: 999,
              border: "1px solid var(--vyne-purple)",
              background: "rgba(108,71,255,0.08)",
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="View name"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNameOpen(false);
                  setName("");
                }
              }}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--text-primary)",
                width: 110,
                padding: "3px 0",
              }}
            />
            <button
              type="submit"
              aria-label="Save view"
              style={{
                border: "none",
                background: "var(--vyne-purple)",
                color: "#fff",
                width: 22,
                height: 22,
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ✓
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNameOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 999,
              border: "1px dashed var(--content-border-strong)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <BookmarkPlus size={11} />
            Save view
          </button>
        ))}

      {trailing && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {trailing}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  label,
  onRemove,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: onRemove ? "2px 4px 2px 10px" : "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        background: active ? "rgba(108,71,255,0.10)" : "var(--content-secondary)",
        border: `1px solid ${active ? "rgba(108,71,255,0.3)" : "var(--content-border)"}`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: 0,
        }}
      >
        {icon}
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Delete ${label} view`}
          title="Delete view"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            width: 18,
            height: 18,
            borderRadius: 999,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
