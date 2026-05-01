"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * useSavedViews — per-page saved view state, persisted to localStorage and
 * shareable via URL.
 *
 * A "view" is whatever the page wants: filter chips, sort, group-by, columns.
 * The hook stores them as JSON-serializable objects keyed by name.
 *
 * URL contract: ?view=<name> selects a saved view. Pages that want all
 * filter state in the URL can pass `urlParam` for the active filter blob.
 */

export interface SavedView<T = Record<string, unknown>> {
  id: string;
  name: string;
  filters: T;
  /** ISO timestamp */
  createdAt: string;
  /** Pinned views show first */
  pinned?: boolean;
  /** Color tag for visual grouping */
  color?: string;
  /** True for built-in default views (cannot be deleted) */
  builtin?: boolean;
}

export interface UseSavedViewsOptions<T> {
  /** Stable storage key, e.g. "crm-deals" */
  storageKey: string;
  /** Default filters when no view is active */
  defaultFilters: T;
  /** Built-in views that ship with the page (cannot be deleted) */
  builtinViews?: Array<Omit<SavedView<T>, "createdAt" | "builtin">>;
}

export interface UseSavedViewsResult<T> {
  views: SavedView<T>[];
  activeViewId: string | null;
  activeView: SavedView<T> | null;
  filters: T;
  setFilters: (next: T | ((prev: T) => T)) => void;
  selectView: (id: string | null) => void;
  saveView: (name: string, opts?: { color?: string; pinned?: boolean }) => SavedView<T>;
  updateView: (id: string, patch: Partial<Omit<SavedView<T>, "id" | "createdAt" | "builtin">>) => void;
  deleteView: (id: string) => void;
  pinView: (id: string, pinned: boolean) => void;
  /** Returns a sharable URL for the current filter state */
  getShareUrl: () => string;
  hydrated: boolean;
}

const STORAGE_PREFIX = "vyne-views:";

function readStored<T>(storageKey: string): SavedView<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedView<T>[];
  } catch {
    return [];
  }
}

function writeStored<T>(storageKey: string, views: SavedView<T>[]) {
  if (typeof window === "undefined") return;
  try {
    // Strip built-ins before persisting — they ship with the page.
    const userViews = views.filter((v) => !v.builtin);
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(userViews));
  } catch {
    // ignore quota errors
  }
}

function makeId(): string {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useSavedViews<T extends Record<string, unknown>>({
  storageKey,
  defaultFilters,
  builtinViews = [],
}: UseSavedViewsOptions<T>): UseSavedViewsResult<T> {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlViewId = searchParams.get("view");

  const [userViews, setUserViews] = useState<SavedView<T>[]>([]);
  const [filters, setFiltersState] = useState<T>(defaultFilters);
  const [activeViewId, setActiveViewId] = useState<string | null>(urlViewId);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = readStored<T>(storageKey);
    setUserViews(stored);
    setHydrated(true);
  }, [storageKey]);

  // Compose all views (builtins first, then user views, then sorted by pinned)
  const views = useMemo<SavedView<T>[]>(() => {
    const builtins: SavedView<T>[] = builtinViews.map((v) => ({
      ...v,
      createdAt: new Date(0).toISOString(),
      builtin: true,
    }));
    const all = [...builtins, ...userViews];
    return all.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.builtin && !b.builtin) return -1;
      if (!a.builtin && b.builtin) return 1;
      return a.name.localeCompare(b.name);
    });
    // builtinViews is referentially unstable across renders for callers
    // that inline the array; serialize-then-stringify so we only re-derive
    // when the actual content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userViews, JSON.stringify(builtinViews)]);

  // Sync filters when the active view changes
  useEffect(() => {
    if (!activeViewId) {
      setFiltersState(defaultFilters);
      return;
    }
    const v = views.find((view) => view.id === activeViewId);
    if (v) {
      setFiltersState(v.filters);
    }
    // defaultFilters is referentially unstable — same JSON.stringify trick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, JSON.stringify(views)]);

  // Sync URL ?view=
  const selectView = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("view", id);
      else params.delete("view");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const setFilters = useCallback(
    (next: T | ((prev: T) => T)) => {
      setFiltersState((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next));
      // When filters diverge from the active view, deactivate it.
      if (activeViewId) setActiveViewId(null);
    },
    [activeViewId],
  );

  const saveView = useCallback(
    (name: string, opts: { color?: string; pinned?: boolean } = {}): SavedView<T> => {
      const view: SavedView<T> = {
        id: makeId(),
        name: name.trim() || "Untitled view",
        filters,
        createdAt: new Date().toISOString(),
        color: opts.color,
        pinned: opts.pinned,
      };
      setUserViews((prev) => {
        const next = [...prev, view];
        writeStored(storageKey, next);
        return next;
      });
      setActiveViewId(view.id);
      return view;
    },
    [filters, storageKey],
  );

  const updateView = useCallback(
    (id: string, patch: Partial<Omit<SavedView<T>, "id" | "createdAt" | "builtin">>) => {
      setUserViews((prev) => {
        const next = prev.map((v) => (v.id === id ? { ...v, ...patch } : v));
        writeStored(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const deleteView = useCallback(
    (id: string) => {
      setUserViews((prev) => {
        const next = prev.filter((v) => v.id !== id);
        writeStored(storageKey, next);
        return next;
      });
      if (activeViewId === id) selectView(null);
    },
    [storageKey, activeViewId, selectView],
  );

  const pinView = useCallback(
    (id: string, pinned: boolean) => updateView(id, { pinned }),
    [updateView],
  );

  const getShareUrl = useCallback((): string => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (activeViewId) {
      url.searchParams.set("view", activeViewId);
    } else {
      url.searchParams.delete("view");
    }
    return url.toString();
  }, [activeViewId]);

  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) ?? null : null;

  return {
    views,
    activeViewId,
    activeView,
    filters,
    setFilters,
    selectView,
    saveView,
    updateView,
    deleteView,
    pinView,
    getShareUrl,
    hydrated,
  };
}
