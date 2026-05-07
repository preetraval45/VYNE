"use client";

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";

export interface SwipeAction {
  /** Stable id for React keys + a11y. */
  id: string;
  /** Short label rendered inside the action panel (max ~10 chars). */
  label: string;
  /** Lucide icon component, sized by the row internally. */
  icon: React.ElementType;
  /** Hex / CSS colour for the action panel background. */
  color: string;
  /** Fired when the user releases past the trigger threshold. */
  onTrigger: () => void;
}

export interface SwipeRowProps {
  /** Children rendered as the row body. */
  children: ReactNode;
  /** Left action — revealed by swiping right. Common: archive. */
  left?: SwipeAction;
  /** Right action — revealed by swiping left. Common: star / favorite. */
  right?: SwipeAction;
  /** Pixels of pull required before release fires the action. Default 80. */
  threshold?: number;
  /** Disable swipe gestures entirely (e.g. while editing inline). */
  disabled?: boolean;
  /** Container style override — usually you don't need this. */
  style?: CSSProperties;
}

/**
 * SwipeRow — touch swipe row with left + right action panels, parallel
 * to <HoverRowToolbar /> on desktop. Common pattern is mailbox-style:
 * left swipe reveals "Archive", right swipe reveals "Star".
 *
 *   <SwipeRow
 *     left={{ id: "archive", label: "Archive", icon: Archive, color: "#0F9D58", onTrigger: () => archive(item.id) }}
 *     right={{ id: "star", label: "Star", icon: Star, color: "#F59E0B", onTrigger: () => toggleStar(item.id) }}
 *   >
 *     <ContactRow item={item} />
 *   </SwipeRow>
 *
 * Mouse / desktop are passthroughs — the row keeps its existing click
 * + hover semantics. We only intercept `touch*` events so a tap or
 * scroll on a non-touch device is unaffected.
 */
export function SwipeRow(props: SwipeRowProps) {
  const {
    children,
    left,
    right,
    threshold = 80,
    disabled = false,
    style,
  } = props;

  const [dx, setDx] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<"x" | "y" | null>(null);

  const reset = useCallback(() => {
    setSnapping(true);
    setDx(0);
    setTimeout(() => setSnapping(false), 220);
  }, []);

  const onStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const t = e.touches[0];
      if (!t) return;
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      lockedRef.current = null;
      setSnapping(false);
    },
    [disabled],
  );

  const onMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const t = e.touches[0];
      if (!t) return;
      const ddx = t.clientX - startXRef.current;
      const ddy = t.clientY - startYRef.current;

      // First-move axis lock so a vertical scroll never accidentally
      // triggers a tiny swipe; horizontal swipes shouldn't become a scroll.
      if (lockedRef.current === null) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
        lockedRef.current = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
      }
      if (lockedRef.current !== "x") return;

      // Only allow swipe directions that have a configured action.
      const allowed =
        ddx > 0 ? Boolean(left) : ddx < 0 ? Boolean(right) : false;
      if (!allowed) return;

      // Soft-cap the visible drag at 1.4× threshold so over-pull dampens.
      const max = threshold * 1.4;
      const clamped = Math.max(-max, Math.min(max, ddx));
      setDx(clamped);
    },
    [disabled, left, right, threshold],
  );

  const onEnd = useCallback(() => {
    if (disabled) return;
    const action = dx > 0 ? left : right;
    if (action && Math.abs(dx) >= threshold) {
      action.onTrigger();
      // Brief settle animation back to 0 so the row visibly returns.
    }
    reset();
  }, [disabled, dx, left, right, threshold, reset]);

  // Compute the visible action panel only when the user has pulled.
  const direction: "left" | "right" | null =
    dx > 0 ? "left" : dx < 0 ? "right" : null;
  const action = direction === "left" ? left : right;
  const isReady = action && Math.abs(dx) >= threshold;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onTouchCancel={reset}
    >
      {/* Action panel sits beneath the row — revealed as the row slides. */}
      {action && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            [direction === "left" ? "left" : "right"]: 0,
            width: Math.abs(dx),
            background: action.color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
            transition: snapping ? "width 0.2s ease-out" : undefined,
          }}
        >
          {Math.abs(dx) >= 36 && (
            <>
              <action.icon
                size={isReady ? 18 : 16}
                style={{
                  transition: "transform 0.15s",
                  transform: isReady ? "scale(1.1)" : "scale(1)",
                }}
              />
              {Math.abs(dx) >= 60 && <span>{action.label}</span>}
            </>
          )}
        </div>
      )}

      <div
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: snapping
            ? "transform 0.2s cubic-bezier(0.2, 0.7, 0.3, 1)"
            : undefined,
          touchAction: lockedRef.current === "x" ? "pan-y" : "auto",
          background: "var(--content-bg)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
