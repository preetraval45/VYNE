"use client";

import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import {
  offlineQueue,
  onOfflineQueueChange,
} from "@/lib/offlineQueue";
import toast from "react-hot-toast";

/**
 * OfflineBanner — fixed bottom-of-screen banner that reads:
 *
 *   "You're offline · 3 changes queued"   when offline + items in queue
 *   "You're offline"                       when offline + queue empty
 *   (hidden)                                when online + queue empty
 *
 * On reconnect we automatically flush the queue and pop a success toast
 * with the count of replays. If a flush leaves items behind (server
 * still rejecting) the banner stays visible with the unflushed count.
 *
 * Renders once at the dashboard root — no per-page wiring needed.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof window === "undefined" ? true : navigator.onLine,
  );
  const [queueSize, setQueueSize] = useState(0);
  const [flushing, setFlushing] = useState(false);

  // Refresh the queue size from IndexedDB.
  const refresh = useCallback(async () => {
    const n = await offlineQueue.size();
    setQueueSize(n);
  }, []);

  // Wire online/offline events + queue-change broadcasts. Mirror the
  // online state onto `body[data-offline]` so CSS rules (e.g. lifting
  // the FAB above the offline banner on mobile) can react without each
  // component re-implementing the listener.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function syncBodyAttr(on: boolean) {
      document.body.dataset.offline = on ? "true" : "false";
    }
    function up() {
      setOnline(true);
      syncBodyAttr(false);
      void onComeBackOnline();
    }
    function down() {
      setOnline(false);
      syncBodyAttr(true);
    }
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const offChange = onOfflineQueueChange(() => {
      void refresh();
    });
    syncBodyAttr(!navigator.onLine);
    void refresh();
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      offChange();
    };
    // refresh is stable
  }, [refresh]);

  // Flush automatically when the user comes back online.
  const onComeBackOnline = useCallback(async () => {
    const initial = await offlineQueue.size();
    if (initial === 0) return;
    setFlushing(true);
    const result = await offlineQueue.flush();
    setFlushing(false);
    if (result.ok > 0) {
      toast.success(
        `Synced ${result.ok} pending change${result.ok === 1 ? "" : "s"}`,
      );
    }
    if (result.failed > 0) {
      toast.error("Some changes couldn't sync — will retry.");
    }
    void refresh();
  }, [refresh]);

  // Manual retry button.
  const retry = useCallback(async () => {
    setFlushing(true);
    const result = await offlineQueue.flush();
    setFlushing(false);
    if (result.ok > 0)
      toast.success(`Synced ${result.ok} change${result.ok === 1 ? "" : "s"}`);
    void refresh();
  }, [refresh]);

  if (online && queueSize === 0) return null;

  const message = online
    ? `${queueSize} change${queueSize === 1 ? "" : "s"} queued`
    : queueSize > 0
      ? `You're offline · ${queueSize} change${queueSize === 1 ? "" : "s"} queued`
      : "You're offline";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        // Sit above the mobile bottom nav (60px) + safe-area on phones.
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 78,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 999,
        background: online
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.95)"
          : "rgba(15, 23, 42, 0.95)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <WifiOff size={14} aria-hidden />
      <span>{message}</span>
      {online && queueSize > 0 && (
        <button
          type="button"
          onClick={retry}
          disabled={flushing}
          aria-label="Retry sync"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.16)",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: flushing ? "default" : "pointer",
            opacity: flushing ? 0.7 : 1,
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: flushing ? "vyne-spin 700ms linear infinite" : undefined,
            }}
          />
          {flushing ? "Syncing…" : "Retry"}
        </button>
      )}
    </div>
  );
}
