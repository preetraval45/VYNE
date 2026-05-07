"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, HelpCircle, ChevronRight } from "lucide-react";

/**
 * CoachMark — a tiny "?" badge pinned to any element, paired with a
 * dismissable tooltip. Once dismissed (per-id) the badge disappears
 * forever for that user.
 *
 *   <CoachMark id="saved-views-intro" placement="bottom" title="Saved views">
 *     Pin a filter combo and share it via URL. Try it on any list page.
 *   </CoachMark>
 *
 * Usage in a parent:
 *   <h2 style={{ position: "relative" }}>
 *     Saved views <CoachMark id="…">…</CoachMark>
 *   </h2>
 *
 * The component positions itself absolutely so it follows whatever the
 * parent's layout decides (top-right, inline, etc.).
 *
 * Auto-pops the tooltip on first render unless `defer` is true.
 */

const STORAGE_PREFIX = "vyne-coachmark-";

export interface CoachMarkProps {
  /** Stable, unique id used for per-user dismissal. */
  id: string;
  /** Tooltip headline — short. */
  title: string;
  /** Tooltip body — one or two short sentences. */
  children: ReactNode;
  /** Where to place the popover relative to the badge. */
  placement?: "top" | "bottom" | "left" | "right";
  /** Don't auto-pop the popover — wait for click. Default: pops once after 600 ms. */
  defer?: boolean;
  /** Style override for the badge (e.g. shift to the right of a label). */
  style?: React.CSSProperties;
}

function loadDismissed(id: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_PREFIX + id) === "1";
}

function persistDismissed(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, "1");
  } catch {
    // ignore
  }
}

export function CoachMark({
  id,
  title,
  children,
  placement = "bottom",
  defer = false,
  style,
}: CoachMarkProps) {
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Resolve dismissed state on mount; only reveal the badge for users
  // who haven't seen this coach mark yet.
  useEffect(() => {
    setDismissed(loadDismissed(id));
    if (!loadDismissed(id) && !defer) {
      const t = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [id, defer]);

  // Click-outside / Esc dismiss the popover (without permanently dismissing).
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (dismissed) return null;

  function handleDismiss() {
    persistDismissed(id);
    setOpen(false);
    setDismissed(true);
  }

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "middle",
        ...style,
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 18,
          height: 18,
          marginLeft: 6,
          padding: 0,
          borderRadius: "50%",
          border: "1px solid var(--vyne-accent, var(--vyne-purple))",
          background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
          color: "var(--vyne-accent, var(--vyne-purple))",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <HelpCircle size={11} />
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={title}
          style={{
            position: "absolute",
            zIndex: 80,
            width: 240,
            padding: 12,
            borderRadius: 10,
            background: "var(--content-bg)",
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
            ...placementStyle(placement),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <strong
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 700,
              }}
            >
              {title}
            </strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.45,
            }}
          >
            {children}
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Got it
              <ChevronRight size={11} />
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

function placementStyle(p: "top" | "bottom" | "left" | "right"): React.CSSProperties {
  switch (p) {
    case "top":
      return { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
    case "left":
      return { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
    case "right":
      return { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
    case "bottom":
    default:
      return { top: "calc(100% + 8px)", left: 0 };
  }
}
