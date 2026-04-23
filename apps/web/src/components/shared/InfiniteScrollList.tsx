"use client";

/**
 * InfiniteScrollList — cursor-based infinite scroll component for VYNE.
 *
 * Uses IntersectionObserver to detect when the user scrolls to the bottom
 * and automatically fetches the next page. Includes a "Load more" fallback
 * button for accessibility and cases where IO is not supported.
 *
 * Usage:
 *   import { InfiniteScrollList } from '@/components/shared/InfiniteScrollList'
 *
 *   const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
 *     usePagination({ type: 'cursor', ... })
 *
 *   <InfiniteScrollList
 *     items={data}
 *     hasNextPage={hasNextPage}
 *     isFetchingNextPage={isFetchingNextPage}
 *     isLoading={isLoading}
 *     fetchNextPage={fetchNextPage}
 *   >
 *     {(items) => items.map((item) => <Card key={item.id} item={item} />)}
 *   </InfiniteScrollList>
 */

import React, { useRef, useEffect, useCallback } from "react";

// ─── Styles ─────────────────────────────────────────────────────

function InfiniteScrollStyles() {
  return (
    <style
      data-vyne="infinite-scroll"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
.vyne-infinite-scroll__sentinel {
  width: 100%;
  height: 1px;
  pointer-events: none;
}

.vyne-infinite-scroll__spinner-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 8px;
}

@keyframes vyneSpinnerRotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.vyne-infinite-scroll__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--content-border, #E0E0EC);
  border-top-color: var(--accent-primary, #06B6D4);
  border-radius: 50%;
  animation: vyneSpinnerRotate 0.7s linear infinite;
}

.vyne-infinite-scroll__spinner-text {
  font-size: 13px;
  color: var(--text-secondary, #6B6B8A);
}

.vyne-infinite-scroll__load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}

.vyne-infinite-scroll__load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 1px solid var(--content-border, #E0E0EC);
  border-radius: 8px;
  background: var(--content-bg, #FFFFFF);
  color: var(--text-primary, #1A1A2E);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vyne-infinite-scroll__load-more-btn:hover:not(:disabled) {
  background: var(--content-hover, #F4F4FA);
  border-color: var(--content-border-hover, #C8C8DA);
}

.vyne-infinite-scroll__load-more-btn:focus-visible {
  outline: 2px solid var(--accent-primary, #06B6D4);
  outline-offset: 1px;
}

.vyne-infinite-scroll__load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vyne-infinite-scroll__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-tertiary, #A0A0B8);
  font-size: 14px;
}

.vyne-infinite-scroll__end {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  color: var(--text-tertiary, #A0A0B8);
  font-size: 12px;
}

[data-theme="dark"] .vyne-infinite-scroll__load-more-btn {
  background: var(--content-bg, #12121E);
  border-color: var(--content-border, #2A2A42);
  color: var(--text-primary, #E8E8F0);
}

[data-theme="dark"] .vyne-infinite-scroll__load-more-btn:hover:not(:disabled) {
  background: var(--content-hover, #1E1E32);
}
`,
      }}
    />
  );
}

// ─── Props ──────────────────────────────────────────────────────

type InfiniteScrollListProps<T> = Readonly<{
  /** The array of loaded items */
  items: T[];
  /** Whether there is a next page to fetch */
  hasNextPage: boolean;
  /** Whether the next page is currently being fetched */
  isFetchingNextPage: boolean;
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Callback to fetch the next page */
  fetchNextPage: () => void;
  /** Render function — receives all loaded items, returns ReactNode */
  children: (items: T[]) => React.ReactNode;
  /** IntersectionObserver rootMargin. Default `'200px'` (prefetch before visible) */
  rootMargin?: string;
  /** Threshold for IntersectionObserver. Default `0` */
  threshold?: number;
  /** Text shown when items is empty and not loading. Default `'No items to display'` */
  emptyMessage?: string;
  /** Text shown when all items have been loaded. Default `''` (hidden) */
  endMessage?: string;
  /** Whether to show the manual "Load more" button. Default `true` */
  showLoadMoreButton?: boolean;
  /** Loading text shown next to spinner. Default `'Loading...'` */
  loadingText?: string;
  /** Extra className for the root element */
  className?: string;
}>;

// ─── Component ──────────────────────────────────────────────────

export function InfiniteScrollList<T>({
  items,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  fetchNextPage,
  children,
  rootMargin = "200px",
  threshold = 0,
  emptyMessage = "No items to display",
  endMessage = "",
  showLoadMoreButton = true,
  loadingText = "Loading...",
  className = "",
}: InfiniteScrollListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── IntersectionObserver ────────────────────────────────────────
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Guard for environments without IntersectionObserver (SSR, old browsers)
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold]);

  // ── Loading state (initial) ────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <InfiniteScrollStyles />
        <div className={className}>
          <div className="vyne-infinite-scroll__spinner-wrap" role="status">
            <div className="vyne-infinite-scroll__spinner" aria-hidden="true" />
            <span className="vyne-infinite-scroll__spinner-text">
              {loadingText}
            </span>
          </div>
        </div>
      </>
    );
  }

  // ── Empty state ────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <>
        <InfiniteScrollStyles />
        <div className={className}>
          <div className="vyne-infinite-scroll__empty">{emptyMessage}</div>
        </div>
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────
  return (
    <>
      <InfiniteScrollStyles />
      <div className={className}>
        {/* Rendered items via children render function */}
        {children(items)}

        {/* Sentinel element — IntersectionObserver watches this */}
        <div
          ref={sentinelRef}
          className="vyne-infinite-scroll__sentinel"
          aria-hidden="true"
        />

        {/* Loading spinner (fetching next page) */}
        {isFetchingNextPage && (
          <div className="vyne-infinite-scroll__spinner-wrap" role="status">
            <div className="vyne-infinite-scroll__spinner" aria-hidden="true" />
            <span className="vyne-infinite-scroll__spinner-text">
              {loadingText}
            </span>
          </div>
        )}

        {/* "Load more" fallback button */}
        {!isFetchingNextPage && hasNextPage && showLoadMoreButton && (
          <div className="vyne-infinite-scroll__load-more">
            <button
              type="button"
              className="vyne-infinite-scroll__load-more-btn"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Load more
            </button>
          </div>
        )}

        {/* End message */}
        {!hasNextPage && endMessage && (
          <div className="vyne-infinite-scroll__end">{endMessage}</div>
        )}
      </div>
    </>
  );
}
