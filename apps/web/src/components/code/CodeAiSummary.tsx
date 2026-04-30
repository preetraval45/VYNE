"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface Deploy {
  serviceName: string;
  environment: string;
  status: string;
  triggeredBy: string;
  commitMessage: string | null;
  startedAt: string;
}

interface Pr {
  title: string;
  state: string;
  authorName?: string | null;
}

interface Props {
  deploys: Deploy[];
  prs: Pr[];
}

/**
 * AI-generated 24h synthesis of code activity. Pulls the recent deploy
 * + PR list into a tight prose paragraph so the user gets a "what
 * shipped, what slipped, what's next" view without scanning tables.
 *
 * Cached per-day in localStorage so it doesn't hit the model on every
 * page load. Falls back to a deterministic local summary when no AI
 * key is configured.
 */
export function CodeAiSummary({ deploys, prs }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deploys.length === 0) return;
    const key = `vyne-code-ai-summary:${new Date().toISOString().slice(0, 10)}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setText(cached);
        return;
      }
    } catch {
      // ignore
    }
    setLoading(true);

    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const recent = deploys
      .filter((d) => new Date(d.startedAt).getTime() >= dayAgo)
      .slice(0, 12);
    const open = prs.filter((p) => p.state === "open").slice(0, 6);
    const merged = prs.filter((p) => p.state === "merged").slice(0, 6);

    const ctx = {
      summary: `Recent code activity for the workspace.`,
      deploys: recent,
      openPRs: open,
      mergedPRs: merged,
    };

    fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question:
          "Write a 2-3 sentence engineering recap of the last 24 hours of activity using only the data in CONTEXT. Lead with what shipped, then what's at risk (failed deploys / blocking PRs), then a one-line next step. Tight, no marketing language. No headers, no bullets, just prose.",
        context: ctx,
      }),
    })
      .then((r) => r.json() as Promise<{ answer?: string }>)
      .then((b) => {
        const ans = (b.answer ?? "").trim();
        if (ans) {
          setText(ans);
          try {
            localStorage.setItem(key, ans);
          } catch {
            // ignore
          }
        } else {
          setText(localFallback(recent, open, merged));
        }
      })
      .catch(() => setText(localFallback(recent, open, merged)))
      .finally(() => setLoading(false));
  }, [deploys, prs]);

  if (deploys.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        marginBottom: 16,
        borderRadius: 12,
        border: "1px solid var(--vyne-accent-ring, rgba(91,91,214,0.25))",
        background: "var(--vyne-accent-soft, rgba(91,91,214,0.06))",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--vyne-accent, #5B5BD6)",
          color: "#fff",
        }}
      >
        <Sparkles size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--vyne-accent-deep, #1d4ed8)",
            marginBottom: 4,
          }}
        >
          Vyne AI · last 24h
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text-primary)",
          }}
        >
          {loading ? "Synthesising recent deploys + PRs…" : text ?? ""}
        </p>
      </div>
    </div>
  );
}

function localFallback(deploys: Deploy[], open: Pr[], merged: Pr[]): string {
  const ok = deploys.filter((d) => d.status === "success");
  const failed = deploys.filter((d) => d.status === "failed");
  const inFlight = deploys.filter((d) => d.status === "in_progress");
  const parts: string[] = [];
  if (ok.length) {
    parts.push(`${ok.length} deploy${ok.length === 1 ? "" : "s"} shipped successfully`);
  }
  if (failed.length) {
    parts.push(
      `${failed.length} failed (${failed
        .slice(0, 2)
        .map((f) => f.serviceName)
        .join(", ")})`,
    );
  }
  if (inFlight.length) {
    parts.push(`${inFlight.length} in flight`);
  }
  if (merged.length) {
    parts.push(`${merged.length} PR${merged.length === 1 ? "" : "s"} merged`);
  }
  if (open.length) {
    parts.push(`${open.length} open`);
  }
  if (parts.length === 0) return "No recent activity to summarise.";
  return `${parts.join(", ")}.`;
}
