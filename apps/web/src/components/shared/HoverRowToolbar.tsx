"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

export interface HoverRowAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  destructive?: boolean;
  /** Disabled state with optional reason */
  disabled?: boolean;
  disabledReason?: string;
}

export interface HoverRowToolbarProps {
  actions: HoverRowAction[];
  /** Always show toolbar (e.g., on touch devices) */
  alwaysVisible?: boolean;
  /** Position the toolbar inside the row at this corner */
  position?: "right" | "left";
  /** Background style — "raised" lifts above row, "flush" blends in */
  variant?: "raised" | "flush";
  style?: CSSProperties;
}

/**
 * <HoverRowToolbar /> — drop-in inline action toolbar for list rows.
 * Wrap rows in a positioned container with `data-row-hover-target` and the
 * toolbar fades in on hover/focus. Tab-accessible.
 *
 * Usage:
 *   <div className="row-hover-target" style={{ position: "relative" }}>
 *     <RowContent />
 *     <HoverRowToolbar actions={[
 *       { id: "edit", label: "Edit", icon: Pencil, onClick: () => ... },
 *       { id: "del", label: "Delete", icon: Trash2, onClick: () => ..., destructive: true },
 *     ]} />
 *   </div>
 */
export function HoverRowToolbar({
  actions,
  alwaysVisible = false,
  position = "right",
  variant = "raised",
  style,
}: HoverRowToolbarProps) {
  if (actions.length === 0) return null;

  const containerStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [position]: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: 3,
    borderRadius: 8,
    background: variant === "raised" ? "var(--content-bg)" : "transparent",
    border: variant === "raised" ? "1px solid var(--content-border)" : "none",
    boxShadow: variant === "raised" ? "0 2px 8px rgba(16, 24, 40, 0.06)" : undefined,
    opacity: alwaysVisible ? 1 : 0,
    pointerEvents: alwaysVisible ? "auto" : "none",
    transition: "opacity 0.12s",
    zIndex: 2,
    ...style,
  };

  return (
    <div
      className="hover-row-toolbar"
      data-always-visible={alwaysVisible ? "true" : "false"}
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((a) => (
        <ActionButton key={a.id} action={a} />
      ))}
    </div>
  );
}

function ActionButton({ action }: { action: HoverRowAction }) {
  const [hover, setHover] = useState(false);
  const Icon = action.icon;
  const disabled = Boolean(action.disabled);

  const baseColor = action.destructive ? "#B91C1C" : "var(--text-secondary)";
  const hoverBg = action.destructive
    ? "rgba(220, 38, 38, 0.08)"
    : "var(--content-secondary)";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) action.onClick();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={action.label}
      title={disabled ? (action.disabledReason ?? action.label) : action.label}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 6,
        border: "none",
        background: hover && !disabled ? hoverBg : "transparent",
        color: disabled ? "var(--text-tertiary)" : baseColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.1s, color 0.1s",
      }}
    >
      <Icon size={14} />
    </button>
  );
}
