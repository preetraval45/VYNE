"use client";

/**
 * ImportCSVModal -- drag-and-drop CSV import modal for VYNE.
 *
 * Features:
 * - Drag-and-drop zone with file input fallback
 * - Preview first 5 rows after parsing
 * - Column mapping step
 * - Progress indicator during import
 * - Error display for invalid rows
 *
 * Usage:
 *   <ImportCSVModal
 *     open={showImport}
 *     onClose={() => setShowImport(false)}
 *     moduleName="Inventory"
 *     expectedColumns={[
 *       { key: 'name', label: 'Product Name', required: true },
 *       { key: 'sku', label: 'SKU' },
 *     ]}
 *     onImport={(rows) => handleImport(rows)}
 *   />
 */

import React, { useState, useRef, useCallback } from "react";
import { parseCSV, type ParseCSVResult } from "@/lib/utils/csv";

// ─── Types ──────────────────────────────────────────────────────

interface ExpectedColumn {
  key: string;
  label: string;
  required?: boolean;
}

type ImportCSVModalProps = Readonly<{
  /** Whether the modal is visible */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Module name displayed in the header (e.g. "Inventory", "Deals") */
  moduleName: string;
  /** Columns the import target expects */
  expectedColumns: ExpectedColumn[];
  /** Callback with successfully mapped rows */
  onImport: (rows: Record<string, string>[]) => void;
}>;

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

// ─── Component ──────────────────────────────────────────────────

export function ImportCSVModal({
  open,
  onClose,
  moduleName,
  expectedColumns,
  onImport,
}: ImportCSVModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [rawResult, setRawResult] = useState<ParseCSVResult<
    Record<string, string>
  > | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  ); // expectedKey -> csvHeader
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // ─── Reset ──────────────────────────────────────────────────

  function reset() {
    setStep("upload");
    setDragOver(false);
    setRawResult(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setMappingErrors([]);
    setImportProgress(0);
    setImportErrors([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ─── File handling ──────────────────────────────────────────

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setImportErrors(["Please upload a .csv file."]);
        return;
      }

      const result = await parseCSV<Record<string, string>>(file);
      setRawResult(result);

      // Extract headers from first row keys
      if (result.data.length > 0) {
        const headers = Object.keys(result.data[0]);
        setCsvHeaders(headers);

        // Auto-map exact matches
        const autoMap: Record<string, string> = {};
        for (const col of expectedColumns) {
          const match = headers.find(
            (h) =>
              h.toLowerCase() === col.key.toLowerCase() ||
              h.toLowerCase() === col.label.toLowerCase(),
          );
          if (match) {
            autoMap[col.key] = match;
          }
        }
        setColumnMapping(autoMap);
        setStep("mapping");
      } else {
        setImportErrors(
          result.errors.length > 0
            ? result.errors
            : ["No data rows found in file."],
        );
      }
    },
    [expectedColumns],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  // ─── Mapping validation ─────────────────────────────────────

  function validateMapping(): boolean {
    const errors: string[] = [];
    for (const col of expectedColumns) {
      if (col.required && !columnMapping[col.key]) {
        errors.push(`"${col.label}" is required but not mapped.`);
      }
    }
    setMappingErrors(errors);
    return errors.length === 0;
  }

  function handleProceedToPreview() {
    if (validateMapping()) {
      setStep("preview");
    }
  }

  // ─── Build mapped rows ─────────────────────────────────────

  function getMappedRows(): Record<string, string>[] {
    if (!rawResult) return [];

    return rawResult.data.map((row) => {
      const mapped: Record<string, string> = {};
      for (const col of expectedColumns) {
        const csvHeader = columnMapping[col.key];
        mapped[col.key] = csvHeader ? (row[csvHeader] ?? "") : "";
      }
      return mapped;
    });
  }

  // ─── Import ─────────────────────────────────────────────────

  async function handleImport() {
    setStep("importing");
    setImportProgress(0);

    const rows = getMappedRows();
    const total = rows.length;

    // Simulate progress ticks
    for (let i = 0; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 50));
      setImportProgress(Math.min(Math.round((i / 10) * 90), 90));
    }

    try {
      onImport(rows);
      setImportProgress(100);
      setStep("done");
    } catch {
      setImportErrors(["Import failed. Please try again."]);
      setStep("preview");
    }

    // Collect parse errors + attach to state
    if (rawResult && rawResult.errors.length > 0) {
      setImportErrors(rawResult.errors);
    }
  }

  // ─── Render guards ──────────────────────────────────────────

  if (!open) return null;

  const previewRows = getMappedRows().slice(0, 5);

  // ─── Shared styles ─────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  };

  const panelStyle: React.CSSProperties = {
    background: "var(--content-bg)",
    borderRadius: 12,
    width: 580,
    maxHeight: "90vh",
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    overflowY: "auto",
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    background: "#06B6D4",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  };

  const ghostBtnStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid var(--input-border)",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    color: "var(--text-secondary)",
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Import {moduleName}
          </span>
          <button
            onClick={handleClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["upload", "mapping", "preview"] as Step[]).map((s, idx) => {
            const labels = ["Upload", "Map Columns", "Preview & Import"];
            const stepOrder = [
              "upload",
              "mapping",
              "preview",
              "importing",
              "done",
            ];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s);
            const isActive = currentIdx >= thisIdx;

            return (
              <div
                key={s}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: isActive ? "#06B6D4" : "#E0E0EC",
                    color: isActive ? "#fff" : "#A0A0B8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {idx + 1}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: isActive ? "#1A1A2E" : "#A0A0B8",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {labels[idx]}
                </span>
                {idx < 2 && (
                  <div
                    style={{
                      width: 20,
                      height: 1,
                      background: "#E0E0EC",
                      margin: "0 4px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step: Upload ─────────────────────────────────────── */}
        {step === "upload" && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--vyne-purple)" : "var(--input-border)"}`,
                borderRadius: 10,
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(6, 182, 212,0.04)" : "var(--content-secondary)",
                transition: "all 0.15s",
              }}
            >
              {/* Upload icon */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                style={{ margin: "0 auto 12px", display: "block" }}
                aria-hidden="true"
              >
                <path
                  d="M4 22v4a2 2 0 002 2h20a2 2 0 002-2v-4M16 4v18M10 10l6-6 6 6"
                  stroke={dragOver ? "#06B6D4" : "#A0A0B8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                Drag & drop your CSV file here
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                or click to browse
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </div>

            {/* File-level errors */}
            {importErrors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {importErrors.map((err, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 12, color: "#EF4444", padding: "4px 0" }}
                  >
                    {err}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step: Column Mapping ─────────────────────────────── */}
        {step === "mapping" && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
              Map your CSV columns to the expected fields. Required fields are
              marked with *.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {expectedColumns.map((col) => (
                <div
                  key={col.key}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 160,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {col.label}
                    {col.required && (
                      <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>
                    )}
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ flexShrink: 0, color: "var(--text-tertiary)" }}
                    aria-hidden="true"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <select aria-label="Select option"
                    value={columnMapping[col.key] ?? ""}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [col.key]: e.target.value,
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      border: "1px solid var(--input-border)",
                      borderRadius: 8,
                      background: "var(--content-secondary)",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Select CSV Column --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Mapping errors */}
            {mappingErrors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {mappingErrors.map((err, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 12, color: "#EF4444", padding: "2px 0" }}
                  >
                    {err}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  reset();
                  setStep("upload");
                }}
                style={ghostBtnStyle}
              >
                Back
              </button>
              <button onClick={handleProceedToPreview} style={primaryBtnStyle}>
                Next
              </button>
            </div>
          </>
        )}

        {/* ── Step: Preview ────────────────────────────────────── */}
        {step === "preview" && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
              Preview of first {Math.min(previewRows.length, 5)} rows (
              {rawResult?.rowCount ?? 0} total)
            </div>

            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: "var(--table-header-bg)" }}>
                    {expectedColumns
                      .filter((c) => columnMapping[c.key])
                      .map((col) => (
                        <th
                          key={col.key}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{ borderTop: "1px solid var(--content-border)" }}
                    >
                      {expectedColumns
                        .filter((c) => columnMapping[c.key])
                        .map((col) => (
                          <td
                            key={col.key}
                            style={{
                              padding: "8px 12px",
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {row[col.key] || "--"}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Parse errors */}
            {rawResult && rawResult.errors.length > 0 && (
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  background: "var(--badge-danger-bg)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--badge-danger-text)",
                    marginBottom: 6,
                  }}
                >
                  Warnings ({rawResult.errors.length})
                </div>
                {rawResult.errors.slice(0, 5).map((err, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 11, color: "#B91C1C", padding: "2px 0" }}
                  >
                    {err}
                  </div>
                ))}
                {rawResult.errors.length > 5 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#B91C1C",
                      fontStyle: "italic",
                    }}
                  >
                    ...and {rawResult.errors.length - 5} more
                  </div>
                )}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button onClick={() => setStep("mapping")} style={ghostBtnStyle}>
                Back
              </button>
              <button onClick={handleImport} style={primaryBtnStyle}>
                Import {rawResult?.rowCount ?? 0} Rows
              </button>
            </div>
          </>
        )}

        {/* ── Step: Importing (progress) ───────────────────────── */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 16,
              }}
            >
              Importing {rawResult?.rowCount ?? 0} rows...
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "#E0E0EC",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${importProgress}%`,
                  height: "100%",
                  background: "#06B6D4",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
              {importProgress}%
            </div>
          </div>
        )}

        {/* ── Step: Done ───────────────────────────────────────── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            {/* Checkmark */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Import Complete
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
              {rawResult?.rowCount ?? 0} rows imported into {moduleName}
            </div>

            {/* Import errors (row-level) */}
            {importErrors.length > 0 && (
              <div
                style={{
                  textAlign: "left",
                  marginBottom: 14,
                  padding: 12,
                  background: "var(--badge-warning-bg)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--badge-warning-text)",
                    marginBottom: 4,
                  }}
                >
                  {importErrors.length} row(s) had issues
                </div>
                {importErrors.slice(0, 5).map((err, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 11, color: "var(--badge-warning-text)", padding: "2px 0" }}
                  >
                    {err}
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleClose} style={primaryBtnStyle}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
