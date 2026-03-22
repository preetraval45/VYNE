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
    return `"${str.replace(/"/g, '""')}"`;
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
      const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

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
