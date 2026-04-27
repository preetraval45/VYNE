"use client";

import { useCallback, useEffect, useState } from "react";

type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

const PERMISSION_ASKED_KEY = "vyne-notifications-asked";
const ENABLED_KEY = "vyne-notifications-enabled";

interface NotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  /** Click target — defaults to /home */
  url?: string;
  /** Vibration pattern (mobile only) */
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Browser notifications helper.
 *
 * - useNotifications() returns the current permission status, an enabled
 *   toggle (persisted to localStorage), an `ask()` to request permission,
 *   and a `notify()` to fire a notification (only fires when permission
 *   AND the user-controlled toggle are both truthy).
 *
 * - The toggle exists so the user can mute notifications without revoking
 *   browser permission entirely.
 */
export function useNotifications() {
  const [status, setStatus] = useState<PermissionStatus>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PermissionStatus);
    const stored = localStorage.getItem(ENABLED_KEY);
    setEnabled(stored === "true");
  }, []);

  const ask = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported" as const;
    }
    try {
      localStorage.setItem(PERMISSION_ASKED_KEY, "true");
    } catch {
      /* ignore */
    }
    if (Notification.permission === "granted") {
      setStatus("granted");
      setEnabled(true);
      try {
        localStorage.setItem(ENABLED_KEY, "true");
      } catch {
        /* ignore */
      }
      return "granted" as const;
    }
    const result = await Notification.requestPermission();
    setStatus(result as PermissionStatus);
    if (result === "granted") {
      setEnabled(true);
      try {
        localStorage.setItem(ENABLED_KEY, "true");
      } catch {
        /* ignore */
      }
    }
    return result;
  }, []);

  const setEnabledPersist = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      localStorage.setItem(ENABLED_KEY, next ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  const notify = useCallback(
    (title: string, opts: NotificationOptions) => {
      if (typeof window === "undefined") return null;
      if (!("Notification" in window)) return null;
      if (Notification.permission !== "granted") return null;
      const stored = localStorage.getItem(ENABLED_KEY);
      if (stored !== "true") return null;
      // Don't notify when the tab is already focused — annoying.
      if (document.visibilityState === "visible") return null;
      try {
        const n = new Notification(title, {
          body: opts.body,
          icon: opts.icon ?? "/icon-192.png",
          tag: opts.tag,
          silent: opts.silent,
        });
        n.onclick = () => {
          window.focus();
          if (opts.url) window.location.href = opts.url;
          n.close();
        };
        return n;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    status,
    enabled,
    setEnabled: setEnabledPersist,
    ask,
    notify,
  };
}

/** Module-level helper so non-hook code (Zustand stores) can fire notifications. */
export function fireNotification(
  title: string,
  body: string,
  opts: { tag?: string; url?: string; icon?: string; silent?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (localStorage.getItem(ENABLED_KEY) !== "true") return;
  if (document.visibilityState === "visible") return;
  try {
    const n = new Notification(title, {
      body,
      icon: opts.icon ?? "/icon-192.png",
      tag: opts.tag,
      silent: opts.silent,
    });
    n.onclick = () => {
      window.focus();
      if (opts.url) window.location.href = opts.url;
      n.close();
    };
  } catch {
    /* swallow */
  }
}
