"use client";

/**
 * ExportButton -- reusable CSV export trigger styled for VYNE.
 *
 * Usage:
 *   <ExportButton
 *     data={rows}
 *     filename="inventory-export"
 *     columns={[{ key: 'name', header: 'Product Name' }, ...]}
 *   />
 */

import React from "react";
import { exportToCSV } from "@/lib/utils/csv";

type ExportButtonProps<T extends Record<string, unknown>> = Readonly<{
  /** Array of objects to export */
  data: T[];
  /** File name for the downloaded CSV (`.csv` appended automatically) */
  filename: string;
  /** Optional column definitions with display headers */
  columns?: { key: keyof T; header: string }[];
  /** Button label. Default: "Export CSV" */
  label?: string;
}>;

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  label = "Export CSV",
}: ExportButtonProps<T>) {
  function handleExport() {
    exportToCSV(data, filename, columns);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={data.length === 0}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "transparent",
        color: data.length === 0 ? "#A0A0B8" : "#6B6B8A",
        cursor: data.length === 0 ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 500,
        transition: "all 0.15s",
        opacity: data.length === 0 ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (data.length > 0) {
          (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(0,0,0,0.18)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)";
      }}
    >
      {/* Download icon (SVG inlined to avoid extra dependency) */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
