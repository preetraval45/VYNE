"use client";

import { useState, useCallback, useRef } from "react";
import { messagingApi } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────────
export interface UploadedFile {
  readonly id: string;
  readonly url: string;
  readonly key: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  /** For image files, a data-URL preview generated client-side. */
  readonly previewUrl?: string;
}

export interface UploadProgress {
  readonly fileId: string;
  readonly fileName: string;
  readonly progress: number; // 0-100
  readonly status: "uploading" | "done" | "error";
  readonly error?: string;
}

// ─── Constants ───────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  text: ["text/plain"],
};

const ALL_ACCEPTED = Object.values(ACCEPTED_TYPES).flat();

export const ACCEPTED_EXTENSIONS =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

// ─── Helpers ─────────────────────────────────────────────────────
function isAcceptedType(mime: string): boolean {
  return ALL_ACCEPTED.includes(mime);
}

function isImageType(mime: string): boolean {
  return ACCEPTED_TYPES.image.includes(mime);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Hook ────────────────────────────────────────────────────────
export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /** Validate a single file before upload. Returns an error string or null. */
  const validate = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }
    if (!isAcceptedType(file.type)) {
      return `${file.name} has an unsupported file type (${file.type || "unknown"})`;
    }
    return null;
  }, []);

  /** Upload a single file and return the result. */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      const error = validate(file);
      if (error) {
        const fileId = generateId();
        setUploads((prev) => [
          ...prev,
          { fileId, fileName: file.name, progress: 0, status: "error", error },
        ]);
        return null;
      }

      const fileId = generateId();
      const controller = new AbortController();
      abortControllers.current.set(fileId, controller);

      setUploads((prev) => [
        ...prev,
        { fileId, fileName: file.name, progress: 0, status: "uploading" },
      ]);

      try {
        // Generate preview for images
        let previewUrl: string | undefined;
        if (isImageType(file.type)) {
          previewUrl = await readAsDataUrl(file);
        }

        // Simulate progress ticks while "uploading"
        const progressInterval = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileId === fileId && u.status === "uploading"
                ? { ...u, progress: Math.min(u.progress + 15, 90) }
                : u,
            ),
          );
        }, 150);

        let url: string;
        let key: string;

        try {
          // Attempt real presigned-URL upload
          const presigned = await messagingApi.getUploadUrl(
            file.name,
            file.type,
          );
          const { uploadUrl, key: s3Key } = presigned.data;

          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
            signal: controller.signal,
          });

          url = uploadUrl.split("?")[0]; // strip query params to get the object URL
          key = s3Key;
        } catch {
          // Demo / offline mode — use local object URLs or data URLs
          if (previewUrl) {
            url = previewUrl;
          } else {
            url = URL.createObjectURL(file);
          }
          key = `demo/${fileId}/${file.name}`;
        }

        clearInterval(progressInterval);

        const uploaded: UploadedFile = {
          id: fileId,
          url,
          key,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
        };

        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId ? { ...u, progress: 100, status: "done" } : u,
          ),
        );
        setFiles((prev) => [...prev, uploaded]);
        abortControllers.current.delete(fileId);
        return uploaded;
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId
              ? { ...u, status: "error", error: "Upload failed" }
              : u,
          ),
        );
        abortControllers.current.delete(fileId);
        return null;
      }
    },
    [validate],
  );

  /** Upload multiple files concurrently. */
  const uploadFiles = useCallback(
    async (fileList: File[]): Promise<UploadedFile[]> => {
      const results = await Promise.all(fileList.map(uploadFile));
      return results.filter((r): r is UploadedFile => r !== null);
    },
    [uploadFile],
  );

  /** Remove an uploaded file from the list. */
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setUploads((prev) => prev.filter((u) => u.fileId !== fileId));
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }
  }, []);

  /** Clear all files and upload state. */
  const clearFiles = useCallback(() => {
    abortControllers.current.forEach((c) => c.abort());
    abortControllers.current.clear();
    setFiles([]);
    setUploads([]);
  }, []);

  return {
    files,
    uploads,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    validate,
    isUploading: uploads.some((u) => u.status === "uploading"),
  };
}
