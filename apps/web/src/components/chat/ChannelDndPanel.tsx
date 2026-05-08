"use client";

// Per-channel notification schedule UI (UI_UPGRADE_PLAN.md 6.8).
// Renders inside the channel settings drawer; backed by useChannelDnd.

import { Bell, BellOff, Clock } from "lucide-react";
import {
  useChannelDnd,
  type ChannelDndMode,
} from "@/lib/stores/channelDnd";

const MODES: Array<{
  id: ChannelDndMode;
  label: string;
  hint: string;
  icon: typeof Bell;
}> = [
  {
    id: "always",
    label: "Always notify",
    hint: "Fires even during workspace-wide DND.",
    icon: Bell,
  },
  {
    id: "schedule",
    label: "Notify on schedule",
    hint: "Inside the window: notify. Outside: silent.",
    icon: Clock,
  },
  {
    id: "muted",
    label: "Muted",
    hint: "Never notify, regardless of mentions.",
    icon: BellOff,
  },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  channelId: string;
  channelName?: string;
}

export function ChannelDndPanel({ channelId, channelName }: Props) {
  const rule = useChannelDnd((s) => s.rules[channelId]);
  const setRule = useChannelDnd((s) => s.setRule);
  const clearRule = useChannelDnd((s) => s.clearRule);

  const mode = rule?.mode ?? null; // null = inherit from workspace
  const start = rule?.start ?? "09:00";
  const end = rule?.end ?? "17:00";
  const days = rule?.days ?? [1, 2, 3, 4, 5];

  function update(patch: Partial<{ mode: ChannelDndMode; start: string; end: string; days: number[] }>) {
    setRule({
      channelId,
      mode: patch.mode ?? mode ?? "always",
      start: patch.start ?? start,
      end: patch.end ?? end,
      days: patch.days ?? days,
    });
  }

  function toggleDay(d: number) {
    update({
      days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort(),
    });
  }

  return (
    <section
      aria-labelledby={`channel-dnd-${channelId}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        border: "1px solid var(--content-border)",
        borderRadius: 8,
        background: "var(--content-elevated)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Bell size={14} aria-hidden="true" />
        <strong
          id={`channel-dnd-${channelId}`}
          style={{ fontSize: 13 }}
        >
          Notifications {channelName ? `for ${channelName}` : ""}
        </strong>
        {mode && (
          <button
            type="button"
            onClick={() => clearRule(channelId)}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--text-tertiary)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Inherit workspace
          </button>
        )}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => update({ mode: m.id })}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: 8,
                border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                borderRadius: 6,
                background: active
                  ? "var(--vyne-accent-soft, var(--content-bg))"
                  : "var(--content-bg)",
                color: "var(--text-primary)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <m.icon
                size={13}
                aria-hidden="true"
                color={active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-secondary)"}
                style={{ marginTop: 1 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  {m.hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {mode === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="time"
              value={start}
              onChange={(e) => update({ start: e.target.value })}
              aria-label="Start time"
              style={{
                padding: "4px 6px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 4,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              →
            </span>
            <input
              type="time"
              value={end}
              onChange={(e) => update({ end: e.target.value })}
              aria-label="End time"
              style={{
                padding: "4px 6px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 4,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {DAY_LABELS.map((label, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  aria-pressed={on}
                  aria-label={`Day ${i}`}
                  style={{
                    width: 26,
                    height: 26,
                    border: `1px solid ${on ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                    borderRadius: 4,
                    background: on
                      ? "var(--vyne-accent, var(--vyne-purple))"
                      : "var(--content-bg)",
                    color: on ? "#fff" : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
