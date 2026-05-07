"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe, publishFromClient, isRealtimeEnabled } from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * useTypingIndicator — broadcast a "typing" event over Pusher and
 * surface other users currently typing in the same scope.
 *
 *   const { typers, onChange, onSubmit } = useTypingIndicator(`thread:${id}`);
 *   <input onChange={(e) => { onChange(); … }} onKeyDown={(e) => e.key === "Enter" && onSubmit()} />
 *
 * Behaviour:
 *   - Calling onChange publishes `typing:start` (debounced — at most once
 *     per HEARTBEAT_MS window).
 *   - Stops broadcasting after IDLE_MS without another onChange call
 *     (publishes `typing:stop`).
 *   - onSubmit publishes `typing:stop` immediately so the indicator
 *     drops the moment the user hits send.
 *   - Remote typers idle ≥ STALE_MS auto-drop client-side.
 */

export interface Typer {
  id: string;
  name: string;
}

const HEARTBEAT_MS = 1_500;
const IDLE_MS = 3_500;
const STALE_MS = 6_000;

export function useTypingIndicator(scopeKey: string | null | undefined) {
  const me = useAuthStore((s) => s.user);
  const [typers, setTypers] = useState<Map<string, Typer & { ts: number }>>(
    () => new Map(),
  );
  const lastSentRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const channel = scopeKey ? `presence-typing-${scopeKey}` : null;

  useEffect(() => {
    if (!channel || !isRealtimeEnabled()) return;
    const offStart = subscribe<Typer>(channel, "typing:start", (t) => {
      if (me && (t.id === me.id || t.id === me.email)) return;
      setTypers((prev) => {
        const next = new Map(prev);
        next.set(t.id, { ...t, ts: Date.now() });
        return next;
      });
    });
    const offStop = subscribe<{ id: string }>(channel, "typing:stop", ({ id }) => {
      setTypers((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    });
    const gc = window.setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      setTypers((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, t] of next) {
          if (t.ts < cutoff) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2_000);
    return () => {
      offStart();
      offStop();
      window.clearInterval(gc);
    };
  }, [channel, me]);

  const stopBroadcast = useCallback(() => {
    if (!channel || !isRealtimeEnabled() || !me) return;
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    void publishFromClient(channel, "typing:stop", {
      id: me.id ?? me.email ?? "anon",
    });
  }, [channel, me]);

  const onChange = useCallback(() => {
    if (!channel || !isRealtimeEnabled() || !me) return;
    const now = performance.now();
    if (now - lastSentRef.current >= HEARTBEAT_MS) {
      lastSentRef.current = now;
      isTypingRef.current = true;
      void publishFromClient(channel, "typing:start", {
        id: me.id ?? me.email ?? "anon",
        name: me.name ?? "Teammate",
      });
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopBroadcast, IDLE_MS);
  }, [channel, me, stopBroadcast]);

  const onSubmit = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    stopBroadcast();
  }, [stopBroadcast]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      stopBroadcast();
    };
  }, [stopBroadcast]);

  return {
    typers: Array.from(typers.values()) as Typer[],
    onChange,
    onSubmit,
  };
}
