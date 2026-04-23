"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { anchor: number; head: number };
}

export interface CollabState {
  ydoc: Y.Doc;
  provider: WebrtcProvider | null;
  users: CollabUser[];
  status: "connecting" | "connected" | "disconnected";
}

const USER_COLORS = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

function randomColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * Set up a y-webrtc collaborative session on a given doc id.
 * Peer-to-peer via public signalling; no backend needed for demos.
 */
export function useCollab({
  docId,
  userId,
  userName,
  enabled = true,
}: {
  docId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}): CollabState {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [status, setStatus] = useState<CollabState["status"]>("connecting");

  useEffect(() => {
    if (!enabled || !docId) {
      setStatus("disconnected");
      return;
    }

    let provider: WebrtcProvider;
    try {
      provider = new WebrtcProvider(`vyne-doc-${docId}`, ydoc, {
        signaling: [
          "wss://signaling.yjs.dev",
          "wss://y-webrtc-signaling-eu.herokuapp.com",
        ],
      });
    } catch {
      setStatus("disconnected");
      return;
    }

    providerRef.current = provider;

    provider.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      color: randomColor(userId),
    });

    function updateUsers() {
      const states = Array.from(provider.awareness.getStates().values());
      const mapped: CollabUser[] = states
        .map((s) => (s as { user?: CollabUser }).user)
        .filter((u): u is CollabUser => Boolean(u && u.id !== userId));
      setUsers(mapped);
    }

    provider.awareness.on("change", updateUsers);
    provider.on("status", (event: { connected: boolean }) => {
      setStatus(event.connected ? "connected" : "disconnected");
    });

    // Assume connected shortly after setup; y-webrtc is lazy
    const timer = setTimeout(() => setStatus("connected"), 500);

    return () => {
      clearTimeout(timer);
      provider.awareness.off("change", updateUsers);
      provider.destroy();
      providerRef.current = null;
    };
  }, [docId, userId, userName, enabled, ydoc]);

  return {
    ydoc,
    provider: providerRef.current,
    users,
    status,
  };
}
