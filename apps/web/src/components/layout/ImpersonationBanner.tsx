"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";

// Tenant impersonation banner. The admin sets `vyne-impersonating` in
// localStorage when switching into another org/user from /admin → exit
// returns the banner to "Stop impersonating" → clears the key → reloads.
//
// Until the admin impersonation flow is wired server-side, this banner
// also reacts to a custom event `vyne:impersonation-start` so other
// admin code paths can flip it on without touching localStorage.

interface ImpersonationState {
  asUserId?: string;
  asEmail?: string;
  asOrgId?: string;
  startedAt?: string;
}

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function read() {
      try {
        const raw = localStorage.getItem("vyne-impersonating");
        if (!raw) {
          setState(null);
          return;
        }
        setState(JSON.parse(raw) as ImpersonationState);
      } catch {
        setState(null);
      }
    }
    read();
    function onCustom(e: Event) {
      const detail = (e as CustomEvent<ImpersonationState>).detail;
      if (detail) {
        setState(detail);
        try {
          localStorage.setItem("vyne-impersonating", JSON.stringify(detail));
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("storage", read);
    window.addEventListener("vyne:impersonation-start", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("vyne:impersonation-start", onCustom as EventListener);
    };
  }, []);

  function stop() {
    try {
      localStorage.removeItem("vyne-impersonating");
    } catch {
      /* ignore */
    }
    setState(null);
    window.dispatchEvent(new CustomEvent("vyne:impersonation-stop"));
    // Reload so server-rendered surfaces re-fetch as the original user.
    window.location.reload();
  }

  if (!state) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        background: "linear-gradient(90deg, #b91c1c, #ea580c)",
        color: "#fff",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <ShieldAlert size={14} />
      <span>
        Impersonating
        {state.asEmail ? (
          <>
            {" "}
            <strong>{state.asEmail}</strong>
          </>
        ) : null}
        {state.asOrgId ? <> in org <strong>{state.asOrgId}</strong></> : null}
        . All actions are logged.
      </span>
      <button
        type="button"
        onClick={stop}
        aria-label="Stop impersonating"
        style={{
          marginLeft: "auto",
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "#fff",
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <X size={12} /> Stop
      </button>
    </div>
  );
}
