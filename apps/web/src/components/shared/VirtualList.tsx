"use client";

import {
  CSSProperties,
  ReactNode,
  UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * VirtualList — fixed-height row windowing without extra deps.
 *
 *   <VirtualList
 *     items={contacts}
 *     rowHeight={48}
 *     height={520}
 *     getKey={(c) => c.id}
 *     renderRow={(c, i) => <ContactRow contact={c} index={i} />}
 *   />
 *
 * Implementation:
 *   - The outer scroll container is `height` tall.
 *   - The inner spacer is `items.length * rowHeight` tall, so the
 *     scrollbar stays accurate across the full data set.
 *   - On scroll we compute `[start, end]` and absolutely-position
 *     visible rows via `transform: translateY(...)`. Off-screen rows
 *     are never mounted.
 *   - `overscan` adds a buffer above + below so fast scrolls stay
 *     smooth.
 *
 * Use this for any list expected to grow past ~100 rows. For grids /
 * variable-height rows, swap for @tanstack/react-virtual.
 */

export interface VirtualListProps<T> {
  items: readonly T[];
  /** Fixed pixel height per row. */
  rowHeight: number;
  /** Container height in px or any CSS length. Required for the scroll viewport. */
  height: number | string;
  /** Stable key per row for React diffing. */
  getKey: (item: T, index: number) => string | number;
  /** Render the row body. The wrapper handles sizing + positioning. */
  renderRow: (item: T, index: number) => ReactNode;
  /** Buffer rows above + below the viewport. Default 6. */
  overscan?: number;
  /** Optional className passthrough. */
  className?: string;
  /** Optional style passthrough on the outer scroll container. */
  style?: CSSProperties;
  /** ARIA label for the scroll container (default: "Virtualised list"). */
  ariaLabel?: string;
  /** Called when the user scrolls past the last row, useful for
   *  infinite-loading pagination. */
  onEndReached?: () => void;
  /** Trigger `onEndReached` when within this many pixels of the bottom. Default 200. */
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  rowHeight,
  height,
  getKey,
  renderRow,
  overscan = 6,
  className,
  style,
  ariaLabel = "Virtualised list",
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(
    typeof height === "number" ? height : 0,
  );

  // Track viewport size when height is a CSS string (e.g. "100%").
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportH(entry.contentRect.height);
    });
    observer.observe(el);
    setViewportH(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const totalHeight = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount =
    Math.ceil((viewportH || 0) / rowHeight) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);

  const visible = useMemo(() => items.slice(start, end), [items, start, end]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setScrollTop(el.scrollTop);
      if (
        onEndReached &&
        el.scrollHeight - el.scrollTop - el.clientHeight < endReachedThreshold
      ) {
        onEndReached();
      }
    },
    [onEndReached, endReachedThreshold],
  );

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      role="list"
      aria-label={ariaLabel}
      className={className}
      style={{
        height,
        overflowY: "auto",
        position: "relative",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: totalHeight,
          position: "relative",
        }}
      >
        {visible.map((item, idx) => {
          const i = start + idx;
          return (
            <div
              key={getKey(item, i)}
              role="listitem"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: rowHeight,
                transform: `translateY(${i * rowHeight}px)`,
                contain: "layout paint",
                willChange: "transform",
              }}
            >
              {renderRow(item, i)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
