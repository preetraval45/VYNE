import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/notifications/digest
 * Body: { to: string; cadence?: "daily" | "weekly"; highlights?: string[] }
 *
 * Pipeline:
 *   1. Hit `/api/ai/digest` (same origin) for the AI-summarised payload.
 *   2. Render it as HTML.
 *   3. POST to `/api/notifications/send` with kind=digest.
 *
 * Returns the generated digest + send status. Designed to be called on
 * demand from settings or by a future cron at 7 am local. Cadence is
 * just metadata for the email subject — the AI prompt is the same.
 */

interface Body {
  to?: string;
  cadence?: "daily" | "weekly";
  highlights?: string[];
}

interface DigestPayload {
  headline: string;
  summary: string;
  bullets: string[];
  callToAction: string;
}

function digestHtml(d: DigestPayload, cadence: "daily" | "weekly"): string {
  const period = cadence === "weekly" ? "this week" : "today";
  return `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 24px; background:#f7f7f8; color:#0F172A;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;">
    <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">VYNE · ${cadence} digest</div>
    <h1 style="font-size:22px;margin:6px 0 4px;font-weight:700;letter-spacing:-0.01em;">${d.headline}</h1>
    <p style="margin:0 0 18px;font-size:14px;color:#475569;">${d.summary}</p>
    <ul style="padding:0;margin:0 0 20px;list-style:none;">
      ${d.bullets
        .map(
          (b) => `<li style="padding:8px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:6px;font-size:13px;line-height:1.5;">${b}</li>`,
        )
        .join("")}
    </ul>
    <p style="margin:0 0 16px;padding:12px 14px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.4);border-radius:10px;font-size:13px;font-weight:500;color:#0E7490;">→ ${d.callToAction}</p>
    <p style="margin:18px 0 0;font-size:11px;color:#94A3B8;">Receiving these because you opted into the ${cadence} digest. <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/settings?panel=notifications" style="color:#94A3B8;">Manage</a> · ${period}'s window: last ${cadence === "weekly" ? "7 days" : "24 hours"}.</p>
  </div>
</body></html>`.trim();
}

export async function POST(request: Request) {
  const rl = await rateLimit({
    key: "digest-send",
    limit: 6,
    windowSec: 300,
    req: request,
  });
  if (!rl.ok) return rl.response!;

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.to) {
    return NextResponse.json(
      { ok: false, error: "missing `to`" },
      { status: 400 },
    );
  }
  const cadence = body.cadence ?? "daily";
  const origin = new URL(request.url).origin;

  // 1) Generate digest
  let digest: DigestPayload;
  try {
    const r = await fetch(`${origin}/api/ai/digest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: body.to,
        highlights: body.highlights,
      }),
    });
    const j = (await r.json()) as { digest: DigestPayload };
    digest = j.digest;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "ai",
        error: err instanceof Error ? err.message : "ai digest failed",
      },
      { status: 502 },
    );
  }

  // 2) Send the email via /api/notifications/send (kind=digest)
  const html = digestHtml(digest, cadence);
  const subject =
    cadence === "weekly" ? "VYNE · Weekly digest" : "VYNE · Daily digest";

  let send: { ok: boolean; queued?: boolean; provider?: string; error?: string };
  try {
    const r = await fetch(`${origin}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: body.to,
        kind: "digest",
        subject,
        body: html,
      }),
    });
    send = (await r.json()) as typeof send;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "send",
        digest,
        error: err instanceof Error ? err.message : "send failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, digest, send });
}
