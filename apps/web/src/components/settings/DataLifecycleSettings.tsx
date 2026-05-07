"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Download,
  ShieldAlert,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  useWorkspaceSnapshots,
  type WorkspaceSnapshot,
} from "@/lib/stores/workspaceSnapshots";

interface Props {
  onToast: (message: string) => void;
}

function relative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DataLifecycleSettings({ onToast }: Props) {
  const snapshots = useWorkspaceSnapshots((s) => s.snapshots);
  const capture = useWorkspaceSnapshots((s) => s.capture);
  const restore = useWorkspaceSnapshots((s) => s.restore);
  const removeSnap = useWorkspaceSnapshots((s) => s.remove);
  const ensureDaily = useWorkspaceSnapshots((s) => s.ensureDaily);

  const [snapName, setSnapName] = useState("");
  const [snapNotes, setSnapNotes] = useState("");

  const [gdprEmail, setGdprEmail] = useState("");
  const [forgetReason, setForgetReason] = useState("");
  const [gdprBusy, setGdprBusy] = useState(false);

  const [sheetId, setSheetId] = useState("");
  const [sheetModule, setSheetModule] = useState("contacts");
  const [sheetDirection, setSheetDirection] = useState<"pull" | "push" | "both">("pull");

  useEffect(() => {
    ensureDaily();
  }, [ensureDaily]);

  // ── Snapshots
  async function handleCapture() {
    const row = await capture(snapName || `Manual · ${new Date().toLocaleString()}`, snapNotes);
    setSnapName("");
    setSnapNotes("");
    onToast(`Snapshot captured · ${fmtBytes(row.sizeBytes)}`);
  }

  async function handleRestore(snap: WorkspaceSnapshot) {
    if (
      !confirm(
        `Restore "${snap.name}"? Every change since this snapshot will be lost. The page will reload.`,
      )
    ) {
      return;
    }
    const ok = await restore(snap.id);
    if (!ok) onToast("Couldn't restore snapshot");
  }

  // ── GDPR
  async function handleGdprExport() {
    if (!gdprEmail.trim()) return;
    setGdprBusy(true);
    try {
      const res = await fetch("/api/gdpr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: gdprEmail.trim() }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        totalRows?: number;
        sections?: unknown[];
        exportedAt?: string;
      };
      if (data.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gdpr-export-${gdprEmail.trim()}-${(data.exportedAt ?? new Date().toISOString()).slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        onToast(
          `Export downloaded · ${data.totalRows ?? 0} row${data.totalRows === 1 ? "" : "s"} across ${data.sections?.length ?? 0} module${data.sections?.length === 1 ? "" : "s"}`,
        );
      } else {
        onToast("Export failed");
      }
    } catch {
      onToast("Couldn't reach the export service");
    } finally {
      setGdprBusy(false);
    }
  }

  async function handleGdprForget() {
    if (!gdprEmail.trim()) return;
    if (
      !confirm(
        `Permanently erase every record referencing ${gdprEmail.trim()}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setGdprBusy(true);
    try {
      const res = await fetch("/api/gdpr/forget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gdprEmail.trim(),
          confirm: true,
          reason: forgetReason.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        storesToWipe?: string[];
      };
      if (data.ok) {
        const wiped = await wipeLocalReferences(
          gdprEmail.trim(),
          data.storesToWipe ?? [],
        );
        onToast(`Erased ${wiped} local reference${wiped === 1 ? "" : "s"}`);
        setGdprEmail("");
        setForgetReason("");
      } else {
        onToast("Forget request failed");
      }
    } catch {
      onToast("Couldn't reach the forget service");
    } finally {
      setGdprBusy(false);
    }
  }

  // ── Sheets sync
  async function handleSheetsSync() {
    try {
      const res = await fetch("/api/integrations/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: sheetId.trim(),
          module: sheetModule,
          direction: sheetDirection,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
        stats?: { pulled?: number; pushed?: number };
      };
      if (data.ok) {
        onToast(
          `Sheets sync ${sheetDirection} · pulled ${data.stats?.pulled ?? 0}, pushed ${data.stats?.pushed ?? 0}`,
        );
      } else {
        onToast(data.message ?? data.error ?? "Sync failed");
      }
    } catch {
      onToast("Couldn't reach the sync service");
    }
  }

  return (
    <div>
      {/* ── Snapshots (17.9) ─────────────────────────────────────── */}
      <Card title="Workspace snapshots" icon={Camera}>
        <p style={pStyle}>
          Point-in-time backups of every persisted store. Restore reloads
          the page and re-hydrates everything from the chosen snapshot.
          Auto-snapshot fires once per day; manual snapshots count
          toward the cap of 7.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <input
            value={snapName}
            onChange={(e) => setSnapName(e.target.value)}
            placeholder="Snapshot name (optional)"
            aria-label="Snapshot name"
            style={inputStyle}
          />
          <input
            value={snapNotes}
            onChange={(e) => setSnapNotes(e.target.value)}
            placeholder="Notes (e.g. before CSV import)"
            aria-label="Snapshot notes"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={handleCapture}
            style={primaryBtnStyle}
          >
            <Camera size={11} /> Capture snapshot
          </button>
        </div>
        {snapshots.length === 0 ? (
          <p style={emptyStyle}>No snapshots yet.</p>
        ) : (
          <ul style={ulStyle}>
            {snapshots.map((s) => (
              <li key={s.id} style={rowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={titleStyle}>{s.name}</strong>
                  <div style={hintStyle}>
                    {fmtBytes(s.sizeBytes)} · {relative(s.createdAt)}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(s)}
                  style={primaryBtnStyle}
                >
                  <RotateCcw size={11} /> Restore
                </button>
                <button
                  type="button"
                  onClick={() => removeSnap(s.id)}
                  aria-label="Delete snapshot"
                  style={iconBtnStyle}
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ── GDPR / Right of access (17.5) ────────────────────────── */}
      <Card title="Data subject requests" icon={Download}>
        <p style={pStyle}>
          GDPR / CCPA self-service. Export every record referencing a
          person, or hard-erase them workspace-wide.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="email"
            value={gdprEmail}
            onChange={(e) => setGdprEmail(e.target.value)}
            placeholder="Subject email or user id"
            aria-label="Subject email"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={gdprBusy || !gdprEmail.trim()}
              onClick={handleGdprExport}
              style={primaryBtnStyle}
            >
              <Download size={11} /> Export JSON
            </button>
            <button
              type="button"
              disabled={gdprBusy || !gdprEmail.trim()}
              onClick={handleGdprForget}
              style={dangerBtnStyle}
            >
              <ShieldAlert size={11} /> Forget user
            </button>
          </div>
          <input
            value={forgetReason}
            onChange={(e) => setForgetReason(e.target.value)}
            placeholder="Reason (audit log)"
            aria-label="Forget reason"
            style={inputStyle}
          />
          <p
            style={{
              ...hintStyle,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertTriangle size={11} /> Forget is irreversible. Capture a snapshot first.
          </p>
        </div>
      </Card>

      {/* ── Google Sheets sync (17.3) ────────────────────────────── */}
      <Card title="Google Sheets sync" icon={FileSpreadsheet}>
        <p style={pStyle}>
          Two-way sync between a sheet and a VYNE module. Connect Google
          in Settings → Integrations to enable.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="Google Sheet id (https://docs.google.com/spreadsheets/d/{id})"
            aria-label="Sheet id"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <select
              aria-label="Module"
              value={sheetModule}
              onChange={(e) => setSheetModule(e.target.value)}
              style={selectStyle}
            >
              <option value="contacts">Contacts</option>
              <option value="deals">Deals</option>
              <option value="invoices">Invoices</option>
              <option value="products">Products</option>
              <option value="tasks">Tasks</option>
            </select>
            <select
              aria-label="Direction"
              value={sheetDirection}
              onChange={(e) => setSheetDirection(e.target.value as "pull" | "push" | "both")}
              style={selectStyle}
            >
              <option value="pull">Pull (sheet → VYNE)</option>
              <option value="push">Push (VYNE → sheet)</option>
              <option value="both">Two-way</option>
            </select>
            <button
              type="button"
              disabled={!sheetId.trim()}
              onClick={handleSheetsSync}
              style={primaryBtnStyle}
            >
              Run sync
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Best-effort local wipe of any localStorage row that mentions the
 * subject. Matches every value containing the subject string (case-
 * insensitive). Returns the count of localStorage entries that were
 * either trimmed or removed.
 */
async function wipeLocalReferences(
  subject: string,
  storesToWipe: string[],
): Promise<number> {
  if (typeof window === "undefined") return 0;
  let touched = 0;
  const needle = subject.toLowerCase();

  // Helper: does this localStorage key match the wildcard pattern?
  const matchesPattern = (key: string, pattern: string): boolean => {
    if (pattern.endsWith("*")) {
      return key.startsWith(pattern.slice(0, -1));
    }
    return key === pattern;
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!storesToWipe.some((p) => matchesPattern(key, p))) continue;
    const value = localStorage.getItem(key);
    if (!value) continue;
    if (!value.toLowerCase().includes(needle)) continue;

    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (row) => !JSON.stringify(row).toLowerCase().includes(needle),
        );
        if (filtered.length === 0) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(filtered));
        touched += 1;
      } else if (parsed && typeof parsed === "object") {
        // Trim object-rooted stores by walking known array fields.
        const obj = parsed as Record<string, unknown>;
        let changed = false;
        for (const [k, v] of Object.entries(obj)) {
          if (Array.isArray(v)) {
            const filtered = v.filter(
              (row) => !JSON.stringify(row).toLowerCase().includes(needle),
            );
            if (filtered.length !== v.length) {
              obj[k] = filtered;
              changed = true;
            }
          }
        }
        if (changed) {
          localStorage.setItem(key, JSON.stringify(obj));
          touched += 1;
        }
      }
    } catch {
      // Non-JSON values that mention the subject — drop the whole key.
      localStorage.removeItem(key);
      touched += 1;
    }
  }
  return touched;
}

// ── Styles ───────────────────────────────────────────────────────
function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{title}</strong>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

const pStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 12,
  color: "var(--text-tertiary)",
};
const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 7,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12.5,
  outline: "none",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  flex: 1,
  cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "7px 14px",
  borderRadius: 7,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
};
const dangerBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid rgba(239, 68, 68, 0.4)",
  background: "rgba(239, 68, 68, 0.08)",
  color: "var(--status-danger, #DC2626)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
};
const iconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
};
const ulStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 8,
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
};
const titleStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--text-primary)",
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
};
const emptyStyle: React.CSSProperties = {
  margin: 0,
  padding: "16px 0",
  textAlign: "center",
  fontSize: 12,
  color: "var(--text-tertiary)",
};
