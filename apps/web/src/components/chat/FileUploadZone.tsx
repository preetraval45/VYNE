"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";

interface FileUploadZoneProps {
  readonly onFilesDropped: (files: File[]) => void;
  readonly children: React.ReactNode;
}

export function FileUploadZone({
  onFilesDropped,
  children,
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      dragCounter.current = 0;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesDropped(droppedFiles);
      }
    },
    [onFilesDropped],
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: "relative", display: "contents" }}
    >
      {children}

      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(108, 71, 255, 0.06)",
              backdropFilter: "blur(2px)",
              border: "2px dashed #6C47FF",
              borderRadius: 12,
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 8 }}
              transition={{ duration: 0.15 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(108, 71, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={24} style={{ color: "#6C47FF" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#6C47FF",
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  Drop files here
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#8B7AFF",
                    margin: 0,
                  }}
                >
                  Images, documents, and text files up to 10 MB
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
