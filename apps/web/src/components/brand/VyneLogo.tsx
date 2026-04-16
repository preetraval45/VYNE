"use client";

import Image from "next/image";

export interface VyneLogoProps {
  /**
   * mark       — icon only          (favicon, loading screens)
   * horizontal — icon + name right  (sidebar header)
   * stacked    — icon + name below  (auth pages, landing)
   */
  variant?: "mark" | "horizontal" | "stacked";
  /**
   * Controls rendered size.
   *   mark       → width & height = markSize
   *   horizontal → height = markSize (width scales proportionally)
   *   stacked    → width  = markSize * 4  (height scales proportionally)
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
      <Image
        src="/brand/logo-mark.svg"
        alt="VYNE"
        width={markSize}
        height={markSize}
        className={className}
        priority
      />
    );
  }

  if (variant === "horizontal") {
    // SVG canvas is 340 × 64 → aspect ratio ≈ 5.3 : 1
    const h = Math.round(markSize * 1.5);
    const w = Math.round(h * (340 / 64));
    return (
      <Image
        src="/brand/logo-horizontal.svg"
        alt="VYNE — Run your company, not your tools."
        width={w}
        height={h}
        className={className}
        priority
      />
    );
  }

  // stacked — SVG canvas is 380 × 195 → aspect ratio ≈ 1.95 : 1
  const w = Math.round(markSize * 4);
  const h = Math.round(w * (195 / 380));
  return (
    <Image
      src="/brand/logo-stacked.svg"
      alt="VYNE — Run your company, not your tools."
      width={w}
      height={h}
      className={className}
      priority
    />
  );
}
