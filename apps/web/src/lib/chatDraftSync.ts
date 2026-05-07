"use client";

import {
  subscribe,
  publishFromClient,
  isRealtimeEnabled,
} from "@/lib/realtime";

/**
 * Cross-device draft sync (28.1.10).
 *
 *   syncDraft(channelId, draftText, meId);   // call on every change
 *   const off = onDraftFromOtherDevice(channelId, meId, (text) => …);
 *
 * `useChatDrafts` already persists per-channel drafts to localStorage
 * on the originating device. This helper mirrors them over Pusher to
 * a private per-user channel so a draft typed on phone reappears on
 * desktop within ~1 s. Throttled (default 500 ms) so a fast typist
 * doesn't saturate the realtime layer.
 *
 * Echo-suppression: every payload carries `originDeviceId`; the
 * subscriber ignores its own echoes. The receiver hands the text
 * back via the handler so the host's draft store can apply it
 * without taking a dependency on this module.
 */

const TYPING_THROTTLE_MS = 500;

const lastSentRef: Map<string, number> = new Map();

let _deviceId: string | null = null;
function deviceId(): string {
  if (_deviceId) return _deviceId;
  if (typeof window === "undefined") return "ssr";
  const KEY = "vyne-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
  }
  _deviceId = id;
  return id;
}

function channelName(meId: string): string {
  return `presence-drafts-${meId}`;
}

interface DraftPayload {
  channelId: string;
  text: string;
  ts: string;
  originDeviceId: string;
}

/**
 * Push the latest draft text to the user's private realtime channel.
 * Throttled per channelId so a fast typist doesn't fan-out 60 events
 * a second.
 */
export function syncDraft(channelId: string, text: string, meId: string): void {
  if (!isRealtimeEnabled() || !meId) return;
  const now = performance.now();
  const last = lastSentRef.get(channelId) ?? 0;
  if (now - last < TYPING_THROTTLE_MS) return;
  lastSentRef.set(channelId, now);
  void publishFromClient(channelName(meId), "draft:update", {
    channelId,
    text,
    ts: new Date().toISOString(),
    originDeviceId: deviceId(),
  });
}

/**
 * Subscribe to draft pushes for the active user. Calls `handler`
 * whenever the OTHER device updates the draft for the watched
 * `channelId` (echoes from this device are filtered out).
 *
 * Returns an unsubscribe fn.
 */
export function onDraftFromOtherDevice(
  channelId: string,
  meId: string,
  handler: (text: string, ts: string) => void,
): () => void {
  if (!isRealtimeEnabled() || !meId) return () => {};
  const myDevice = deviceId();
  return subscribe<DraftPayload>(
    channelName(meId),
    "draft:update",
    (payload) => {
      if (payload.channelId !== channelId) return;
      if (payload.originDeviceId === myDevice) return;
      handler(payload.text, payload.ts);
    },
  );
}

/** For tests / edge cases: force-flush the next sync regardless of throttle. */
export function resetDraftThrottle(channelId?: string): void {
  if (!channelId) {
    lastSentRef.clear();
  } else {
    lastSentRef.delete(channelId);
  }
}
