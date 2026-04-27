import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface NormalizedEvent {
  source: "github";
  kind:
    | "deploy"
    | "pr_merged"
    | "pr_opened"
    | "push"
    | "issue_created"
    | "issue_resolved"
    | "release"
    | "comment"
    | "other";
  title: string;
  detail?: string;
  actor?: string;
  timestamp: string;
  url?: string;
  rawType: string;
}

/**
 * Receives GitHub webhook deliveries (push, PR, deployment_status, etc.)
 * and normalizes them into VYNE timeline events.
 *
 * Setup in GitHub repo → Settings → Webhooks:
 *   Payload URL: https://your-vyne-deploy.vercel.app/api/integrations/github/webhook
 *   Content type: application/json
 *   Secret: set GITHUB_WEBHOOK_SECRET in Vercel env (this route validates it)
 *   Events: push, pull_request, deployment_status, issues, release, issue_comment
 *
 * Browser-side: timeline page polls /api/integrations/github/recent to
 * pull the last N events and merge into useTimelineStore.
 */

// Edge-runtime in-memory FIFO buffer. Vercel Edge regions are ephemeral
// so this is best-effort — for durable storage swap to Upstash Redis or
// Vercel KV. The browser store also persists to localStorage as a
// secondary cache.
const RECENT_BUFFER: Array<NormalizedEvent & { id: string; receivedAt: string }> =
  [];
const BUFFER_CAP = 200;

function pushToBuffer(evt: NormalizedEvent) {
  RECENT_BUFFER.push({
    ...evt,
    id: `gh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
  });
  while (RECENT_BUFFER.length > BUFFER_CAP) RECENT_BUFFER.shift();
}

async function verifyHmac(
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const sigBytes = new Uint8Array(sigBuf);
  const hex = Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  const body = await req.text();
  const event = req.headers.get("x-github-event") ?? "other";
  const sig = req.headers.get("x-hub-signature-256");
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret) {
    const ok = await verifyHmac(body, sig, secret);
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }
  // No secret configured — accept anyway in demo mode but log a warning.
  // (Vercel logs only — not surfaced to client.)

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const normalized = normalize(event, payload);
  if (normalized) {
    pushToBuffer(normalized);
  }
  return NextResponse.json({ ok: true, event });
}

export async function GET() {
  // Pull recent buffered events for the timeline page
  return NextResponse.json({
    events: RECENT_BUFFER.slice(-100),
  });
}

// ── Event normalizers ────────────────────────────────────────────

function normalize(
  event: string,
  payload: Record<string, unknown>,
): NormalizedEvent | null {
  const repo = (payload.repository as { full_name?: string })?.full_name ?? "";
  const sender = (payload.sender as { login?: string })?.login ?? "github";

  switch (event) {
    case "push": {
      const ref = String(payload.ref ?? "").replace("refs/heads/", "");
      const commits = (payload.commits as Array<{ message?: string }>) ?? [];
      const head = commits[commits.length - 1]?.message?.split("\n")[0] ?? "";
      return {
        source: "github",
        kind: "push",
        title: `${commits.length} commit${commits.length === 1 ? "" : "s"} pushed to ${ref}`,
        detail: head ? `${sender}: ${head.slice(0, 120)}` : sender,
        actor: sender,
        timestamp: new Date().toISOString(),
        url: (payload.compare as string) ?? undefined,
        rawType: "push",
      };
    }
    case "pull_request": {
      const action = String(payload.action ?? "");
      const pr = (payload.pull_request as {
        number?: number;
        title?: string;
        html_url?: string;
        merged?: boolean;
        additions?: number;
        deletions?: number;
      }) ?? {};
      if (action === "opened") {
        return {
          source: "github",
          kind: "pr_opened",
          title: `PR #${pr.number} opened — ${pr.title ?? ""}`,
          detail: `${repo} · by ${sender}`,
          actor: sender,
          timestamp: new Date().toISOString(),
          url: pr.html_url,
          rawType: "pull_request.opened",
        };
      }
      if (action === "closed" && pr.merged) {
        return {
          source: "github",
          kind: "pr_merged",
          title: `PR #${pr.number} merged — ${pr.title ?? ""}`,
          detail: `+${pr.additions ?? 0} −${pr.deletions ?? 0} · ${sender}`,
          actor: sender,
          timestamp: new Date().toISOString(),
          url: pr.html_url,
          rawType: "pull_request.merged",
        };
      }
      return null;
    }
    case "deployment_status": {
      const deploy = (payload.deployment as {
        environment?: string;
        ref?: string;
      }) ?? {};
      const status = (payload.deployment_status as { state?: string })?.state;
      return {
        source: "github",
        kind: "deploy",
        title: `${deploy.ref ?? "deployment"} → ${deploy.environment ?? "env"} · ${status}`,
        detail: `${repo} · by ${sender}`,
        actor: sender,
        timestamp: new Date().toISOString(),
        rawType: "deployment_status",
      };
    }
    case "issues": {
      const action = String(payload.action ?? "");
      const issue = (payload.issue as {
        number?: number;
        title?: string;
        html_url?: string;
      }) ?? {};
      if (action === "opened") {
        return {
          source: "github",
          kind: "issue_created",
          title: `Issue #${issue.number} — ${issue.title ?? ""}`,
          detail: `${repo} · by ${sender}`,
          actor: sender,
          timestamp: new Date().toISOString(),
          url: issue.html_url,
          rawType: "issues.opened",
        };
      }
      if (action === "closed") {
        return {
          source: "github",
          kind: "issue_resolved",
          title: `Issue #${issue.number} closed`,
          detail: issue.title,
          actor: sender,
          timestamp: new Date().toISOString(),
          url: issue.html_url,
          rawType: "issues.closed",
        };
      }
      return null;
    }
    case "release": {
      const release = (payload.release as {
        tag_name?: string;
        name?: string;
        html_url?: string;
      }) ?? {};
      return {
        source: "github",
        kind: "release",
        title: `Release ${release.tag_name ?? ""} — ${release.name ?? ""}`,
        detail: repo,
        actor: sender,
        timestamp: new Date().toISOString(),
        url: release.html_url,
        rawType: "release",
      };
    }
    case "issue_comment": {
      const comment = (payload.comment as {
        body?: string;
        html_url?: string;
      }) ?? {};
      const issue = (payload.issue as { number?: number; title?: string }) ?? {};
      return {
        source: "github",
        kind: "comment",
        title: `Comment on #${issue.number}`,
        detail: `${sender}: ${(comment.body ?? "").slice(0, 120)}`,
        actor: sender,
        timestamp: new Date().toISOString(),
        url: comment.html_url,
        rawType: "issue_comment",
      };
    }
    default:
      return null;
  }
}
