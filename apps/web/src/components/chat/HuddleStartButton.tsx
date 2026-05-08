"use client";

// One-tap "Start huddle" button (UI_UPGRADE_PLAN.md 6.1).
// Sits in the chat header. Mints a token via /api/huddles/token and
// hands it to the global HuddleDock through useHuddleStore.

import { useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useHuddleStore } from "@/lib/stores/huddle";
import { useAuthStore } from "@/lib/stores/auth";

interface Props {
  channelId: string;
  channelName?: string;
}

export function HuddleStartButton({ channelId, channelName }: Props) {
  const [busy, setBusy] = useState(false);
  const session = useHuddleStore((s) => s.active);
  const startSession = useHuddleStore((s) => s.startSession);
  const me = useAuthStore((s) => s.user);

  const inThisHuddle =
    session?.channelId === channelId && session !== null;

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const identity = me?.id ?? me?.email ?? `anon-${Math.random().toString(36).slice(2, 8)}`;
      const displayName = me?.name ?? me?.email ?? "Guest";
      const res = await fetch("/api/huddles/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          channelName: channelName ?? channelId,
          identity,
          displayName,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        url?: string;
        room?: string;
        error?: string;
        missing?: string[];
        hint?: string;
      };
      if (!res.ok || !data.ok || !data.token || !data.url || !data.room) {
        toast.error(
          data.hint ??
            data.error ??
            (data.missing
              ? `Huddles not configured: ${data.missing.join(", ")}`
              : "Couldn't start huddle"),
        );
        return;
      }
      startSession({
        channelId,
        channelName: channelName ?? channelId,
        room: data.room,
        token: data.token,
        url: data.url,
        identity,
        displayName,
      });
      toast.success(`Joined huddle in #${channelName ?? channelId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't start huddle",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy || inThisHuddle}
      aria-label={
        inThisHuddle
          ? "Already in this huddle"
          : `Start huddle in #${channelName ?? channelId}`
      }
      title={inThisHuddle ? "In huddle" : "Start huddle"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${inThisHuddle ? "var(--accent-success)" : "var(--content-border)"}`,
        borderRadius: 6,
        background: inThisHuddle
          ? "var(--accent-success)"
          : "transparent",
        color: inThisHuddle ? "#fff" : "var(--text-primary)",
        cursor: busy || inThisHuddle ? "not-allowed" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Headphones size={12} />
      )}
      {inThisHuddle ? "In huddle" : "Huddle"}
    </button>
  );
}
