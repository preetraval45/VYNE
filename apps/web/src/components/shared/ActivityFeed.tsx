"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import {
  timeAgo,
  useActivityStore,
  type ActivityRecordType,
  type ActivityEntry,
} from "@/lib/stores/activity";
import {
  subscribe,
  isRealtimeEnabled,
} from "@/lib/realtime";

/**
 * Per-record activity feed. Pass recordType + recordId and the component
 * subscribes just to that record's entries. Renders "Sarah moved VYNE-42
 * from Todo → In Progress · 3m ago" style rows. Empty state renders an
 * inline "No activity yet" hint.
 */
export function ActivityFeed({
  recordType,
  recordId,
  limit = 20,
  title = "Activity",
  compact = false,
}: {
  recordType: ActivityRecordType;
  recordId: string;
  limit?: number;
  title?: string;
  compact?: boolean;
}) {
  // Subscribe to the stable entries array, then derive with useMemo —
  // returning `s.entries.filter(...)` directly produces a new array on
  // every render and trips React 19's useSyncExternalStore consistency
  // check (Minified React error #185).
  const allEntries = useActivityStore((s) => s.entries);
  const log = useActivityStore((s) => s.log);
  const entries = useMemo(
    () =>
      allEntries.filter(
        (e) => e.recordType === recordType && e.recordId === recordId,
      ),
    [allEntries, recordType, recordId],
  );
  const visible = entries.slice(0, limit);
  const [pulseIds, setPulseIds] = useState<Set<string>>(() => new Set());

  // Realtime: when another tab/user appends an activity for this record,
  // mirror it into our local store and pulse the row briefly.
  useEffect(() => {
    if (!isRealtimeEnabled()) return;
    const channel = `activity-${recordType}-${recordId}`;
    const off = subscribe<Omit<ActivityEntry, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }>(channel, "activity:append", (incoming) => {
      // Skip our own echo if the payload's id matches one we've already logged.
      if (incoming.id && allEntries.some((e) => e.id === incoming.id)) return;
      const row = log({
        recordType: incoming.recordType,
        recordId: incoming.recordId,
        verb: incoming.verb,
        summary: incoming.summary,
        field: incoming.field,
        from: incoming.from,
        to: incoming.to,
        actor: incoming.actor,
      });
      setPulseIds((prev) => {
        const next = new Set(prev);
        next.add(row.id);
        return next;
      });
      window.setTimeout(() => {
        setPulseIds((prev) => {
          if (!prev.has(row.id)) return prev;
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }, 4_000);
    });
    return off;
  }, [recordType, recordId, allEntries, log]);

  return (
    <section
      aria-label={title}
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: compact ? "12px 14px" : "16px 18px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        <Clock size={13} style={{ color: "var(--vyne-teal)" }} />
        {title}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
          }}
        >
          {entries.length}
        </span>
      </header>

      {visible.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "var(--text-tertiary)",
            padding: "10px 0",
            textAlign: "center",
          }}
        >
          No activity yet — changes to this record will appear here.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {visible.map((e) => {
            const isNew = pulseIds.has(e.id);
            return (
            <li
              key={e.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: isNew
                  ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                  : "var(--content-secondary)",
                border: isNew
                  ? "1px solid var(--vyne-accent, var(--vyne-purple))"
                  : "1px solid var(--content-border)",
                transition: "background 600ms ease, border-color 600ms ease",
                position: "relative",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--vyne-teal-soft)",
                  color: "var(--vyne-teal)",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  textTransform: "uppercase",
                }}
              >
                {(e.actor ?? "?").slice(0, 2)}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: "var(--text-primary)",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ fontWeight: 600 }}>{e.actor}</strong>{" "}
                  {e.summary}
                  {e.from && e.to && (
                    <>
                      {" "}
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--content-bg)",
                          border: "1px solid var(--content-border)",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {e.from}
                      </span>
                      <span style={{ margin: "0 4px", color: "var(--text-tertiary)" }}>→</span>
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--vyne-teal-soft)",
                          color: "var(--vyne-teal)",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                        }}
                      >
                        {e.to}
                      </span>
                    </>
                  )}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {timeAgo(e.createdAt)}
                </p>
              </div>
              {isNew && (
                <span
                  aria-label="New"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: "var(--vyne-accent, var(--vyne-purple))",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  New
                </span>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
