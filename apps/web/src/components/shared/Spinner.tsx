"use client";

import type { CSSProperties } from "react";

export interface SpinnerProps {
  /** Pixel size of the rotating ring. Default 14. */
  size?: number;
  /** Stroke colour — defaults to currentColor so the spinner inherits
   *  the surrounding text colour. */
  color?: string;
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Inline style override. */
  style?: CSSProperties;
}

/**
 * Spinner — uses the shared `.vyne-spinner` keyframe rule from
 * globals.css. Drop in any place a load is in flight; pairs naturally
 * with text so a button can read `[<Spinner /> Saving…]`.
 */
export function Spinner({
  size = 14,
  color,
  label = "Loading",
  style,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className="vyne-spinner"
      style={{
        width: size,
        height: size,
        color,
        ...style,
      }}
    />
  );
}
