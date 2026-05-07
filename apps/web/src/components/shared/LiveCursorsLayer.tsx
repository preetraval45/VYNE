"use client";

import { useEffect, useRef, useState } from "react";
import { subscribe, publishFromClient, isRealtimeEnabled } from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * LiveCursorsLayer — overlays a translucent layer that streams every
 * teammate's mouse position on the same entity. Lightweight (Pusher,
 * not Yjs) so it drops onto any record / dashboard / kanban without
 * pulling in a CRDT.
 *
 *   <LiveCursorsLayer entityKey={`deal:${deal.id}`} />
 *
 * Position is broadcast as a percentage of the layer's bounding box so
 * remote cursors line up across viewport sizes. Throttled to ~16 fps
 * (60 ms) so a busy page doesn't saturate the channel.
 */

interface Cursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  ts: number;
}

const THROTTLE_MS = 60;
const STALE_MS = 8_000;

const PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export interface LiveCursorsLayerProps {
  entityKey: string;
  /** Hide my own cursor (mouse pointer already shows me). Default true. */
  hideOwn?: boolean;
}

export function LiveCursorsLayer({
  entityKey,
  hideOwn = true,
}: LiveCursorsLayerProps) {
  const me = useAuthStore((s) => s.user);
  const layerRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef(0);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(
    () => new Map(),
  );
  const channel = `presence-cursor-${entityKey}`;

  // Subscribe + GC stale cursors.
  useEffect(() => {
    if (!isRealtimeEnabled()) return;
    const off = subscribe<Cursor>(channel, "cursor:move", (c) => {
      if (hideOwn && me && c.id === (me.id ?? me.email)) return;
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(c.id, { ...c, ts: Date.now() });
        return next;
      });
    });
    const offBye = subscribe<{ id: string }>(channel, "cursor:bye", ({ id }) => {
      setCursors((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });
    const gc = window.setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      setCursors((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, c] of next) {
          if (c.ts < cutoff) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2_000);
    return () => {
      off();
      offBye();
      window.clearInterval(gc);
    };
  }, [channel, hideOwn, me]);

  // Broadcast my cursor while mounted.
  useEffect(() => {
    if (!isRealtimeEnabled() || !me) return;
    const id = me.id ?? me.email ?? "anon";
    const name = me.name ?? "Teammate";
    const color = hashColor(id);
    const layer = layerRef.current?.parentElement;
    if (!layer) return;

    function onMove(e: MouseEvent) {
      const now = performance.now();
      if (now - lastSentRef.current < THROTTLE_MS) return;
      lastSentRef.current = now;
      const rect = layer!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) return;
      void publishFromClient(channel, "cursor:move", {
        id,
        name,
        color,
        x,
        y,
        ts: Date.now(),
      });
    }
    layer.addEventListener("mousemove", onMove);
    return () => {
      layer.removeEventListener("mousemove", onMove);
      void publishFromClient(channel, "cursor:bye", { id });
    };
  }, [channel, me]);

  if (!isRealtimeEnabled()) return null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      {Array.from(cursors.values()).map((c) => (
        <RemoteCursor key={c.id} cursor={c} />
      ))}
    </div>
  );
}

function RemoteCursor({ cursor }: { cursor: Cursor }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${cursor.x}%`,
        top: `${cursor.y}%`,
        transform: "translate(-2px, -2px)",
        transition: "left 80ms linear, top 80ms linear",
        willChange: "left, top",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
      >
        <path
          d="M2 2 L2 14 L6 11 L9 16 L11 15 L8 10 L13 10 Z"
          fill={cursor.color}
          stroke="#fff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          top: 16,
          left: 12,
          padding: "2px 7px",
          borderRadius: 6,
          background: cursor.color,
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
        }}
      >
        {cursor.name}
      </span>
    </div>
  );
}
