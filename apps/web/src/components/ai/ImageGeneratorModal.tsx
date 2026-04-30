"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Square, RectangleHorizontal, RectangleVertical } from "lucide-react";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, aspectRatio: AspectRatio) => void;
  /** Pre-fill the prompt (used by Re-roll) */
  initialPrompt?: string;
  initialAspectRatio?: AspectRatio;
}

const RATIOS: Array<{
  id: AspectRatio;
  label: string;
  hint: string;
  icon: typeof Square;
  w: number;
  h: number;
}> = [
  { id: "1:1", label: "Square", hint: "Profile / icon", icon: Square, w: 32, h: 32 },
  { id: "16:9", label: "Wide", hint: "Hero / banner", icon: RectangleHorizontal, w: 48, h: 27 },
  { id: "9:16", label: "Tall", hint: "Phone / story", icon: RectangleVertical, w: 27, h: 48 },
  { id: "4:3", label: "Landscape", hint: "Classic", icon: RectangleHorizontal, w: 40, h: 30 },
  { id: "3:4", label: "Portrait", hint: "Classic", icon: RectangleVertical, w: 30, h: 40 },
];

export function ImageGeneratorModal({
  open,
  onClose,
  onSubmit,
  initialPrompt = "",
  initialAspectRatio = "1:1",
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [ratio, setRatio] = useState<AspectRatio>(initialAspectRatio);

  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setRatio(initialAspectRatio);
    }
  }, [open, initialPrompt, initialAspectRatio]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go() {
    const p = prompt.trim();
    if (!p) return;
    onSubmit(p, ratio);
    onClose();
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 95,
          animation: "fadeIn 0.18s ease-out both",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate image"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(540px, 92vw)",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          boxShadow: "var(--elev-4)",
          zIndex: 96,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background:
                "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} />
          </div>
          <h2
            style={{
              flex: 1,
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Generate image
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </header>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              go();
            }
          }}
          placeholder="Describe the image you want — subject, style, mood, composition…"
          aria-label="Image prompt"
          rows={4}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-primary)",
            fontSize: 13.5,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            minHeight: 88,
          }}
          autoFocus
        />

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-tertiary)",
              marginBottom: 6,
            }}
          >
            Aspect ratio
          </div>
          <div
            role="radiogroup"
            aria-label="Aspect ratio"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {RATIOS.map((r) => {
              const active = r.id === ratio;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRatio(r.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${active ? "var(--vyne-teal)" : "var(--content-border)"}`,
                    background: active
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                      : "var(--content-bg)",
                    cursor: "pointer",
                    minWidth: 72,
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: r.w,
                      height: r.h,
                      borderRadius: 4,
                      border: `1.5px solid ${active ? "var(--vyne-teal)" : "var(--content-border)"}`,
                      background: active
                        ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)"
                        : "var(--content-secondary)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: active
                        ? "var(--vyne-teal)"
                        : "var(--text-primary)",
                    }}
                  >
                    {r.id}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {r.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={go}
            disabled={!prompt.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background:
                "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
              color: "#fff",
              cursor: prompt.trim() ? "pointer" : "not-allowed",
              opacity: prompt.trim() ? 1 : 0.55,
              fontSize: 12.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={12} />
            Generate
          </button>
        </footer>
      </div>
    </>
  );
}
