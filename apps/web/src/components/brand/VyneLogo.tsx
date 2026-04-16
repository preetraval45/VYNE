"use client";

import { useId } from "react";

// ── Signal Convergence mark ──────────────────────────────────────────
// Two dimmed source nodes at top, arms that grow brighter as they
// converge, and a luminous focal dot at the vertex. Deep dark background
// with a radial glow behind the convergence point.
function VyneMark({ size = 32 }: Readonly<{ size?: number }>) {
  const uid = useId().replace(/:/g, "");
  const bg = `vbg${uid}`;
  const glow = `vgl${uid}`;
  const armL = `val${uid}`;
  const armR = `var${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Dark deep-purple background */}
      <rect width="32" height="32" rx="8" fill={`url(#${bg})`} />
      {/* Radial glow centred on the convergence point */}
      <rect width="32" height="32" rx="8" fill={`url(#${glow})`} />
      {/* V arms — fade from dim at sources to bright at vertex */}
      <line x1="7" y1="9" x2="16" y2="22" stroke={`url(#${armL})`} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="9" x2="16" y2="22" stroke={`url(#${armR})`} strokeWidth="2.5" strokeLinecap="round" />
      {/* Source nodes */}
      <circle cx="7" cy="9" r="2.2" fill="white" opacity="0.45" />
      <circle cx="25" cy="9" r="2.2" fill="white" opacity="0.45" />
      {/* Convergence node — bright focal point with halo */}
      <circle cx="16" cy="22" r="5.5" fill="white" opacity="0.07" />
      <circle cx="16" cy="22" r="3.2" fill="white" />
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D0221" />
          <stop offset="0.6" stopColor="#2A0A6B" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="69%" r="46%" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={armL} x1="7" y1="9" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0.88" />
        </linearGradient>
        <linearGradient id={armR} x1="25" y1="9" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0.88" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Public logo component ────────────────────────────────────────────
interface VyneLogoProps {
  /**
   * mark       — icon only (default)
   * horizontal — icon + name + tagline on the right  (sidebar header)
   * stacked    — icon + name + tagline below          (auth/landing)
   */
  variant?: "mark" | "horizontal" | "stacked";
  /** Size of the icon mark in px. Text scales proportionally. */
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
      <span className={className}>
        <VyneMark size={markSize} />
      </span>
    );
  }

  if (variant === "horizontal") {
    const nameSize = Math.round(markSize * 0.53);
    const tagSize = Math.round(markSize * 0.28);
    return (
      <div
        className={`flex items-center ${className ?? ""}`}
        style={{ gap: Math.round(markSize * 0.32) }}
      >
        <VyneMark size={markSize} />
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            VYNE
          </div>
          <div
            style={{
              fontSize: tagSize,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            Company OS
          </div>
        </div>
      </div>
    );
  }

  // stacked
  const nameSize = Math.round(markSize * 0.58);
  const tagSize = Math.round(markSize * 0.27);
  return (
    <div
      className={`flex flex-col items-center ${className ?? ""}`}
      style={{ gap: Math.round(markSize * 0.28) }}
    >
      <VyneMark size={markSize} />
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <div
          style={{
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
            opacity: 0.45,
            textTransform: "uppercase",
            marginTop: Math.round(markSize * 0.1),
          }}
        >
          AI‑native Company OS
        </div>
      </div>
    </div>
  );
}
