import React from "react";

/**
 * VisuallyHidden — hides content visually while keeping it accessible to
 * screen readers.  Uses the standard "sr-only" CSS technique.
 *
 * Usage:
 *   <VisuallyHidden>Label only for screen readers</VisuallyHidden>
 */
export function VisuallyHidden({
  children,
  as: Tag = "span",
  ...rest
}: Readonly<{
  children: React.ReactNode;
  as?: React.ElementType;
}> &
  React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...rest}
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
        ...rest.style,
      }}
    >
      {children}
    </Tag>
  );
}
