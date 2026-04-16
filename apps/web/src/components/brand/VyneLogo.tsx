"use client";

import { useId } from "react";

// ── Aurora Layers mark ───────────────────────────────────────────────
// Option A + C fused:
//   • 3 stacked V layers (wide aura → mid-glow → crisp core) for holographic depth
//   • Horizontal aurora gradient stroke: purple → indigo → cyan
//   • Glowing cyan dot at the convergence vertex
//   • Near-black deep-space background
function VyneMark({ size = 32 }: Readonly<{ size?: number }>) {
  const u = useId().replace(/:/g, "");
  const bg   = `vbg-${u}`;
  const vg   = `vg-${u}`;  // aurora gradient (shared across all layers)
  const dotG = `vd-${u}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* Deep-space background */}
      <rect width="32" height="32" rx="8" fill={`url(#${bg})`} />

      {/* Layer 3 — wide aura bloom */}
      <path
        d="M6 8.5 L16 23 L26 8.5"
        stroke={`url(#${vg})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.11"
      />
      {/* Layer 2 — mid glow */}
      <path
        d="M6 8.5 L16 23 L26 8.5"
        stroke={`url(#${vg})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.22"
      />
      {/* Layer 1 — crisp core V */}
      <path
        d="M6 8.5 L16 23 L26 8.5"
        stroke={`url(#${vg})`}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Vertex dot — outer halo + bright core */}
      <circle cx="16" cy="23" r="4.5" fill={`url(#${dotG})`} opacity="0.18" />
      <circle cx="16" cy="23" r="2.2" fill={`url(#${dotG})`} />

      <defs>
        {/* Near-black with ultra-subtle purple undertone */}
        <linearGradient id={bg} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#070010" />
          <stop offset="1" stopColor="#0F0028" />
        </linearGradient>

        {/* Aurora: horizontal sweep so left arm is purple, right arm is cyan */}
        <linearGradient id={vg} x1="6" y1="8.5" x2="26" y2="8.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="0.45" stopColor="#818CF8" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>

        {/* Cyan-white radial for the vertex dot */}
        <radialGradient id={dotG} cx="50%" cy="30%" r="60%">
          <stop stopColor="#E0F9FF" />
          <stop offset="1" stopColor="#22D3EE" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Shared gradient text style ──────────────────────────────────────
const AURORA_TEXT: React.CSSProperties = {
  background: "linear-gradient(90deg, #C084FC 0%, #818CF8 50%, #22D3EE 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── Public VyneLogo component ────────────────────────────────────────
export interface VyneLogoProps {
  /**
   * mark       — icon only          (favicon, loading screens)
   * horizontal — icon + name right  (sidebar header, nav bars)
   * stacked    — icon + name below  (auth pages, landing page)
   */
  variant?: "mark" | "horizontal" | "stacked";
  /** Pixel size of the icon mark. Typography scales proportionally. */
  markSize?: number;
  className?: string;
}

export function VyneLogo({
  variant = "mark",
  markSize = 32,
  className,
}: VyneLogoProps) {
  // ── mark only ─────────────────────────────────────────────────────
  if (variant === "mark") {
    return (
      <span className={className} style={{ display: "inline-flex" }}>
        <VyneMark size={markSize} />
      </span>
    );
  }

  // ── horizontal: icon | VYNE / Company OS ──────────────────────────
  if (variant === "horizontal") {
    const nameSize = Math.round(markSize * 0.54);
    const tagSize  = Math.round(markSize * 0.28);
    return (
      <div
        className={`flex items-center ${className ?? ""}`}
        style={{ gap: Math.round(markSize * 0.32) }}
      >
        <VyneMark size={markSize} />
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              ...AURORA_TEXT,
              fontSize: nameSize,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            VYNE
          </div>
          <div
            style={{
              fontSize: tagSize,
              fontWeight: 500,
              letterSpacing: "0.07em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.38)",
              marginTop: 2,
            }}
          >
            Company OS
          </div>
        </div>
      </div>
    );
  }

  // ── stacked: icon on top, VYNE + tagline below ────────────────────
  const nameSize = Math.round(markSize * 0.6);
  const tagSize  = Math.round(markSize * 0.265);
  return (
    <div
      className={`flex flex-col items-center ${className ?? ""}`}
      style={{ gap: Math.round(markSize * 0.3) }}
    >
      <VyneMark size={markSize} />
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <div
          style={{
            ...AURORA_TEXT,
            fontSize: nameSize,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          VYNE
        </div>
        <div
          style={{
            fontSize: tagSize,
            fontWeight: 500,
            letterSpacing: "0.09em",
            textTransform: "uppercase" as const,
            color: "rgba(255,255,255,0.38)",
            marginTop: Math.round(markSize * 0.1),
          }}
        >
          AI‑native Company OS
        </div>
      </div>
    </div>
  );
}
