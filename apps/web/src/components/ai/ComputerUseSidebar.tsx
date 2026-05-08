"use client";

// Computer-use sidebar (UI_UPGRADE_PLAN.md 5.5).
//
// Lets the user dispatch a high-level task (e.g. "Open Stripe and find
// the failed charge from last Friday") to a sandboxed browser driven
// by Anthropic computer-use + Browserbase. The component shows live
// screenshots + an action log as the agent works; failures surface
// inline with a Retry button.
//
// Without the right env vars, the panel renders a "configure these to
// enable" state with the exact keys missing.

import { useEffect, useState } from "react";
import {
  Cpu,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ProviderStatus {
  ok: boolean;
  missing: string[];
  configured: {
    anthropic: boolean;
    browserbase: boolean;
    e2b: boolean;
  };
}

interface ActionLogEntry {
  type: "action" | "screenshot" | "result" | "error";
  text?: string;
  imageUrl?: string;
  ts: string;
}

export function ComputerUseSidebar() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<ActionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/computer-use", { cache: "no-store" })
      .then((r) => r.json() as Promise<ProviderStatus>)
      .then(setStatus)
      .catch(() =>
        setStatus({
          ok: false,
          missing: ["ANTHROPIC_API_KEY", "BROWSERBASE_API_KEY"],
          configured: { anthropic: false, browserbase: false, e2b: false },
        }),
      );
  }, []);

  async function run() {
    if (!task.trim() || running) return;
    setRunning(true);
    setError(null);
    setLog([
      {
        type: "action",
        text: `Starting task: ${task.trim()}`,
        ts: new Date().toISOString(),
      },
    ]);
    try {
      const res = await fetch("/api/ai/computer-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        missing?: string[];
        hint?: string;
        actions?: ActionLogEntry[];
        result?: string;
      };
      if (!res.ok || !data.ok) {
        setError(
          data.hint ??
            data.error ??
            (data.missing
              ? `Missing env vars: ${data.missing.join(", ")}`
              : "Driver returned an error"),
        );
        setLog((l) => [
          ...l,
          {
            type: "error",
            text: data.error ?? "Failed",
            ts: new Date().toISOString(),
          },
        ]);
      } else {
        if (data.actions) {
          setLog((l) => [...l, ...data.actions!]);
        }
        if (data.result) {
          setLog((l) => [
            ...l,
            {
              type: "result",
              text: data.result!,
              ts: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      aria-labelledby="computer-use-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Cpu size={16} aria-hidden="true" />
        <h2 id="computer-use-heading" style={{ margin: 0, fontSize: 16 }}>
          Computer use
        </h2>
        {status && (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: status.ok
                ? "var(--accent-success)"
                : "var(--text-tertiary)",
            }}
          >
            {status.ok ? (
              <>
                <CheckCircle2 size={12} /> Configured
              </>
            ) : (
              <>
                <XCircle size={12} /> Not configured
              </>
            )}
          </span>
        )}
      </header>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
        Hand the AI a high-level task and watch it click through a
        sandboxed browser. Powered by Anthropic computer-use +
        Browserbase (or E2B). Demo deploys see the configuration
        panel; set the env vars below to enable live runs.
      </p>

      {/* Provider status */}
      {status && !status.ok && (
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
              Set these env vars in Vercel
            </strong>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {status.missing.map((m) => (
                <li key={m}>
                  <code style={{ fontSize: 11 }}>{m}</code>
                </li>
              ))}
            </ul>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Get Anthropic keys at console.anthropic.com; Browserbase at
              browserbase.com (free tier covers eval). Once set, redeploy
              and refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Task input */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 8,
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          background: "var(--content-bg)",
        }}
      >
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. Open Stripe and find the failed charge from last Friday"
          rows={2}
          disabled={running || !status?.ok}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            resize: "vertical",
            minHeight: 38,
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={!task.trim() || running || !status?.ok}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background:
              status?.ok && task.trim() && !running
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--content-elevated)",
            color: status?.ok && task.trim() && !running ? "#fff" : "var(--text-tertiary)",
            cursor:
              status?.ok && task.trim() && !running ? "pointer" : "not-allowed",
            opacity: status?.ok && task.trim() && !running ? 1 : 0.6,
          }}
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? "Running" : "Run"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 8,
            background: "var(--accent-error-soft)",
            border: "1px solid var(--accent-error)",
            borderRadius: 6,
            color: "var(--accent-error)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Action log */}
      {log.length > 0 && (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {log.map((entry, i) => (
            <li
              key={i}
              style={{
                padding: "6px 10px",
                background: "var(--content-elevated)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
                fontSize: 12,
                color:
                  entry.type === "error"
                    ? "var(--accent-error)"
                    : entry.type === "result"
                      ? "var(--accent-success)"
                      : "var(--text-primary)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace, monospace)",
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  marginRight: 6,
                }}
              >
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
              {entry.text}
              {entry.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.imageUrl}
                  alt="screenshot"
                  style={{
                    display: "block",
                    marginTop: 6,
                    maxWidth: "100%",
                    borderRadius: 4,
                    border: "1px solid var(--content-border)",
                  }}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
