"use client";

import { useEffect, useState } from "react";
import { Play, Square, Clock, Plus } from "lucide-react";
import { useTimeTrackingStore, type TimeEntry } from "@/lib/stores/timeTracking";
import { useAuthStore } from "@/lib/stores/auth";

interface Props {
  issueId: string;
  issueTitle: string;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtElapsed(sinceIso: string): string {
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(sinceIso).getTime()) / 1000),
  );
  return fmtDuration(sec);
}

export function IssueTimeTracker({ issueId, issueTitle }: Props) {
  const user = useAuthStore((s) => s.user);
  const active = useTimeTrackingStore((s) => s.active);
  const entries = useTimeTrackingStore((s) => s.entries);
  const startTimer = useTimeTrackingStore((s) => s.startTimer);
  const stopTimer = useTimeTrackingStore((s) => s.stopTimer);
  const logManual = useTimeTrackingStore((s) => s.logManual);
  const [, forceTick] = useState(0);

  const myEntries = entries.filter((e) => e.issueId === issueId);
  const total = myEntries.reduce((s, e) => s + e.durationSec, 0);
  const isActiveHere = active?.issueId === issueId;

  // Tick once per second while the timer is on this issue
  useEffect(() => {
    if (!isActiveHere) return;
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [isActiveHere]);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("30");
  const [manualNote, setManualNote] = useState("");

  function toggle() {
    if (isActiveHere) {
      stopTimer(user?.id ?? "demo", user?.name ?? "You");
    } else if (active) {
      // Stop the other timer first, then start a new one on this issue
      stopTimer(user?.id ?? "demo", user?.name ?? "You");
      startTimer(issueId, issueTitle);
    } else {
      startTimer(issueId, issueTitle);
    }
  }

  function submitManual() {
    const h = Number(manualHours || 0);
    const m = Number(manualMinutes || 0);
    const duration = h * 3600 + m * 60;
    if (duration <= 0) return;
    const endedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - duration * 1000).toISOString();
    logManual({
      issueId,
      issueTitle,
      userId: user?.id ?? "demo",
      userName: user?.name ?? "You",
      startedAt,
      endedAt,
      durationSec: duration,
      note: manualNote || undefined,
    });
    setManualOpen(false);
    setManualHours("");
    setManualMinutes("30");
    setManualNote("");
  }

  return (
    <section
      aria-label="Time tracker"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Clock size={13} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "var(--text-tertiary)",
            flex: 1,
          }}
        >
          Time tracking
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            color: "var(--text-secondary)",
          }}
        >
          Logged {fmtDuration(total)}
        </span>
      </header>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={toggle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: isActiveHere
              ? "var(--status-danger)"
              : "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isActiveHere ? (
            <>
              <Square size={11} fill="currentColor" />
              Stop · {fmtElapsed(active!.startedAt)}
            </>
          ) : (
            <>
              <Play size={11} fill="currentColor" />
              {active ? "Switch timer here" : "Start timer"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={11} /> Log manual entry
        </button>
      </div>

      {manualOpen && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={0}
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              placeholder="h"
              aria-label="Hours"
              style={miniInput}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>h</span>
            <input
              type="number"
              min={0}
              max={59}
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="m"
              aria-label="Minutes"
              style={miniInput}
            />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>m</span>
            <input
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="What did you work on?"
              aria-label="Note"
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 7,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={submitManual}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log
            </button>
          </div>
        </div>
      )}

      {myEntries.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {myEntries.map((e) => (
            <li
              key={e.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 62,
                  padding: "1px 8px",
                  borderRadius: 5,
                  background: "var(--content-secondary)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fontSize: 11,
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {fmtDuration(e.durationSec)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {e.userName} · {formatShort(e.startedAt)} → {formatShort(e.endedAt)}
                </div>
                {e.note && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 1,
                    }}
                  >
                    {e.note}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const miniInput: React.CSSProperties = {
  width: 52,
  padding: "6px 8px",
  borderRadius: 7,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  textAlign: "right",
  outline: "none",
};

export { fmtDuration };
export type { TimeEntry };
