"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Image as ImageIcon,
  ZoomIn,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
export interface MessageAttachment {
  readonly id: string;
  readonly url: string;
  readonly key: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
}

interface FileAttachmentProps {
  readonly attachments: readonly MessageAttachment[];
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string): boolean {
  return type.startsWith("image/");
}

function getDocIcon(type: string) {
  if (type === "application/pdf")
    return <FileText size={18} style={{ color: "#E74C3C" }} />;
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv"
  )
    return <FileSpreadsheet size={18} style={{ color: "#27AE60" }} />;
  if (type.includes("word") || type === "application/msword")
    return <FileText size={18} style={{ color: "#2980B9" }} />;
  if (type === "text/plain")
    return <FileText size={18} style={{ color: "var(--text-secondary)" }} />;
  return <FileIcon size={18} style={{ color: "#A0A0B8" }} />;
}

// ─── Lightbox sub-component ──────────────────────────────────────
function Lightbox({
  src,
  alt,
  onClose,
}: {
  readonly src: string;
  readonly alt: string;
  readonly onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        cursor: "zoom-out",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={20} style={{ color: "#fff" }} />
      </button>
      <motion.img
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.85 }}
        transition={{ duration: 0.2 }}
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          cursor: "default",
        }}
      />
    </motion.div>
  );
}

// ─── Image attachment ────────────────────────────────────────────
function ImageAttachment({
  attachment,
}: {
  readonly attachment: MessageAttachment;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setLightboxOpen(true)}
        style={{
          position: "relative",
          cursor: "zoom-in",
          borderRadius: 8,
          overflow: "hidden",
          maxWidth: 320,
          border: "1px solid #E8E8F0",
        }}
        onMouseEnter={(e) => {
          const overlay = e.currentTarget.querySelector(
            "[data-overlay]",
          ) as HTMLElement | null;
          if (overlay) overlay.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector(
            "[data-overlay]",
          ) as HTMLElement | null;
          if (overlay) overlay.style.opacity = "0";
        }}
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          style={{
            display: "block",
            maxWidth: 320,
            maxHeight: 240,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
        <div
          data-overlay=""
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.15s",
            borderRadius: 8,
          }}
        >
          <ZoomIn size={24} style={{ color: "#fff" }} />
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            src={attachment.url}
            alt={attachment.filename}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Document attachment ─────────────────────────────────────────
function DocAttachment({
  attachment,
}: {
  readonly attachment: MessageAttachment;
}) {
  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = attachment.url;
    a.download = attachment.filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [attachment]);

  return (
    <button
      onClick={handleDownload}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        background: "#F8F8FC",
        border: "1px solid #E8E8F0",
        cursor: "pointer",
        maxWidth: 300,
        textAlign: "left",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--content-border)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F8F8FC";
        (e.currentTarget as HTMLElement).style.borderColor = "#E8E8F0";
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "var(--content-bg)",
          border: "1px solid #E8E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {getDocIcon(attachment.contentType)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {attachment.filename}
        </p>
        <p style={{ fontSize: 11, color: "#A0A0B8", margin: 0, marginTop: 2 }}>
          {formatSize(attachment.size)}
        </p>
      </div>
      <Download size={14} style={{ color: "#A0A0B8", flexShrink: 0 }} />
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────
export function FileAttachment({ attachments }: FileAttachmentProps) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.contentType));
  const docs = attachments.filter((a) => !isImage(a.contentType));

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}
    >
      {/* Image grid */}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {images.map((img) => (
            <ImageAttachment key={img.id} attachment={img} />
          ))}
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {docs.map((doc) => (
            <DocAttachment key={doc.id} attachment={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
