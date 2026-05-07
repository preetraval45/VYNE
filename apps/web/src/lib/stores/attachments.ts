"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Universal file attachment metadata + virus-scan tracking (20.8).
 *
 *   const att = registerAttachment({
 *     entity: "deal", entityId: "DEAL-42",
 *     name: "proposal-final.pdf", url: presignedUrl,
 *     mime: "application/pdf", size: 482_000, uploadedBy: "sarah",
 *   });
 *
 *   updateScanStatus(att.id, "clean");   // server worker callback
 *
 * The actual byte storage lives in S3 / R2 / wherever — this store
 * tracks the metadata + scan state so detail panels can render a
 * preview list without re-fetching every file's HEAD on render.
 *
 * scanStatus drives the UI badge:
 *   - "scanning" → spinner, file is unavailable for inline preview
 *   - "clean"    → preview enabled
 *   - "blocked"  → red shield, download blocked
 */

export type ScanStatus = "scanning" | "clean" | "blocked";

export interface Attachment {
  id: string;
  entity: string;
  entityId: string;
  /** User-facing filename. */
  name: string;
  /** Absolute / presigned URL. */
  url: string;
  /** MIME type — drives the preview pane's renderer. */
  mime: string;
  /** Bytes. */
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  scanStatus: ScanStatus;
  scanReason?: string;
  /** Optional thumbnail URL, generated server-side. */
  thumbnail?: string;
}

interface AttachmentsStore {
  attachments: Attachment[];
  register: (
    payload: Omit<Attachment, "id" | "uploadedAt" | "scanStatus"> & {
      scanStatus?: ScanStatus;
    },
  ) => Attachment;
  updateScanStatus: (
    id: string,
    status: ScanStatus,
    reason?: string,
  ) => void;
  remove: (id: string) => void;
  /** Every attachment for a record. */
  forEntity: (entity: string, entityId: string) => Attachment[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useAttachments = create<AttachmentsStore>()(
  persist(
    (set, get) => ({
      attachments: [],
      register: (payload) => {
        const row: Attachment = {
          id: newId(),
          uploadedAt: new Date().toISOString(),
          scanStatus: payload.scanStatus ?? "scanning",
          ...payload,
        };
        set((s) => ({ attachments: [row, ...s.attachments] }));
        return row;
      },
      updateScanStatus: (id, scanStatus, scanReason) =>
        set((s) => ({
          attachments: s.attachments.map((a) =>
            a.id === id ? { ...a, scanStatus, scanReason } : a,
          ),
        })),
      remove: (id) =>
        set((s) => ({
          attachments: s.attachments.filter((a) => a.id !== id),
        })),
      forEntity: (entity, entityId) =>
        get().attachments.filter(
          (a) => a.entity === entity && a.entityId === entityId,
        ),
    }),
    { name: "vyne-attachments", version: 1 },
  ),
);

/** Pretty MIME → renderer hint used by inline previews. */
export function previewKind(mime: string): "image" | "pdf" | "video" | "audio" | "code" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.startsWith("text/") ||
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("xml")
  )
    return "code";
  return "other";
}
