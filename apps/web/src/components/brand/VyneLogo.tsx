"use client";

// v=4 cache-buster — increment whenever the SVG files change
const V = "?v=4";

export interface VyneLogoProps {
  /**
   * mark       — icon only          (favicon, loading screens)
   * horizontal — icon + name right  (sidebar header)
   * stacked    — icon + name below  (auth pages, landing)
   */
  variant?: "mark" | "horizontal" | "stacked";
  /**
   * Controls rendered size.
   *   mark       → width & height = markSize px
   *   horizontal → height = markSize * 1.5 px  (width auto)
   *   stacked    → width  = markSize * 4 px     (height auto)
   */
  markSize?: number;
  className?: string;
}

export function VyneLogo({
  variant = "mark",
  markSize = 32,
  className,
}: VyneLogoProps) {
  if (variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/brand/logo-mark.svg${V}`}
        alt="VYNE"
        width={markSize}
        height={markSize}
        className={className}
        style={{ display: "block", flexShrink: 0 }}
      />
    );
  }

  if (variant === "horizontal") {
    const h = Math.round(markSize * 1.5);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/brand/logo-horizontal.svg${V}`}
        alt="VYNE — Run your company, not your tools."
        height={h}
        className={className}
        style={{ display: "block", flexShrink: 0 }}
      />
    );
  }

  // stacked
  const w = Math.round(markSize * 4);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/logo-stacked.svg${V}`}
      alt="VYNE — Run your company, not your tools."
      width={w}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
