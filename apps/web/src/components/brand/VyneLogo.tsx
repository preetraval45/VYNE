"use client";

import { useThemeStore } from "@/lib/stores/theme";

// v=5 cache-buster — increment whenever the SVG files change
const V = "?v=5";

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
  /** Force the default VYNE mark even when a tenant logo is set
   *  (auth landing pages, marketing). Default false. */
  ignoreTenant?: boolean;
}

export function VyneLogo({
  variant = "mark",
  markSize = 32,
  className,
  ignoreTenant = false,
}: VyneLogoProps) {
  const tenantLogo = useThemeStore((s) => s.logoUrl);

  // Tenant logo overrides every variant when set. We render it as a
  // square mark for mark/horizontal/stacked alike since a single user-
  // uploaded asset can't be reliably split into horizontal lockups.
  if (!ignoreTenant && tenantLogo) {
    const h =
      variant === "mark"
        ? markSize
        : variant === "horizontal"
          ? Math.round(markSize * 1.5)
          : Math.round(markSize * 4);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenantLogo}
        alt="Workspace logo"
        height={h}
        className={className}
        data-no-scale
        style={{ display: "block", flexShrink: 0, maxHeight: h, width: "auto" }}
      />
    );
  }

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
