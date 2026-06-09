"use client";

import { useMemo, useState } from "react";
import {
  StickyNote,
  Phone,
  Mail,
  CalendarClock,
  History,
  Plus,
} from "lucide-react";
import {
  useActivityStore,
  timeAgo,
  type ActivityKind,
  type ActivityRecordType,
} from "@/lib/stores/activity";

/**
 * RecordActivityTimeline — CRM-style activity log for any record (deal,
 * contact, …). Shows a quick-add bar (Note / Call / Email / Meeting) plus a
 * chronological feed that interleaves logged interactions with system audit
 * entries. Backed by the shared activity store (persisted), so it survives
 * refresh and shows up wherever the record is viewed.
 */

const LOG_KINDS: Array<{
  kind: Exclude<ActivityKind, "change">;
  label: string;
  verb: string;
  icon: typeof StickyNote;
  placeholder: string;
}> = [
  {
    kind: "note",
    label: "Note",
    verb: "logged",
    icon: StickyNote,
    placeholder: "Add a note…",
  },
  {
    kind: "call",
    label: "Call",
    verb: "logged",
    icon: Phone,
    placeholder: "What was discussed on the call?",
  },
  {
    kind: "email",
    label: "Email",
    verb: "logged",
    icon: Mail,
    placeholder: "Summarize the email…",
  },
  {
    kind: "meeting",
    label: "Meeting",
    verb: "logged",
    icon: CalendarClock,
    placeholder: "Meeting notes / outcome…",
  },
];

function kindMeta(kind: ActivityKind | undefined): {
  icon: typeof StickyNote;
  color: string;
  label: string;
} {
  switch (kind) {
    case "note":
      return { icon: StickyNote, color: "#F59E0B", label: "Note" };
    case "call":
      return { icon: Phone, color: "#22C55E", label: "Call" };
    case "email":
      return { icon: Mail, color: "var(--status-info)", label: "Email" };
    case "meeting":
      return { icon: CalendarClock, color: "#8B5CF6", label: "Meeting" };
    default:
      return { icon: History, color: "var(--text-tertiary)", label: "Update" };
  }
}

export function RecordActivityTimeline({
  recordType,
  recordId,
  onLogged,
}: {
  recordType: ActivityRecordType;
  recordId: string;
  /** Fired after a manual interaction is logged (e.g. to bump lastActivity). */
  onLogged?: () => void;
}) {
  // Select the raw array + the stable action; derive the filtered list with
  // useMemo (never filter inside the selector — React #185 trap).
  const entries = useActivityStore((s) => s.entries);
  const log = useActivityStore((s) => s.log);

  const records = useMemo(
    () =>
      entries.filter(
        (e) => e.recordType === recordType && e.recordId === recordId,
      ),
    [entries, recordType, recordId],
  );

  const [composerKind, setComposerKind] = useState<Exclude<
    ActivityKind,
    "change"
  > | null>(null);
  const [body, setBody] = useState("");

  function save() {
    const text = body.trim();
    if (!composerKind || !text) return;
    log({
      recordType,
      recordId,
      kind: composerKind,
      verb: "logged",
      summary: `Logged a ${composerKind}`,
      body: text,
    });
    setBody("");
    setComposerKind(null);
    onLogged?.();
  }

  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 14,
          letterSpacing: "-0.01em",
        }}
      >
        Activity
      </h2>

      {/* Quick-add bar */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        {LOG_KINDS.map(({ kind, label, icon: Icon }) => {
          const active = composerKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setComposerKind(active ? null : kind);
                setBody("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: active
                  ? "1px solid var(--vyne-accent, var(--vyne-purple))"
                  : "1px solid var(--content-border)",
                background: active
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                  : "var(--content-bg)",
                color: active
                  ? "var(--vyne-accent, var(--vyne-purple))"
                  : "var(--text-secondary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          );
        })}
      </div>

      {/* Composer */}
      {composerKind && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
              if (e.key === "Escape") {
                setComposerKind(null);
                setBody("");
              }
            }}
            placeholder={
              LOG_KINDS.find((k) => k.kind === composerKind)?.placeholder
            }
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setComposerKind(null);
                setBody("");
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!body.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: body.trim()
                  ? "var(--vyne-accent, var(--vyne-purple))"
                  : "var(--content-border)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: body.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Plus size={13} /> Log {composerKind}
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      {records.length === 0 ? (
        <p
          style={{
            fontSize: 12.5,
            color: "var(--text-tertiary)",
            margin: 0,
          }}
        >
          No activity yet. Log a call, email, meeting, or note to start the
          history.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {records.map((e) => {
            const meta = kindMeta(e.kind);
            const Icon = meta.icon;
            return (
              <li key={e.id} style={{ display: "flex", gap: 12 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--content-secondary)",
                    color: meta.color,
                    marginTop: 1,
                  }}
                >
                  <Icon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {e.actor ?? "You"}
                    </span>
                    <span
                      style={{ fontSize: 12.5, color: "var(--text-secondary)" }}
                    >
                      {e.kind && e.kind !== "change"
                        ? `logged a ${e.kind}`
                        : e.summary}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginLeft: "auto",
                      }}
                    >
                      {timeAgo(e.createdAt)}
                    </span>
                  </div>
                  {e.body && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "var(--text-secondary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {e.body}
                    </p>
                  )}
                  {!e.body && e.field && (e.from || e.to) && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11.5,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {e.field}: {e.from ?? "—"} → {e.to ?? "—"}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
