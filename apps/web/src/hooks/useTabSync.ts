"use client";

import { useEffect } from "react";
import { useSentMessagesStore } from "@/lib/stores/sentMessages";
import { useUnreadStore } from "@/lib/stores/unread";

/**
 * Cross-tab sync. When the user sends/edits/deletes a message OR marks a
 * channel as read in one tab, the other tabs hydrate the change instantly.
 *
 * Implementation: listens to the browser's `storage` event (fires in all
 * OTHER tabs when localStorage mutates) and re-runs Zustand's persist
 * rehydrate so the store snaps to the new state. Belt-and-suspenders adds
 * a BroadcastChannel for near-instant fallback when storage events lag.
 */
const TAB_CHANNEL_NAME = "vyne-tab-sync";

let bc: BroadcastChannel | null = null;
function getBC(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (bc) return bc;
  bc = new BroadcastChannel(TAB_CHANNEL_NAME);
  return bc;
}

const STORE_KEYS_TO_SYNC = [
  "vyne-sent-messages",
  "vyne-unread",
  "vyne-saved-messages",
  "vyne-pomodoro",
  "vyne-calendar",
];

function rehydrateStore(key: string) {
  if (key === "vyne-sent-messages") {
    void useSentMessagesStore.persist.rehydrate();
  } else if (key === "vyne-unread") {
    void useUnreadStore.persist.rehydrate();
  }
  // Other stores rehydrate on next render naturally; the storage event
  // above is enough for the chat-critical ones.
}

export function broadcastTabUpdate(storeKey: string) {
  const channel = getBC();
  if (!channel) return;
  try {
    channel.postMessage({ type: "rehydrate", key: storeKey });
  } catch {
    /* ignore */
  }
}

/**
 * Mount once at the dashboard layout. Subscribes to storage + BroadcastChannel
 * events and rehydrates relevant stores when they fire.
 */
export function useTabSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (STORE_KEYS_TO_SYNC.includes(e.key)) {
        rehydrateStore(e.key);
      }
    }

    const channel = getBC();
    function onChannelMessage(e: MessageEvent) {
      if (e.data?.type === "rehydrate" && e.data?.key) {
        rehydrateStore(e.data.key);
      }
    }

    window.addEventListener("storage", onStorage);
    channel?.addEventListener("message", onChannelMessage);

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.removeEventListener("message", onChannelMessage);
    };
  }, []);
}
