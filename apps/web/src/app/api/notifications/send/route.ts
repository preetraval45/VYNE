import { NextResponse } from "next/server";
import { requireAuth, rateLimit, requireCsrf } from "@/lib/api/security";

export const runtime = "edge";

type NotificationKind = "mention" | "assignment" | "digest" | "alert" | "test";

interface SendPayload {
  to?: string;
  kind?: NotificationKind;
  subject?: string;
  body?: string;
}

function buildTemplate(
  kind: NotificationKind,
  body?: string,
): { subject: string; html: string } {
  switch (kind) {
    case "mention":
      return {
        subject: "You were mentioned in VYNE",
        html: `<p>Someone mentioned you in a VYNE channel.</p>${body ? `<blockquote>${body}</blockquote>` : ""}`,
      };
    case "assignment":
      return {
        subject: "New issue assigned to you",
        html: `<p>A new issue has been assigned to you.</p>${body ? `<blockquote>${body}</blockquote>` : ""}`,
      };
    case "digest":
      return {
        subject: "Your VYNE daily digest",
        html: body ?? "<p>Your daily activity summary.</p>",
      };
    case "alert":
      return {
        subject: "VYNE AI alert",
        html: body ?? "<p>VYNE AI detected an anomaly in your workspace.</p>",
      };
    case "test":
    default:
      return {
        subject: "VYNE notification test",
        html: "<p>This is a test notification from VYNE.</p>",
      };
  }
}

async function sendViaResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "VYNE <noreply@vyne.dev>";
  if (!key) return { ok: true, skipped: true as const };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return { ok: res.ok, skipped: false as const };
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response!;

  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const rl = await rateLimit({
    key: "notify-send",
    limit: 10,
    windowSec: 60,
    req: request,
  });
  if (!rl.ok) return rl.response!;

  const body = (await request.json().catch(() => ({}))) as SendPayload;
  const to = body.to?.trim().toLowerCase();
  const kind = body.kind ?? "test";

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { error: "Valid recipient email required" },
      { status: 400 },
    );
  }

  const tpl = buildTemplate(kind, body.body);
  const subject = body.subject ?? tpl.subject;

  const result = await sendViaResend(to, subject, tpl.html).catch(() => ({
    ok: false as const,
    skipped: false as const,
  }));

  if (!result.ok && !result.skipped) {
    return NextResponse.json(
      { error: "Email provider unavailable" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    queued: !result.skipped,
    provider: result.skipped ? "none" : "resend",
    to,
    kind,
  });
}
