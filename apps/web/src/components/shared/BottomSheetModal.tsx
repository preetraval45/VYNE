"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Desktop max width. Mobile always = 100vw. Default 480. */
  maxWidth?: number;
  /** When true the user can drag the sheet down to dismiss on mobile. */
  draggable?: boolean;
}

/**
 * Adaptive modal — on ≥769px renders as a centered card, on ≤768px
 * slides up from the bottom and supports drag-to-dismiss. Drop-in
 * replacement for ad-hoc modals across the app: ScheduleMeetingModal,
 * CreateChannelModal, ImageGeneratorModal, CreateAutomationModal, etc.
 *
 * Why not radix-ui dialog? We want zero new deps and full control of
 * the drag gesture / safe-area inset / dvh sizing.
 */
export function BottomSheetModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 480,
  draggable = true,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onTouchStart(e: React.TouchEvent) {
    if (!draggable || !isMobile) return;
    startYRef.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!draggable || !isMobile) return;
    const start = startYRef.current;
    if (start == null) return;
    const dy = (e.touches[0]?.clientY ?? start) - start;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (!draggable || !isMobile) return;
    if (dragY > 120) {
      setDragY(0);
      startYRef.current = null;
      onClose();
      return;
    }
    setDragY(0);
    startYRef.current = null;
  }

  const sheetTransform = isMobile ? `translateY(${dragY}px)` : "none";
  const sheetTransition = dragY === 0 ? "transform 220ms cubic-bezier(0.32,0.72,0,1)" : "none";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        background: "rgba(10, 24, 32, 0.45)",
        backdropFilter: "blur(2px)",
        animation: "vyne-sheet-fade-in 180ms ease-out",
      }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          width: isMobile ? "100%" : `min(${maxWidth}px, 92vw)`,
          maxHeight: isMobile ? "92dvh" : "min(85vh, 720px)",
          overflowY: "auto",
          borderRadius: isMobile ? "16px 16px 0 0" : 14,
          border: "1px solid var(--content-border)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          transform: sheetTransform,
          transition: sheetTransition,
          paddingBottom: isMobile ? "calc(16px + env(safe-area-inset-bottom))" : 16,
          animation: isMobile
            ? "vyne-sheet-up 280ms cubic-bezier(0.32,0.72,0,1)"
            : "vyne-sheet-pop 220ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {isMobile && (
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "8px 0 4px",
            }}
          >
            <span
              style={{
                width: 36,
                height: 4,
                borderRadius: 4,
                background: "var(--content-border)",
              }}
            />
          </div>
        )}
        {(title || true) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--content-border)",
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {title ?? ""}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
