"use client";

import { useEffect, useState } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  src: string | null;
  onClose: () => void;
}

/**
 * Full-screen image viewer. Open by passing a src; close via the X
 * button, Escape key, or backdrop click. Supports +/- zoom and
 * click-and-drag panning when zoomed.
 */
export function ImageLightbox({ src, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    if (!src) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z * 1.25));
      else if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(1, z / 1.25));
      else if (e.key === "0") {
        setZoom(1);
        setDragOffset({ x: 0, y: 0 });
      }
    }
    document.addEventListener("keydown", onKey);
    // Lock both body + html overflow + position on iOS Safari to stop
    // rubber-band scroll bleeding through the backdrop.
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.86)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseMove={(e) => {
        if (dragging) {
          setDragOffset((p) => ({
            x: p.x + (e.clientX - dragging.x),
            y: p.y + (e.clientY - dragging.y),
          }));
          setDragging({ x: e.clientX, y: e.clientY });
        }
      }}
      onMouseUp={() => setDragging(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 6,
          zIndex: 101,
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z / 1.25))}
          aria-label="Zoom out"
          style={iconBtn}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
          aria-label="Zoom in"
          style={iconBtn}
        >
          <ZoomIn size={16} />
        </button>
        <a
          href={src}
          download={`vyne-image-${Date.now()}.png`}
          aria-label="Download image"
          style={{ ...iconBtn, textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={16} />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={iconBtn}
        >
          <X size={16} />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Preview"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (zoom > 1) setDragging({ x: e.clientX, y: e.clientY });
        }}
        draggable={false}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom})`,
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
          transition: dragging ? "none" : "transform 0.18s var(--ease-out-quart)",
          userSelect: "none",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 16,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.6)",
          letterSpacing: "0.04em",
        }}
      >
        {Math.round(zoom * 100)}% · Esc to close · 0 to reset
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(10px)",
};
