"use client";

import { Clock } from "lucide-react";
import {
  timeAgo,
  useActivityStore,
  type ActivityRecordType,
} from "@/lib/stores/activity";

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
  const entries = useActivityStore((s) =>
    s.entries.filter(
      (e) => e.recordType === recordType && e.recordId === recordId,
    ),
  );
  const visible = entries.slice(0, limit);

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
          {visible.map((e) => (
            <li
              key={e.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
