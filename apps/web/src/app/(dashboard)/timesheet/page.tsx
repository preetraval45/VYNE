"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Download, Filter, Play, Square } from "lucide-react";
import { useTimeTrackingStore } from "@/lib/stores/timeTracking";
import { useAuthStore } from "@/lib/stores/auth";

type Grouping = "day" | "week" | "issue" | "user";

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function startOfDay(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default function TimesheetPage() {
  const entries = useTimeTrackingStore((s) => s.entries);
  const active = useTimeTrackingStore((s) => s.active);
  const stopTimer = useTimeTrackingStore((s) => s.stopTimer);
  const user = useAuthStore((s) => s.user);

  const [grouping, setGrouping] = useState<Grouping>("day");
  const [userFilter, setUserFilter] = useState<string | "all">("all");

  const filteredEntries = useMemo(() => {
    if (userFilter === "all") return entries;
    return entries.filter((e) => e.userId === userFilter);
  }, [entries, userFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of filteredEntries) {
      let key: string;
      if (grouping === "day") key = startOfDay(e.startedAt);
      else if (grouping === "week") key = `Week of ${startOfWeek(e.startedAt)}`;
      else if (grouping === "issue") key = `${e.issueId} · ${e.issueTitle}`;
      else key = e.userName;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    const rows = Array.from(map.entries()).map(([key, items]) => ({
      key,
      items: items.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
      total: items.reduce((s, i) => s + i.durationSec, 0),
    }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [filteredEntries, grouping]);

  const allUsers = Array.from(
    new Set(entries.map((e) => `${e.userId}::${e.userName}`)),
  ).map((s) => {
    const [id, name] = s.split("::");
    return { id, name };
  });

  const total = filteredEntries.reduce((s, e) => s + e.durationSec, 0);

  function exportCsv() {
    const rows = [
      "issue_id,issue_title,user,started,ended,duration_sec,duration_label,note",
      ...filteredEntries.map(
        (e) =>
          `${e.issueId},"${e.issueTitle.replace(/"/g, '""')}",${e.userName},${e.startedAt},${e.endedAt},${e.durationSec},${fmtDuration(e.durationSec)},"${(e.note ?? "").replace(/"/g, '""')}"`,
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={17} style={{ color: "var(--vyne-purple)" }} />
            Timesheet
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            Every minute tracked via the per-issue timer. Group by day / week /
            issue / user — export to CSV for finance.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={exportCsv}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Download size={12} /> CSV
        </button>
      </header>

      {/* Summary + filters */}
      <section
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <SummaryTile
          label="Total tracked"
          value={fmtDuration(total)}
          sub={`${filteredEntries.length} entries`}
        />
        <SummaryTile
          label="Running"
          value={active ? fmtDuration(runningSec(active.startedAt)) : "—"}
          sub={active ? `${active.issueId} · ${active.issueTitle}` : "No timer"}
          accent={active ? "warn" : undefined}
          trailing={
            active ? (
              <button
                type="button"
                onClick={() =>
                  stopTimer(user?.id ?? "demo", user?.name ?? "You")
                }
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--status-danger)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Square size={9} fill="currentColor" /> Stop
              </button>
            ) : (
              <Play size={13} style={{ color: "var(--text-tertiary)" }} />
            )
          }
        />
        <SummaryTile
          label="Distinct issues"
          value={new Set(filteredEntries.map((e) => e.issueId)).size.toString()}
          sub="With time logged"
        />
        <SummaryTile
          label="Contributors"
          value={allUsers.length.toString()}
          sub="Logging time"
        />
      </section>

      {/* Group toolbar */}
      <div
        style={{
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderBottom: "1px solid var(--content-border)",
          flexShrink: 0,
        }}
      >
        <Filter size={13} style={{ color: "var(--text-tertiary)" }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Group by
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {(["day", "week", "issue", "user"] as const).map((g) => {
            const active = grouping === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGrouping(g)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: active
                    ? "rgba(108,71,255,0.1)"
                    : "transparent",
                  color: active
                    ? "var(--vyne-purple)"
                    : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          User
        </span>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          aria-label="Filter by user"
          style={{
            padding: "5px 10px",
            borderRadius: 7,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 12,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All users</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grouped list */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}
      >
        {groups.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No time entries yet. Open any issue and start a timer.
          </div>
        )}
        {groups.map((g) => (
          <article
            key={g.key}
            style={{
              marginBottom: 18,
              border: "1px solid var(--content-border)",
              borderRadius: 11,
              background: "var(--content-bg)",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                background: "var(--content-secondary)",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  flex: 1,
                }}
              >
                {g.key}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--vyne-purple)",
                  fontWeight: 700,
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {fmtDuration(g.total)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {g.items.length} entries
              </span>
            </header>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {g.items.map((e, i) => (
                <li
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1fr 140px 140px",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 16px",
                    borderTop:
                      i > 0 ? "1px solid var(--content-border)" : "none",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "var(--content-secondary)",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      fontSize: 11,
                      textAlign: "center",
                    }}
                  >
                    {fmtDuration(e.durationSec)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Link
                      href={`/projects?issue=${e.issueId}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.issueId} — {e.issueTitle}
                    </Link>
                    {e.note && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          marginTop: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.note}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {e.userName}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      textAlign: "right",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {new Date(e.startedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function runningSec(sinceIso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(sinceIso).getTime()) / 1000),
  );
}

function SummaryTile({
  label,
  value,
  sub,
  accent,
  trailing,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "warn";
  trailing?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background:
          accent === "warn"
            ? "var(--badge-warning-bg)"
            : "var(--content-bg)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color:
              accent === "warn"
                ? "var(--badge-warning-text)"
                : "var(--text-primary)",
            letterSpacing: "-0.02em",
            marginTop: 2,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          {value}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}
