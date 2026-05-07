"use client";

import { useMemo } from "react";

/**
 * AuditDiffView (23.9) — renders a side-by-side before / after diff
 * for any audit-log entry. Drops into the existing AuditSettings
 * detail row + new SOC 2 audit export.
 *
 *   <AuditDiffView before={prevDeal} after={nextDeal} />
 *
 * Diff strategy:
 *   - Walk every key in the union of both objects.
 *   - For primitives, render `from → to` rows when the value
 *     changed; skip identical pairs by default.
 *   - For nested objects / arrays, JSON-stringify both sides and
 *     surface only the changed paths.
 *
 * Pure SVG / DOM, no external diff lib. Optimised for ≤ 60 fields
 * per record, which covers every entity in VYNE today.
 */

export interface AuditDiffViewProps {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  /** Show fields whose value didn't change. Default false. */
  showUnchanged?: boolean;
  /** Hide these keys (passwords / hashes). */
  redactKeys?: string[];
}

interface DiffRow {
  key: string;
  before: string;
  after: string;
  changed: boolean;
  added: boolean;
  removed: boolean;
}

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.length > 200 ? v.slice(0, 200) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function buildRows(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  redactKeys: string[],
): DiffRow[] {
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const out: DiffRow[] = [];
  for (const key of Array.from(keys).sort()) {
    if (redactKeys.includes(key)) continue;
    const b = before?.[key];
    const a = after?.[key];
    const beforeStr = fmtValue(b);
    const afterStr = fmtValue(a);
    out.push({
      key,
      before: beforeStr,
      after: afterStr,
      changed: beforeStr !== afterStr,
      added: b == null && a != null,
      removed: a == null && b != null,
    });
  }
  return out;
}

export function AuditDiffView({
  before,
  after,
  showUnchanged = false,
  redactKeys = ["passwordHash", "secret", "apiKey", "token"],
}: AuditDiffViewProps) {
  const rows = useMemo(
    () => buildRows(before ?? {}, after ?? {}, redactKeys),
    [before, after, redactKeys],
  );
  const visible = showUnchanged ? rows : rows.filter((r) => r.changed);
  const summary = {
    added: rows.filter((r) => r.added).length,
    removed: rows.filter((r) => r.removed).length,
    changed: rows.filter((r) => r.changed && !r.added && !r.removed).length,
  };

  return (
    <section
      role="region"
      aria-label="Audit diff"
      style={{
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>
          Diff
        </strong>
        <span
          style={{
            padding: "1px 7px",
            borderRadius: 999,
            background: "rgba(34, 197, 94, 0.10)",
            color: "#16A34A",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          + {summary.added}
        </span>
        <span
          style={{
            padding: "1px 7px",
            borderRadius: 999,
            background: "rgba(245, 158, 11, 0.10)",
            color: "#D97706",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          ~ {summary.changed}
        </span>
        <span
          style={{
            padding: "1px 7px",
            borderRadius: 999,
            background: "rgba(239, 68, 68, 0.10)",
            color: "#DC2626",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          − {summary.removed}
        </span>
        {redactKeys.length > 0 && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginLeft: "auto",
            }}
          >
            {redactKeys.length} redacted key{redactKeys.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {visible.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: "30px 16px",
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          No changes between snapshots.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11.5,
          }}
        >
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              <th style={thStyle}>Field</th>
              <th style={thStyle}>Before</th>
              <th style={thStyle}>After</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.key}>
                <td style={tdKeyStyle}>{row.key}</td>
                <td
                  style={{
                    ...tdValStyle,
                    color: row.removed
                      ? "#DC2626"
                      : row.added
                        ? "var(--text-tertiary)"
                        : "var(--text-primary)",
                    background: row.removed
                      ? "rgba(239, 68, 68, 0.06)"
                      : "transparent",
                    textDecoration: row.removed ? "line-through" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {row.before}
                </td>
                <td
                  style={{
                    ...tdValStyle,
                    color: row.added
                      ? "#16A34A"
                      : row.removed
                        ? "var(--text-tertiary)"
                        : "var(--text-primary)",
                    background:
                      row.changed && !row.removed
                        ? "rgba(34, 197, 94, 0.06)"
                        : "transparent",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {row.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const thStyle: React.CSSProperties = {
  padding: "6px 12px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  borderBottom: "1px solid var(--content-border)",
  fontFamily: "var(--font-app, inherit)",
};

const tdKeyStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid var(--content-border)",
  fontWeight: 600,
  color: "var(--text-secondary)",
  fontSize: 11,
  width: 180,
};

const tdValStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid var(--content-border)",
  fontSize: 11.5,
};
