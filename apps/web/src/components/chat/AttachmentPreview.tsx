"use client";

import {
  X,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Image as ImageIcon,
} from "lucide-react";
import type { UploadedFile, UploadProgress } from "@/hooks/useFileUpload";

interface AttachmentPreviewProps {
  readonly files: readonly UploadedFile[];
  readonly uploads: readonly UploadProgress[];
  readonly onRemove: (fileId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/"))
    return <ImageIcon size={16} style={{ color: "#06B6D4" }} />;
  if (type === "application/pdf")
    return <FileText size={16} style={{ color: "#E74C3C" }} />;
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv"
  )
    return <FileSpreadsheet size={16} style={{ color: "#27AE60" }} />;
  if (type.includes("word") || type === "application/msword")
    return <FileText size={16} style={{ color: "#2980B9" }} />;
  return <FileIcon size={16} style={{ color: "var(--text-tertiary)" }} />;
}

function isImage(type: string): boolean {
  return type.startsWith("image/");
}

export function AttachmentPreview({
  files,
  uploads,
  onRemove,
}: AttachmentPreviewProps) {
  if (
    files.length === 0 &&
    uploads.filter((u) => u.status === "uploading").length === 0
  ) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        overflowX: "auto",
        flexWrap: "nowrap",
        borderTop: "1px solid #F0F0F8",
      }}
    >
      {/* Show uploading items that are not yet in files */}
      {uploads
        .filter((u) => u.status === "uploading")
        .map((u) => (
          <div
            key={u.fileId}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--content-secondary)",
              border: "1px solid #E8E8F0",
              minWidth: 120,
              maxWidth: 180,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "rgba(6, 182, 212,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid #06B6D4",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.fileName}
              </p>
              <div
                style={{
                  marginTop: 4,
                  height: 3,
                  borderRadius: 2,
                  background: "#E8E8F0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${u.progress}%`,
                    background: "#06B6D4",
                    borderRadius: 2,
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>
            <button aria-label="Close"
              onClick={() => onRemove(u.fileId)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--content-bg)",
                border: "1px solid #E8E8F0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <X size={10} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        ))}

      {/* Show completed files */}
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: isImage(file.type) ? 4 : "8px 12px",
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid #E8E8F0",
            minWidth: isImage(file.type) ? 68 : 120,
            maxWidth: isImage(file.type) ? 100 : 200,
            flexShrink: 0,
          }}
        >
          {isImage(file.type) && file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              style={{
                width: 60,
                height: 60,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
          ) : (
            <>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "rgba(6, 182, 212,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getFileIcon(file.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
                  {formatSize(file.size)}
                </p>
              </div>
            </>
          )}

          {/* Remove button */}
          <button aria-label="Close"
            onClick={() => onRemove(file.id)}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--content-bg)",
              border: "1px solid #E8E8F0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <X size={10} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      ))}

      {/* Error uploads */}
      {uploads
        .filter((u) => u.status === "error")
        .map((u) => (
          <div
            key={u.fileId}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--badge-danger-bg)",
              border: "1px solid #FECACA",
              minWidth: 120,
              maxWidth: 220,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "rgba(239,68,68,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={14} style={{ color: "#EF4444" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--badge-danger-text)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.fileName}
              </p>
              <p style={{ fontSize: 10, color: "#DC2626", margin: 0 }}>
                {u.error}
              </p>
            </div>
            <button aria-label="Close"
              onClick={() => onRemove(u.fileId)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--content-bg)",
                border: "1px solid #FECACA",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <X size={10} style={{ color: "#EF4444" }} />
            </button>
          </div>
        ))}

      {/* Spinner animation keyframes injected via style tag */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
