"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type PWAInstallStatus =
  | "unsupported" // Browser does not support the install prompt (Safari, in-app browsers)
  | "available" // beforeinstallprompt fired — install can be triggered now
  | "installed" // App is already installed and running standalone
  | "pending"; // Browser may show prompt later but hasn't yet

export function usePWAInstall(): {
  status: PWAInstallStatus;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
} {
  const [status, setStatus] = useState<PWAInstallStatus>("pending");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed?
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS legacy
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setStatus("installed");
      return;
    }

    // Register service worker (idempotent — Chrome dedupes).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — install prompt may still fire without SW on some browsers.
      });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setStatus("available");
    };
    const onInstalled = () => {
      setStatus("installed");
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Detect Safari / browsers that never fire beforeinstallprompt.
    // After 2.5s with no event, surface a fallback install path.
    const t = setTimeout(() => {
      setStatus((curr) => (curr === "pending" ? "unsupported" : curr));
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") setStatus("installed");
    else setStatus("available");
    return choice.outcome;
  }, [deferred]);

  return { status, install };
}
