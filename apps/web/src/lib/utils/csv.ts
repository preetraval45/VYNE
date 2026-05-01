/**
 * CSV Export & Import utilities for VYNE.
 *
 * - exportToCSV: serializes an array of objects to a downloadable .csv file
 * - parseCSV:   reads a File and returns typed rows + validation errors
 */

// ─── CSV Export ──────────────────────────────────────────────────

/**
 * Escapes a cell value for CSV output.
 * Wraps in double-quotes when the value contains commas, quotes, or newlines.
 */
function escapeCSVCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/**
 * Generates a CSV file from an array of objects and triggers a browser download.
 *
 * @param data     - Array of row objects
 * @param filename - Downloaded file name (should end with `.csv`)
 * @param columns  - Optional column definitions with custom headers.
 *                   When omitted every key from the first row is used.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[],
): void {
  if (data.length === 0) return;

  // Resolve columns
  const cols: { key: keyof T; header: string }[] =
    columns ??
    (Object.keys(data[0]) as Array<keyof T>).map((key) => ({
      key,
      header: String(key),
    }));

  // Header row
  const headerRow = cols.map((c) => escapeCSVCell(c.header)).join(",");

  // Data rows
  const rows = data.map((row) =>
    cols.map((c) => escapeCSVCell(row[c.key])).join(","),
  );

  // BOM + content (BOM lets Excel detect UTF-8 correctly)
  const BOM = "\uFEFF";
  const csvContent = BOM + [headerRow, ...rows].join("\r\n");

  // Create blob & trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Audit-grade CSV export ──────────────────────────────────────
//
// Compliance reviewers (SOC2, HIPAA, ISO 27001) want to know who pulled
// what data, when, and with which filters. This wrapper prepends a CSV
// manifest comment block + an integrity hash over the data rows, then
// hands off to exportToCSV.
//
// Spreadsheets render the manifest as comment-prefixed cells in column A
// (Excel and Google Sheets show them but ignore them for sums). Auditors
// can verify integrity by re-hashing the data rows and comparing.

export interface AuditExportContext {
  /** What's being exported (e.g. "deals", "invoices"). */
  noun: string;
  /** Active filters at the moment of export. Free-form key/value pairs. */
  filters?: Record<string, unknown>;
  /** Currently authenticated user (email or id) if available. */
  user?: string | null;
  /** ISO timestamp; defaults to now. */
  generatedAt?: string;
  /** Stable saved-view name if the user is exporting from one. */
  viewName?: string | null;
}

/** Lightweight non-cryptographic checksum so integrity is visible to a reader.
 *  We use FNV-1a 32-bit — fits in a CSV cell, fast, and good enough to detect
 *  accidental tampering. For cryptographic guarantees the server should sign
 *  exports out-of-band; this is the audit trail, not the security boundary. */
function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function exportToCSVAudit<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  context: AuditExportContext,
  columns?: { key: keyof T; header: string }[],
): void {
  if (data.length === 0) return;

  const cols: { key: keyof T; header: string }[] =
    columns ??
    (Object.keys(data[0]) as Array<keyof T>).map((key) => ({
      key,
      header: String(key),
    }));

  const headerRow = cols.map((c) => escapeCSVCell(c.header)).join(",");
  const rows = data.map((row) =>
    cols.map((c) => escapeCSVCell(row[c.key])).join(","),
  );
  const dataBody = [headerRow, ...rows].join("\r\n");
  const checksum = fnv1a32(dataBody);
  const generatedAt = context.generatedAt ?? new Date().toISOString();

  // Manifest is a series of comment lines (`#`) — universally ignored by
  // CSV parsers but preserved by Excel / Sheets when opened.
  const manifestLines = [
    `# VYNE Audit Export`,
    `# noun=${context.noun}`,
    `# generatedAt=${generatedAt}`,
    `# user=${context.user ?? "unknown"}`,
    `# rowCount=${data.length}`,
    context.viewName ? `# view=${context.viewName}` : null,
    context.filters && Object.keys(context.filters).length > 0
      ? `# filters=${JSON.stringify(context.filters)}`
      : null,
    `# checksum=fnv1a32:${checksum}`,
    `# columns=${cols.map((c) => c.header).join("|")}`,
    `#`,
  ].filter(Boolean) as string[];

  const BOM = "﻿";
  const csvContent = BOM + manifestLines.join("\r\n") + "\r\n" + dataBody;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── CSV Import / Parse ──────────────────────────────────────────

/**
 * Parses a single CSV line respecting quoted fields.
 * Handles commas, double-quotes and newlines inside quoted values.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: escaped quote?
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current); // last field
  return fields;
}

/**
 * Splits CSV text into lines while respecting quoted fields that span
 * multiple lines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      // Skip \r\n as single newline
      if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim().length > 0) {
    lines.push(current);
  }

  return lines;
}

export interface ParseCSVResult<T> {
  data: T[];
  errors: string[];
  rowCount: number;
}

/**
 * Reads a CSV File and returns typed rows.
 *
 * @param file      - Browser File reference (e.g. from <input type="file">)
 * @param columnMap - Optional mapping from CSV header names to object keys.
 *                    e.g. `{ "Full Name": "name", "E-mail": "email" }`
 *                    Unmapped columns are included with their original header as the key.
 * @returns Parsed data array, any row-level errors, and the total row count.
 */
export function parseCSV<T>(
  file: File,
  columnMap?: Record<string, keyof T>,
): Promise<ParseCSVResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = (event.target?.result as string) ?? "";

      // Strip BOM if present
      const cleaned = text.codePointAt(0) === 0xfeff ? text.slice(1) : text;

      const lines = splitCSVLines(cleaned);

      if (lines.length === 0) {
        resolve({
          data: [],
          errors: ["File is empty or contains no valid rows."],
          rowCount: 0,
        });
        return;
      }

      // First line = headers
      const rawHeaders = parseCSVLine(lines[0]).map((h) => h.trim());
      const errors: string[] = [];

      // Validate required columns from columnMap
      if (columnMap) {
        const csvHeaderSet = new Set(rawHeaders);
        for (const csvHeader of Object.keys(columnMap)) {
          if (!csvHeaderSet.has(csvHeader)) {
            errors.push(`Missing required column: "${csvHeader}"`);
          }
        }
      }

      // Map headers to output keys
      const mappedHeaders: Array<string> = rawHeaders.map((h) => {
        if (columnMap && h in columnMap) {
          return String(columnMap[h]);
        }
        return h;
      });

      // Parse data rows
      const data: T[] = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);

        if (fields.length !== mappedHeaders.length) {
          errors.push(
            `Row ${i}: expected ${mappedHeaders.length} columns, got ${fields.length}`,
          );
          continue;
        }

        const row: Record<string, string> = {};
        for (let j = 0; j < mappedHeaders.length; j++) {
          row[mappedHeaders[j]] = fields[j];
        }
        data.push(row as unknown as T);
      }

      resolve({ data, errors, rowCount: data.length });
    };

    reader.onerror = () => {
      resolve({ data: [], errors: ["Failed to read file."], rowCount: 0 });
    };

    reader.readAsText(file);
  });
}
