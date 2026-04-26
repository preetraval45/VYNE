import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WaitlistPayload {
  email?: string;
  company?: string;
  source?: string;
}

async function forwardToFormspree(
  email: string,
  meta: Record<string, string | undefined>,
) {
  const formspreeId = process.env.FORMSPREE_ID;
  if (!formspreeId) return { ok: true, skipped: true };

  const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, _subject: "VYNE Waitlist Signup", ...meta }),
  });
  return { ok: res.ok, skipped: false };
}

async function forwardToResend(email: string) {
  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audienceId) return { ok: true, skipped: true };

  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    },
  );
  return { ok: res.ok, skipped: false };
}

export async function POST(request: Request) {
  const rl = await rateLimit({
    key: "waitlist",
    limit: 5,
    windowSec: 60,
    req: request,
  });
  if (!rl.ok) return rl.response!;

  let body: WaitlistPayload;
  try {
    body = (await request.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 },
    );
  }

  const meta = {
    company: body.company,
    source: body.source ?? "landing",
    userAgent: request.headers.get("user-agent") ?? undefined,
  };

  const [formspree, resend] = await Promise.all([
    forwardToFormspree(email, meta).catch(() => ({
      ok: false,
      skipped: false,
    })),
    forwardToResend(email).catch(() => ({ ok: false, skipped: false })),
  ]);

  const anyAttempted = !formspree.skipped || !resend.skipped;
  const anySucceeded =
    (formspree.ok && !formspree.skipped) || (resend.ok && !resend.skipped);

  if (anyAttempted && !anySucceeded) {
    return NextResponse.json(
      { error: "Signup provider unavailable — please try again later" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, email });
}
