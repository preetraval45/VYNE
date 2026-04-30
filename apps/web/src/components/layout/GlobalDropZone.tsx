"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

/**
 * Full-window drag-and-drop overlay. Shows a translucent panel + dashed
 * outline whenever the user drags files anywhere over the app shell.
 * On drop we forward the FileList to a custom event `vyne:files-dropped`
 * that any module can subscribe to. Chat composer, docs editor, and
 * file uploaders should listen and pick up the files.
 */
export function GlobalDropZone() {
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let depth = 0;
    function onEnter(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      depth += 1;
      setOver(true);
    }
    function onLeave() {
      depth -= 1;
      if (depth <= 0) {
        depth = 0;
        setOver(false);
      }
    }
    function onOver(e: DragEvent) {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    }
    function onDrop(e: DragEvent) {
      depth = 0;
      setOver(false);
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      window.dispatchEvent(
        new CustomEvent("vyne:files-dropped", { detail: { files } }),
      );
    }
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  if (!over) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 12,
        zIndex: 110,
        pointerEvents: "none",
        border: "2px dashed var(--vyne-purple, #5B5BD6)",
        borderRadius: 16,
        background: "rgba(var(--vyne-accent-rgb, 91, 91, 214), 0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "var(--vyne-purple, #5B5BD6)",
        gap: 10,
      }}
    >
      <Upload size={32} />
      <span style={{ fontSize: 16, fontWeight: 600 }}>Drop to upload</span>
    </div>
  );
}
