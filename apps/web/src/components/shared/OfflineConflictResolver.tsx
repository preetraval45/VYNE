"use client";

import { useState } from "react";
import { GitMerge, AlertTriangle, X } from "lucide-react";
import { AuditDiffView } from "./AuditDiffView";

/**
 * OfflineConflictResolver (25.8) — when the offline queue replays a
 * mutation and the server returns a 409 because the record changed
 * server-side while the user was offline, the queue surfaces the
 * conflict here.
 *
 *   <OfflineConflictResolver
 *     conflicts={offlineQueue.conflicts}
 *     onResolve={(id, choice) => offlineQueue.resolve(id, choice)}
 *   />
 *
 * Each conflict shows a side-by-side diff (mine vs theirs) and three
 * resolution buttons:
 *   - Keep mine     → re-send local payload, force-overwrite server
 *   - Keep theirs   → drop local change, accept server state
 *   - Merge         → opens the diff viewer; user picks per-field
 *
 * Keeps the UI vocabulary consistent with the existing offline queue
 * banner so users see one mental model end-to-end.
 */

export interface OfflineConflict {
  id: string;
  /** Human-readable label — "Deal · Acme Corp" / "Task · Wire Stripe webhook". */
  label: string;
  /** ISO timestamp the local change was made. */
  localTs: string;
  /** ISO timestamp the server change was made. */
  serverTs: string;
  /** Snapshot before either change — useful as a third axis. */
  base?: Record<string, unknown>;
  local: Record<string, unknown>;
  server: Record<string, unknown>;
  /** Human-readable nature of the conflict. */
  reason?: string;
}

export type ConflictChoice = "mine" | "theirs" | "merge";

interface Props {
  conflicts: OfflineConflict[];
  onResolve: (id: string, choice: ConflictChoice, merged?: Record<string, unknown>) => void;
  onDismiss?: () => void;
}

export function OfflineConflictResolver({
  conflicts,
  onResolve,
  onDismiss,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    conflicts[0]?.id ?? null,
  );
  const active = conflicts.find((c) => c.id === activeId) ?? null;

  if (conflicts.length === 0) return null;

  return (
    <section
      role="dialog"
      aria-label="Resolve offline conflicts"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(880px, 100%)",
          maxHeight: "calc(100vh - 40px)",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* Conflict list */}
        <aside
          style={{
            borderRight: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            overflow: "auto",
          }}
        >
          <header
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--content-border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={13} style={{ color: "#F59E0B" }} />
            {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Close"
                style={{
                  marginLeft: "auto",
                  width: 22,
                  height: 22,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  borderRadius: 4,
                }}
              >
                <X size={11} />
              </button>
            )}
          </header>
          <ul style={{ listStyle: "none", padding: 6, margin: 0 }}>
            {conflicts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: "1px solid",
                    borderColor:
                      c.id === activeId
                        ? "var(--vyne-accent, var(--vyne-purple))"
                        : "transparent",
                    background:
                      c.id === activeId
                        ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                        : "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ fontWeight: 600, display: "block" }}>
                    {c.label}
                  </strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {new Date(c.localTs).toLocaleString()} · you
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Detail */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {active ? (
            <>
              <header
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--content-border)",
                }}
              >
                <strong
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  {active.label}
                </strong>
                {active.reason && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {active.reason}
                  </p>
                )}
              </header>
              <div style={{ overflow: "auto", padding: 14, flex: 1 }}>
                <AuditDiffView before={active.server} after={active.local} />
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 10,
                  }}
                >
                  Left side: server state (kept by teammates while you were
                  offline). Right side: your offline edit.
                </p>
              </div>
              <footer
                style={{
                  padding: "12px 18px",
                  borderTop: "1px solid var(--content-border)",
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => onResolve(active.id, "theirs")}
                  style={ghostBtnStyle}
                >
                  Keep theirs
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onResolve(active.id, "merge", {
                      ...active.server,
                      ...active.local,
                    })
                  }
                  style={mergeBtnStyle}
                >
                  <GitMerge size={11} /> Merge
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(active.id, "mine")}
                  style={primaryBtnStyle}
                >
                  Keep mine
                </button>
              </footer>
            </>
          ) : (
            <div
              style={{
                padding: 30,
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 12,
              }}
            >
              Pick a conflict on the left.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const mergeBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid var(--vyne-accent, var(--vyne-purple))",
  background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)",
  color: "var(--vyne-accent, var(--vyne-purple))",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
const ghostBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
