"use client";

// Persistent huddle dock (UI_UPGRADE_PLAN.md 6.1).
//
// Mounts in the dashboard layout so the active huddle survives page
// navigation. Connects to LiveKit via livekit-client when a session
// is active; tracks audio publication state + remote participants.
// Uses dynamic import so the SDK is only loaded when a huddle starts.

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Users, Loader2 } from "lucide-react";
import { useHuddleStore } from "@/lib/stores/huddle";

interface RemoteParticipant {
  identity: string;
  displayName: string;
  speaking: boolean;
}

export function HuddleDock() {
  const session = useHuddleStore((s) => s.active);
  const endSession = useHuddleStore((s) => s.endSession);
  const setMuted = useHuddleStore((s) => s.setMuted);

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const roomRef = useRef<unknown>(null);

  // Connect / disconnect lifecycle. Only re-runs when the session id
  // changes — toggling mute uses the existing room handle.
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    setConnecting(true);
    setConnected(false);
    setParticipants([]);

    void (async () => {
      try {
        const { Room, RoomEvent, Track } = await import("livekit-client");
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;
        room.on(RoomEvent.ParticipantConnected, () => syncParticipants(room));
        room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room));
        room.on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(room));
        room.on(RoomEvent.Disconnected, () => {
          if (!disposed) {
            setConnected(false);
            endSession();
          }
        });
        await room.connect(session.url, session.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (disposed) {
          await room.disconnect();
          return;
        }
        setConnected(true);
        setConnecting(false);
        syncParticipants(room);

        function syncParticipants(r: typeof room) {
          const remotes: RemoteParticipant[] = [];
          // remoteParticipants is a Map<string, RemoteParticipant>
          for (const [, p] of r.remoteParticipants) {
            remotes.push({
              identity: p.identity,
              displayName: p.name ?? p.identity,
              speaking: p.isSpeaking,
            });
          }
          setParticipants(remotes);
        }
        // Track is intentionally referenced so the dynamic import
        // doesn't tree-shake the type away on some bundlers.
        void Track;
      } catch (err) {
        if (!disposed) {
          setConnecting(false);
          setConnected(false);
          // Swallow — the dock just shows a "couldn't join" state.
          console.error("[huddle] connect failed", err);
        }
      }
    })();

    return () => {
      disposed = true;
      const room = roomRef.current as
        | { disconnect: () => Promise<void> }
        | null;
      if (room) {
        void room.disconnect();
      }
      roomRef.current = null;
    };
  }, [session?.room, session?.token]);

  if (!session) return null;

  async function toggleMute() {
    const room = roomRef.current as
      | { localParticipant: { setMicrophoneEnabled: (e: boolean) => Promise<void> } }
      | null;
    if (!room) return;
    const next = !session!.muted;
    setMuted(next);
    await room.localParticipant.setMicrophoneEnabled(!next);
  }

  function leave() {
    const room = roomRef.current as
      | { disconnect: () => Promise<void> }
      | null;
    if (room) void room.disconnect();
    endSession();
  }

  return (
    <div
      role="region"
      aria-label="Active huddle"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 70,
        background: "var(--content-bg)",
        border: "1px solid var(--vyne-accent, var(--vyne-purple))",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        padding: "10px 12px",
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected
              ? "var(--accent-success)"
              : "var(--text-tertiary)",
            boxShadow: connected ? "0 0 6px var(--accent-success)" : "none",
          }}
        />
        <strong style={{ fontSize: 13 }}>
          Huddle · #{session.channelName}
        </strong>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        {connecting && (
          <>
            <Loader2
              size={11}
              className="animate-spin"
              style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
            />
            Connecting…
          </>
        )}
        {connected && !connecting && (
          <>
            <Users
              size={11}
              style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
              aria-hidden="true"
            />
            {participants.length + 1} in huddle
          </>
        )}
      </div>

      {connected && participants.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          {participants.map((p) => (
            <span
              key={p.identity}
              style={{
                padding: "2px 6px",
                borderRadius: 99,
                background: p.speaking
                  ? "var(--vyne-accent-soft, var(--content-elevated))"
                  : "var(--content-elevated)",
                border: "1px solid var(--content-border)",
              }}
            >
              {p.displayName}
              {p.speaking ? " 🔊" : ""}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button
          type="button"
          onClick={toggleMute}
          disabled={!connected}
          aria-label={session.muted ? "Unmute" : "Mute"}
          title={session.muted ? "Unmute" : "Mute"}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "5px 10px",
            fontSize: 12,
            border: `1px solid ${session.muted ? "var(--accent-error)" : "var(--content-border)"}`,
            borderRadius: 6,
            background: session.muted ? "var(--accent-error)" : "transparent",
            color: session.muted ? "#fff" : "var(--text-primary)",
            cursor: connected ? "pointer" : "not-allowed",
            opacity: connected ? 1 : 0.6,
          }}
        >
          {session.muted ? <MicOff size={11} /> : <Mic size={11} />}
          {session.muted ? "Muted" : "Live"}
        </button>
        <button
          type="button"
          onClick={leave}
          aria-label="Leave huddle"
          title="Leave huddle"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 12px",
            fontSize: 12,
            border: "1px solid var(--accent-error)",
            borderRadius: 6,
            background: "var(--accent-error)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <PhoneOff size={11} />
          Leave
        </button>
      </div>
    </div>
  );
}
