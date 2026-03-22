"use client";

/**
 * Pagination — offset-based page navigation component for VYNE.
 *
 * Features:
 * - Page number buttons with intelligent ellipsis for large page counts
 * - Previous / Next buttons with disabled states
 * - "Showing X–Y of Z items" summary text
 * - Page size selector dropdown (10, 25, 50, 100)
 * - Fully themed via CSS variables
 *
 * Usage:
 *   import { Pagination } from '@/components/shared/Pagination'
 *   <Pagination
 *     page={3}
 *     totalPages={12}
 *     totalCount={287}
 *     pageSize={25}
 *     onPageChange={(p) => goToPage(p)}
 *     onPageSizeChange={(s) => setPageSize(s)}
 *   />
 */

import React, { useMemo } from "react";

// ─── Styles (injected once) ─────────────────────────────────────

function PaginationStyles() {
  return (
    <style
      data-vyne="pagination"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
.vyne-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-secondary, #6B6B8A);
  flex-wrap: wrap;
}

.vyne-pagination__info {
  white-space: nowrap;
}

.vyne-pagination__controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vyne-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--content-border, #E0E0EC);
  border-radius: 6px;
  background: var(--content-bg, #FFFFFF);
  color: var(--text-primary, #1A1A2E);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1;
}

.vyne-pagination__btn:hover:not(:disabled):not(.vyne-pagination__btn--active) {
  background: var(--content-hover, #F4F4FA);
  border-color: var(--content-border-hover, #C8C8DA);
}

.vyne-pagination__btn:focus-visible {
  outline: 2px solid var(--accent-primary, #6C47FF);
  outline-offset: 1px;
}

.vyne-pagination__btn--active {
  background: var(--accent-primary, #6C47FF);
  border-color: var(--accent-primary, #6C47FF);
  color: #FFFFFF;
  cursor: default;
}

.vyne-pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vyne-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  color: var(--text-tertiary, #A0A0B8);
  font-size: 14px;
  user-select: none;
  letter-spacing: 2px;
}

.vyne-pagination__size-select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--content-border, #E0E0EC);
  border-radius: 6px;
  background: var(--content-bg, #FFFFFF);
  color: var(--text-primary, #1A1A2E);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease;
  margin-left: 8px;
}

.vyne-pagination__size-select:hover {
  border-color: var(--content-border-hover, #C8C8DA);
}

.vyne-pagination__size-select:focus-visible {
  outline: 2px solid var(--accent-primary, #6C47FF);
  outline-offset: 1px;
}

[data-theme="dark"] .vyne-pagination__btn {
  background: var(--content-bg, #12121E);
  border-color: var(--content-border, #2A2A42);
  color: var(--text-primary, #E8E8F0);
}

[data-theme="dark"] .vyne-pagination__btn:hover:not(:disabled):not(.vyne-pagination__btn--active) {
  background: var(--content-hover, #1E1E32);
}

[data-theme="dark"] .vyne-pagination__size-select {
  background: var(--content-bg, #12121E);
  border-color: var(--content-border, #2A2A42);
  color: var(--text-primary, #E8E8F0);
}
`,
      }}
    />
  );
}

// ─── Page Range Calculation ─────────────────────────────────────

/**
 * Generates the array of page numbers/ellipsis markers to display.
 * Always shows first page, last page, and a window around the current page.
 *
 * Examples:
 *   page=1, total=5   => [1, 2, 3, 4, 5]
 *   page=1, total=10  => [1, 2, 3, '...', 10]
 *   page=5, total=10  => [1, '...', 4, 5, 6, '...', 10]
 *   page=10, total=10 => [1, '...', 8, 9, 10]
 */
function getPageRange(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): Array<number | "ellipsis"> {
  // If total pages fit within the maximum visible slots, show all
  const totalSlots = siblingCount * 2 + 5; // siblings + current + 2 boundaries + 2 ellipses
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    // Near the start: show more pages on the left
    const leftRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => i + 1,
    );
    return [...leftRange, "ellipsis", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    // Near the end: show more pages on the right
    const rightStart = totalPages - (2 + siblingCount * 2);
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => rightStart + i,
    );
    return [1, "ellipsis", ...rightRange];
  }

  // Middle: show window around current page
  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i,
  );
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
}

// ─── Props ──────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type PaginationProps = Readonly<{
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total item count across all pages */
  totalCount: number;
  /** Current page size */
  pageSize: number;
  /** Callback when the user clicks a page */
  onPageChange: (page: number) => void;
  /** Callback when the user changes page size */
  onPageSizeChange?: (pageSize: number) => void;
  /** Number of sibling pages to show around current. Default `1` */
  siblingCount?: number;
  /** Whether to show the page size selector. Default `true` */
  showPageSizeSelector?: boolean;
  /** Whether to show the item count summary. Default `true` */
  showItemCount?: boolean;
  /** Custom page size options. Default `[10, 25, 50, 100]` */
  pageSizeOptions?: readonly number[];
  /** Extra className for the root element */
  className?: string;
}>;

// ─── Component ──────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  siblingCount = 1,
  showPageSizeSelector = true,
  showItemCount = true,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className = "",
}: PaginationProps) {
  const pageRange = useMemo(
    () => getPageRange(page, totalPages, siblingCount),
    [page, totalPages, siblingCount],
  );

  // Calculate "Showing X-Y of Z"
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange?.(Number(e.target.value));
  };

  if (totalPages <= 0) {
    return null;
  }

  return (
    <>
      <PaginationStyles />
      <nav
        className={`vyne-pagination ${className}`}
        role="navigation"
        aria-label="Pagination"
      >
        {/* Item count summary */}
        {showItemCount && (
          <div className="vyne-pagination__info">
            {totalCount > 0
              ? `Showing ${rangeStart}\u2013${rangeEnd} of ${totalCount.toLocaleString()} items`
              : "No items"}
          </div>
        )}

        {/* Page controls */}
        <div className="vyne-pagination__controls">
          {/* Previous button */}
          <button
            type="button"
            className="vyne-pagination__btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Page numbers */}
          {pageRange.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="vyne-pagination__ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isActive = item === page;
            return (
              <button
                key={item}
                type="button"
                className={`vyne-pagination__btn${isActive ? " vyne-pagination__btn--active" : ""}`}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item}
              </button>
            );
          })}

          {/* Next button */}
          <button
            type="button"
            className="vyne-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Page size selector */}
          {showPageSizeSelector && onPageSizeChange && (
            <select
              className="vyne-pagination__size-select"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          )}
        </div>
      </nav>
    </>
  );
}
