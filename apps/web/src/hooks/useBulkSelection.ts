"use client";

import { useCallback, useMemo, useState } from "react";

export interface UseBulkSelectionResult {
  selectedIds: Set<string>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Range-select between lastClicked and id (Shift-click pattern) */
  toggleRange: (allIds: string[], id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isAllSelected: (ids: string[]) => boolean;
  isSomeSelected: (ids: string[]) => boolean;
  /** Convenience: handle Shift-click vs plain click on a row */
  handleRowClick: (allIds: string[], id: string, shiftKey: boolean) => void;
}

/**
 * useBulkSelection — selection state for list views, paired with
 * <BulkActionsBar />. Tracks last-clicked id so Shift+click range-selects.
 *
 * Usage:
 *   const sel = useBulkSelection();
 *   ...
 *   <Checkbox checked={sel.isSelected(row.id)} onChange={() => sel.toggle(row.id)} />
 *   <BulkActionsBar
 *     count={sel.selectedCount}
 *     onClear={sel.clear}
 *     actions={[ ... ]}
 *   />
 */
export function useBulkSelection(): UseBulkSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastClickedId(id);
  }, []);

  const toggleRange = useCallback(
    (allIds: string[], id: string) => {
      if (!lastClickedId || lastClickedId === id) {
        toggle(id);
        return;
      }
      const startIdx = allIds.indexOf(lastClickedId);
      const endIdx = allIds.indexOf(id);
      if (startIdx === -1 || endIdx === -1) {
        toggle(id);
        return;
      }
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      const range = allIds.slice(from, to + 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Mirror the toggle state of the anchor (lastClicked) row
        const anchorSelected = next.has(lastClickedId);
        for (const rid of range) {
          if (anchorSelected) next.add(rid);
          else next.delete(rid);
        }
        return next;
      });
      setLastClickedId(id);
    },
    [lastClickedId, toggle],
  );

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setLastClickedId(ids[ids.length - 1] ?? null);
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const isSomeSelected = useCallback(
    (ids: string[]) => ids.some((id) => selectedIds.has(id)) && !ids.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const handleRowClick = useCallback(
    (allIds: string[], id: string, shiftKey: boolean) => {
      if (shiftKey) toggleRange(allIds, id);
      else toggle(id);
    },
    [toggle, toggleRange],
  );

  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      isSelected,
      toggle,
      toggleRange,
      selectAll,
      clear,
      isAllSelected,
      isSomeSelected,
      handleRowClick,
    }),
    [selectedIds, isSelected, toggle, toggleRange, selectAll, clear, isAllSelected, isSomeSelected, handleRowClick],
  );
}
