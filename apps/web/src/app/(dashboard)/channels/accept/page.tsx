"use client";

// External-channel accept page (UI_UPGRADE_PLAN.md 6.7).
// Recipient lands here from /channels/accept?token=<jwt>. We POST the
// token to /api/channels/accept; on success we link the channel into
// the local pinned list and route to /chat?channel={id}.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { usePinsStore } from "@/lib/stores/pins";

interface AcceptResponse {
  ok?: boolean;
  error?: string;
  channel?: {
    id: string;
    name: string;
    fromWorkspace: string;
    role: string;
  };
  expiresAt?: string;
}

export default function ChannelAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; data: AcceptResponse }
    | { kind: "error"; message: string }
  >({ kind: "loading" });
  const pin = usePinsStore((s) => s.pin);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing invite token in URL." });
      return;
    }
    let cancel = false;
    void (async () => {
      try {
        const res = await fetch("/api/channels/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as AcceptResponse;
        if (cancel) return;
        if (!res.ok || !data.ok) {
          setState({
            kind: "error",
            message: data.error ?? "Couldn't verify invite",
          });
          return;
        }
        if (data.channel) {
          pin({
            href: `/chat?channel=${encodeURIComponent(data.channel.id)}`,
            label: `#${data.channel.name}`,
            module: "chat",
            icon: "Hash",
          });
        }
        setState({ kind: "ok", data });
      } catch (err) {
        if (cancel) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [token, pin]);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "60px auto",
        padding: 24,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        textAlign: "center",
      }}
    >
      {state.kind === "loading" && (
        <>
          <Loader2
            size={32}
            className="animate-spin"
            color="var(--vyne-accent, var(--vyne-purple))"
            style={{ alignSelf: "center" }}
            aria-hidden="true"
          />
          <h1 style={{ margin: 0, fontSize: 18 }}>Verifying invite…</h1>
        </>
      )}
      {state.kind === "ok" && state.data.channel && (
        <>
          <CheckCircle2
            size={36}
            color="var(--accent-success)"
            style={{ alignSelf: "center" }}
            aria-hidden="true"
          />
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 18 }}>
              Joined #{state.data.channel.name}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              Shared from{" "}
              <strong>{state.data.channel.fromWorkspace}</strong> ·{" "}
              {state.data.channel.role}
              {state.data.expiresAt && (
                <>
                  {" "}
                  · expires{" "}
                  {new Date(state.data.expiresAt).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/chat?channel=${encodeURIComponent(state.data.channel!.id)}`,
              )
            }
            style={{
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 500,
              border: "1px solid var(--vyne-accent, var(--vyne-purple))",
              borderRadius: 8,
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <ExternalLink size={14} />
            Open channel
          </button>
        </>
      )}
      {state.kind === "error" && (
        <>
          <XCircle
            size={36}
            color="var(--accent-error)"
            style={{ alignSelf: "center" }}
            aria-hidden="true"
          />
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 18 }}>
              Invite failed
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {state.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/channels")}
            style={{
              alignSelf: "center",
              padding: "6px 14px",
              fontSize: 13,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Browse channels
          </button>
        </>
      )}
    </div>
  );
}
