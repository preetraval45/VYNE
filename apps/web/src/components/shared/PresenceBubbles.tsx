"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribe, publishFromClient, isRealtimeEnabled } from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";
import { useFollow } from "@/hooks/useFollowTeammate";

interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  hue: number;
  lastSeen: number;
}

/**
 * PresenceBubbles — show avatar bubbles of teammates currently viewing
 * the same record (Linear / Notion style).
 *
 * How it works:
 *   - Component publishes a `presence:hello` heartbeat to a per-entity
 *     channel every 12 seconds while mounted.
 *   - Subscribes to the same channel and aggregates active members.
 *   - Members idle ≥ 30 s drop off the list.
 *
 * Realtime infra:
 *   - Pusher when configured (NEXT_PUBLIC_PUSHER_KEY set).
 *   - Otherwise renders nothing (same surface, no fallback noise).
 *
 *   <PresenceBubbles entityKey={`deal:${deal.id}`} />
 */
export interface PresenceBubblesProps {
  /** Stable channel suffix unique to this record. e.g. `deal:DEAL-123`. */
  entityKey: string;
  /** Maximum bubbles rendered before "+N" rollup. Default 4. */
  max?: number;
  /** Override avatar size. Default 22. */
  size?: number;
}

const HEARTBEAT_MS = 12_000;
const STALE_AFTER_MS = 30_000;

export function PresenceBubbles({
  entityKey,
  max = 4,
  size = 22,
}: PresenceBubblesProps) {
  const me = useAuthStore((s) => s.user);
  const { followingId, follow, release } = useFollow();
  const [members, setMembers] = useState<Map<string, PresenceUser>>(
    () => new Map(),
  );

  const channel = useMemo(() => `presence-${entityKey}`, [entityKey]);

  // Heartbeat: announce ourselves every HEARTBEAT_MS while mounted.
  useEffect(() => {
    if (!isRealtimeEnabled() || !me) return;
    const iam: PresenceUser = {
      id: me.id ?? me.email ?? "anon",
      name: me.name ?? "Teammate",
      initials: (me.name ?? "T")
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      hue: hashHue(me.id ?? me.email ?? "anon"),
      lastSeen: Date.now(),
    };
    function beat() {
      void publishFromClient(channel, "presence:hello", iam);
    }
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);

    return () => {
      window.clearInterval(id);
      // Best-effort goodbye so other clients drop us immediately.
      void publishFromClient(channel, "presence:bye", { id: iam.id });
    };
  }, [channel, me]);

  // Subscribe + accumulate member list.
  useEffect(() => {
    if (!isRealtimeEnabled()) return;
    const offHello = subscribe<PresenceUser>(channel, "presence:hello", (u) => {
      setMembers((prev) => {
        const next = new Map(prev);
        next.set(u.id, { ...u, lastSeen: Date.now() });
        return next;
      });
    });
    const offBye = subscribe<{ id: string }>(channel, "presence:bye", ({ id }) => {
      setMembers((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });
    // Periodic GC of stale members.
    const gc = window.setInterval(() => {
      const cutoff = Date.now() - STALE_AFTER_MS;
      setMembers((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, u] of next) {
          if (u.lastSeen < cutoff) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5_000);

    return () => {
      offHello();
      offBye();
      window.clearInterval(gc);
    };
  }, [channel]);

  const others = useMemo(() => {
    const list = Array.from(members.values()).filter((u) => u.id !== me?.id);
    return list.sort((a, b) => b.lastSeen - a.lastSeen);
  }, [members, me]);

  if (!isRealtimeEnabled() || others.length === 0) return null;

  const visible = others.slice(0, max);
  const overflow = others.length - visible.length;

  return (
    <div
      role="group"
      aria-label={`${others.length} teammate${others.length === 1 ? "" : "s"} viewing`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
      }}
    >
      {visible.map((u, idx) => {
        const amFollowing = followingId === u.id;
        return (
          <button
            key={u.id}
            type="button"
            title={
              amFollowing
                ? `Following ${u.name} — click to release`
                : `${u.name} is viewing — click to follow`
            }
            aria-label={
              amFollowing
                ? `Following ${u.name} — click to release`
                : `${u.name} is viewing — click to follow`
            }
            aria-pressed={amFollowing ? "true" : "false"}
            onClick={() =>
              amFollowing ? release() : follow(u.id, u.name)
            }
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: `linear-gradient(135deg, hsl(${u.hue} 70% 55%), hsl(${(u.hue + 30) % 360} 70% 45%))`,
              color: "#fff",
              fontSize: Math.max(9, Math.round(size * 0.42)),
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: amFollowing
                ? "2px solid var(--vyne-accent, var(--vyne-purple))"
                : "2px solid var(--content-bg)",
              boxShadow: amFollowing
                ? "0 0 0 2px var(--vyne-accent, var(--vyne-purple)), 0 1px 3px rgba(0,0,0,0.18)"
                : "0 1px 3px rgba(0,0,0,0.18)",
              marginLeft: idx === 0 ? 0 : -6,
              position: "relative",
              zIndex: visible.length - idx,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {u.initials}
          </button>
        );
      })}
      {overflow > 0 && (
        <span
          aria-label={`${overflow} more teammate${overflow === 1 ? "" : "s"}`}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            fontSize: Math.max(9, Math.round(size * 0.4)),
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--content-bg)",
            marginLeft: -6,
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Cheap deterministic hash → 0..359 for avatar gradient hue. */
function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}
