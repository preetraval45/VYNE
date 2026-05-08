"use client";

// Stale channels panel (UI_UPGRADE_PLAN.md 6.5).
//
// Settings → Workspace surface that lists channels which haven't seen a
// message in N days. Each row offers Archive (sets retention=1 day on the
// existing chatPolicies store, so the daily GC sweep deletes the
// channel's history) and Mute (sets channelDnd to muted).

import { useEffect, useMemo, useState } from "react";
import { Archive, BellOff, RefreshCcw, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import type { MsgChannel } from "@/lib/api/client";
import { messagingApi } from "@/lib/api/client";
import { useChatPolicies } from "@/lib/stores/chatPolicies";
import { useChannelDnd } from "@/lib/stores/channelDnd";

const DEFAULT_THRESHOLD_DAYS = 60;

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / 86400000);
}

export function StaleChannelsPanel() {
  const [channels, setChannels] = useState<MsgChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholdDays, setThresholdDays] = useState(DEFAULT_THRESHOLD_DAYS);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const setRetention = useChatPolicies((s) => s.setRetention);
  const setRule = useChannelDnd((s) => s.setRule);

  async function load() {
    setLoading(true);
    try {
      const list = await messagingApi.listChannels();
      setChannels(list ?? []);
    } catch {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stale = useMemo(() => {
    const out: Array<{ ch: MsgChannel; days: number }> = [];
    for (const ch of channels) {
      const d = daysSince(ch.lastMessageAt);
      if (d === null) continue;
      if (d < thresholdDays) continue;
      out.push({ ch, days: d });
    }
    out.sort((a, b) => b.days - a.days);
    return out;
  }, [channels, thresholdDays]);

  function archive(channelId: string, channelName: string) {
    if (
      !confirm(
        `Archive #${channelName}? Sets retention to 1 day so the daily GC sweep will purge old messages.`,
      )
    )
      return;
    setRetention({
      channelId,
      retentionDays: 1,
      archiveBeforeDelete: true,
    });
    setArchivedIds((s) => new Set(s).add(channelId));
    toast.success(`#${channelName} marked for archive`);
  }

  function mute(channelId: string, channelName: string) {
    setRule({
      channelId,
      mode: "muted",
      start: "09:00",
      end: "17:00",
      days: [1, 2, 3, 4, 5],
    });
    setMutedIds((s) => new Set(s).add(channelId));
    toast.success(`#${channelName} muted`);
  }

  return (
    <section
      aria-labelledby="stale-channels-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Inbox size={16} aria-hidden="true" />
        <h2
          id="stale-channels-heading"
          style={{ margin: 0, fontSize: 16 }}
        >
          Stale channels
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Refresh"
          title="Refresh channel list"
          style={{
            marginLeft: "auto",
            width: 28,
            height: 28,
            border: "1px solid var(--content-border)",
            borderRadius: 5,
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCcw size={13} />
        </button>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Quiet for at least
        </span>
        <input
          type="number"
          min={7}
          max={365}
          value={thresholdDays}
          onChange={(e) =>
            setThresholdDays(
              Math.max(7, Math.min(365, Number(e.target.value) || 60)),
            )
          }
          style={{
            width: 60,
            padding: "4px 6px",
            fontSize: 12,
            border: "1px solid var(--content-border)",
            borderRadius: 4,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          days
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Loading channels…
        </div>
      ) : stale.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--content-border)",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          No channels older than {thresholdDays} days. ✓
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {stale.map(({ ch, days }) => {
            const archived = archivedIds.has(ch.id);
            const muted = mutedIds.has(ch.id);
            return (
              <li
                key={ch.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--content-elevated)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  opacity: archived ? 0.6 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    #{ch.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Quiet {days} days · {ch.memberCount ?? 0} members
                    {muted && " · muted"}
                    {archived && " · archive scheduled"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => mute(ch.id, ch.name)}
                  disabled={muted}
                  aria-label={`Mute #${ch.name}`}
                  title="Mute notifications"
                  style={{
                    width: 28,
                    height: 28,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: muted
                      ? "var(--content-bg)"
                      : "transparent",
                    color: muted
                      ? "var(--text-tertiary)"
                      : "var(--text-secondary)",
                    cursor: muted ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BellOff size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => archive(ch.id, ch.name)}
                  disabled={archived}
                  aria-label={`Archive #${ch.name}`}
                  title="Archive channel"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    fontSize: 12,
                    border: "1px solid var(--content-border)",
                    borderRadius: 5,
                    background: archived
                      ? "var(--content-bg)"
                      : "transparent",
                    color: archived
                      ? "var(--text-tertiary)"
                      : "var(--text-primary)",
                    cursor: archived ? "not-allowed" : "pointer",
                  }}
                >
                  <Archive size={12} />
                  {archived ? "Archived" : "Archive"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
