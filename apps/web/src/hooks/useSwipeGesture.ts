"use client";

import { useCallback, useRef, useState } from "react";

export interface SwipeGestureOptions {
  /** Pixels of horizontal pull required to trigger. Default 80. */
  threshold?: number;
  /** Fired on a successful right-pull (left → right swipe). */
  onSwipeRight?: () => void;
  /** Fired on a successful left-pull (right → left swipe). */
  onSwipeLeft?: () => void;
  /** Disable gesture entirely (e.g. while a row is in edit mode). */
  disabled?: boolean;
}

export interface SwipeGestureProps {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * useSwipeGesture — companion to `<SwipeRow />` for surfaces where the
 * full row-with-reveal-panel structure isn't viable (e.g. `<tr>` cells
 * inside a `<tbody>` where wrapping the row in a div would break HTML
 * table semantics).
 *
 * Returns spreadable touch handlers and the live drag offset so the
 * caller can apply a CSS transform if it wants visual feedback. First-
 * move axis lock (≥ 8 px) so vertical scroll never trips a swipe.
 *
 *   const { props, dx } = useSwipeGesture({
 *     onSwipeRight: () => archive(item.id),
 *     onSwipeLeft:  () => star(item.id),
 *   });
 *   <tr {...props} style={{ transform: `translateX(${dx}px)` }}>...</tr>
 */
export function useSwipeGesture(opts: SwipeGestureOptions) {
  const { threshold = 80, onSwipeRight, onSwipeLeft, disabled = false } = opts;
  const [dx, setDx] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<"x" | "y" | null>(null);

  const reset = useCallback(() => {
    setDx(0);
    lockedRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const t = e.touches[0];
      if (!t) return;
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      lockedRef.current = null;
    },
    [disabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const t = e.touches[0];
      if (!t) return;
      const ddx = t.clientX - startXRef.current;
      const ddy = t.clientY - startYRef.current;
      if (lockedRef.current === null) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
        lockedRef.current = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
      }
      if (lockedRef.current !== "x") return;

      // Only allow swipe directions with a registered handler so a row
      // doesn't drag if no action is wired.
      const allowed =
        ddx > 0 ? Boolean(onSwipeRight) : ddx < 0 ? Boolean(onSwipeLeft) : false;
      if (!allowed) return;

      const max = threshold * 1.4;
      setDx(Math.max(-max, Math.min(max, ddx)));
    },
    [disabled, onSwipeRight, onSwipeLeft, threshold],
  );

  const onTouchEnd = useCallback(() => {
    if (disabled) return reset();
    if (dx >= threshold && onSwipeRight) onSwipeRight();
    else if (dx <= -threshold && onSwipeLeft) onSwipeLeft();
    reset();
  }, [disabled, dx, threshold, onSwipeRight, onSwipeLeft, reset]);

  const props: SwipeGestureProps = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: reset,
  };

  return { props, dx };
}
