"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "vyne-pwa-dismissed-at";
const RESHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Subtle banner above the bottom mobile nav prompting install when the
 * browser supports it and the user hasn't already installed or dismissed
 * recently. On desktop, sits near the top-right toolbar.
 */
export function PWAInstallBanner() {
  const { status, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastDismissAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (lastDismissAt > 0 && Date.now() - lastDismissAt < RESHOW_AFTER_MS) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      const outcome = await install();
      if (outcome === "accepted") {
        // Native flow handles the rest
      } else {
        // user declined — back off for a week
        handleDismiss();
      }
    } finally {
      setInstalling(false);
    }
  }

  // Only show when browser actually supports the prompt
  if (dismissed || status !== "available") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(72px + env(safe-area-inset-bottom, 0))",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 999,
          background: "var(--content-bg)",
          border: "1px solid rgba(108, 71, 255, 0.4)",
          boxShadow: "0 12px 32px rgba(108, 71, 255, 0.2)",
          maxWidth: 420,
          width: "calc(100vw - 32px)",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(108, 71, 255, 0.15)",
            color: "var(--vyne-accent, var(--vyne-purple))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Download size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Install VYNE as an app
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Faster open · push notifications · offline drafts
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          style={{
            padding: "6px 12px",
            borderRadius: 99,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: installing ? "default" : "pointer",
            opacity: installing ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {installing ? "Opening…" : "Install"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid var(--content-border)",
            background: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={11} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
