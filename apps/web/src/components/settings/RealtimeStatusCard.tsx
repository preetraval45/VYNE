"use client";

// Realtime status + sanity-check (UI_UPGRADE_PLAN.md 4.1).
//
// Shows the active provider (Pusher or Supabase), whether the env vars
// are configured, and a "Send test event" button that publishes to a
// dedicated `private-realtime-test` channel and listens for the echo.
// If the round-trip lands, two-tab realtime is verified working — no
// more env-var spelunking + opening two tabs of CRM to test.

import { useEffect, useState } from "react";
import {
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  isRealtimeEnabled,
  publishFromClient,
  realtimeProvider,
  subscribe,
} from "@/lib/realtime/index";

type Status = "idle" | "sending" | "received" | "timeout" | "failed";

export function RealtimeStatusCard() {
  const [provider, setProvider] = useState<"pusher" | "supabase" | "sse">(
    "pusher",
  );
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [echo, setEcho] = useState<string | null>(null);

  useEffect(() => {
    setProvider(realtimeProvider());
    // Re-poll once after mount so the dispatcher's async Supabase
    // load has a chance to finish.
    setEnabled(isRealtimeEnabled());
    const t = setTimeout(() => setEnabled(isRealtimeEnabled()), 400);
    return () => clearTimeout(t);
  }, []);

  async function ping() {
    if (!enabled) return;
    setStatus("sending");
    setLatency(null);
    setEcho(null);
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sentAt = performance.now();

    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    unsub = subscribe<{ nonce: string; sentAt: number; from: string }>(
      "private-realtime-test",
      "ping",
      (data) => {
        if (!data || data.nonce !== nonce) return;
        const ms = Math.round(performance.now() - sentAt);
        setLatency(ms);
        setEcho(data.from || "self");
        setStatus("received");
        if (unsub) unsub();
        if (timer) clearTimeout(timer);
      },
    );

    timer = setTimeout(() => {
      setStatus("timeout");
      if (unsub) unsub();
    }, 5000);

    const ok = await publishFromClient("private-realtime-test", "ping", {
      nonce,
      sentAt,
      from: typeof window !== "undefined" ? window.location.host : "?",
    });
    if (!ok) {
      setStatus("failed");
      if (unsub) unsub();
      if (timer) clearTimeout(timer);
    }
  }

  return (
    <section
      aria-labelledby="realtime-status-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Radio size={16} aria-hidden="true" />
        <h2 id="realtime-status-heading" style={{ margin: 0, fontSize: 16 }}>
          Realtime
        </h2>
      </header>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
        Live cross-tab + cross-device sync for CRM, contacts, invoices,
        products, projects, tasks, finance, notifications, comments, presence,
        cursors, and reactions. The provider is chosen at build time via{" "}
        <code>NEXT_PUBLIC_REALTIME_PROVIDER</code>.
      </p>

      {/* Provider + status row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          padding: 12,
          background: "var(--content-elevated)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--text-secondary)" }}>Provider</span>
        <strong style={{ textTransform: "capitalize" }}>{provider}</strong>

        <span style={{ color: "var(--text-secondary)" }}>Configured</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: enabled ? "var(--accent-success)" : "var(--accent-error)",
          }}
        >
          {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {enabled ? "Yes" : "No"}
        </span>

        {status === "received" && latency !== null && (
          <>
            <span style={{ color: "var(--text-secondary)" }}>
              Round-trip latency
            </span>
            <strong>{latency} ms</strong>
          </>
        )}
        {status === "timeout" && (
          <>
            <span style={{ color: "var(--text-secondary)" }}>Round-trip</span>
            <span style={{ color: "var(--accent-error)" }}>
              Timed out after 5s
            </span>
          </>
        )}
        {status === "failed" && (
          <>
            <span style={{ color: "var(--text-secondary)" }}>Round-trip</span>
            <span style={{ color: "var(--accent-error)" }}>Publish failed</span>
          </>
        )}
        {echo && (
          <>
            <span style={{ color: "var(--text-secondary)" }}>Echo from</span>
            <code style={{ fontSize: 12 }}>{echo}</code>
          </>
        )}
      </div>

      {/* Ping button */}
      <button
        type="button"
        onClick={ping}
        disabled={!enabled || status === "sending"}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
          border: "1px solid var(--vyne-accent, var(--vyne-purple))",
          borderRadius: 6,
          background: enabled
            ? "var(--vyne-accent, var(--vyne-purple))"
            : "var(--content-bg)",
          color: enabled ? "#fff" : "var(--text-tertiary)",
          cursor: enabled && status !== "sending" ? "pointer" : "not-allowed",
          opacity: enabled ? 1 : 0.5,
        }}
      >
        {status === "sending" ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Radio size={13} />
        )}
        {status === "sending" ? "Pinging…" : "Send test event"}
      </button>

      {!enabled && (
        <div
          role="note"
          style={{
            display: "flex",
            gap: 8,
            padding: 12,
            background: "rgba(245, 158, 11, 0.10)",
            border: "1px solid rgba(245, 158, 11, 0.40)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          <AlertCircle
            size={14}
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>
              Realtime not configured
            </strong>
            {provider === "pusher" ? (
              <span>
                Set <code>NEXT_PUBLIC_PUSHER_KEY</code>,{" "}
                <code>PUSHER_APP_ID</code>, <code>PUSHER_KEY</code>,{" "}
                <code>PUSHER_SECRET</code>, and <code>PUSHER_CLUSTER</code> in
                Vercel project settings, then redeploy. The bind helpers no-op
                silently without these so demo workspaces keep working.
              </span>
            ) : (
              <span>
                Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel, then
                redeploy.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
