"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "purple";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  neutral: { bg: "var(--content-secondary)", text: "var(--text-secondary)", dot: "var(--text-tertiary)" },
  success: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)", dot: "var(--status-success)" },
  warning: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", dot: "var(--status-warning)" },
  danger:  { bg: "var(--badge-danger-bg)",  text: "var(--badge-danger-text)",  dot: "var(--status-danger)"  },
  info:    { bg: "var(--badge-info-bg)",    text: "var(--badge-info-text)",    dot: "var(--status-info)"    },
  purple:  { bg: "var(--alert-purple-bg)",  text: "var(--alert-purple-text)",  dot: "var(--vyne-purple)"    },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0.5 rounded",
  md: "text-xs px-2 py-0.5 rounded-md",
};

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        sizeStyles[size],
        className,
      )}
      style={{ background: s.bg, color: s.text }}
      {...rest}
    >
      {dot && (
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: s.dot }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
