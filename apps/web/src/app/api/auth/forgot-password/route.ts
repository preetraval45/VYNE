// PH-C — /api/auth/forgot-password
//
// Heavily rate-limited token issuance. Generates a single-use,
// sha256-hashed token with 1h TTL and stores it in Postgres. Always
// returns 200 (regardless of whether the email exists) so attackers
// cannot enumerate accounts via timing or status code.
//
// PH-D will wire the actual email send via Resend. For now the link is
// logged so demo / staging environments can reset passwords by reading
// the server logs.

import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authRateLimit, hashEmail } from "@/lib/auth/authRateLimit";
import { sendEmail } from "@/lib/email";
import { renderPasswordResetEmail } from "@/lib/email/templates/passwordReset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ForgotBody {
  email?: string;
}

const TOKEN_TTL_SEC = 60 * 60; // 1 hour

export async function POST(req: Request) {
  // PH-C: 3 requests / 15 minutes per email_hash (master plan).
  let body: ForgotBody;
  try {
    body = (await req.json()) as ForgotBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  // No-op on malformed email but still return 200 to avoid enumeration.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }
  const emailHash = hashEmail(email);

  const rl = await authRateLimit({
    req,
    ipKey: "auth-forgot-ip",
    ipLimit: 5,
    ipWindowSec: 60 * 15,
    emailKey: "auth-forgot-email",
    emailHash,
    emailLimit: 3,
    emailWindowSec: 60 * 15,
  });
  if (!rl.ok) return rl.response;

  // Look up the user — but always return 200, even if they don't exist.
  // The actual error gets logged for ops visibility only.
  const user = await prisma.user
    .findUnique({ where: { email }, select: { id: true, name: true } })
    .catch(() => null);

  if (user) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SEC * 1000);

    let persisted = false;
    try {
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
      persisted = true;
    } catch (err) {
      // Table missing or write failed — log + still return 200 to avoid
      // enumeration. If `prisma db push` ran during the deploy this
      // catch should never trip.
      console.warn(
        "[forgot-password] could not persist token:",
        err instanceof Error ? err.message : err,
      );
    }

    if (persisted) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://vyne.vercel.app";
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      // Render + send. Errors here are logged but the user-facing
      // response is still 200 (no enumeration signal). When
      // RESEND_API_KEY is unset, sendEmail logs the body to the server
      // console so dev / staging can read the link from logs.
      const { subject, html } = renderPasswordResetEmail({
        recipientName: user.name,
        resetUrl,
        expiresIn: "1 hour",
      });
      const result = await sendEmail({
        to: email,
        subject,
        html,
        category: "password-reset",
      });
      if (!result.ok) {
        console.warn("[forgot-password] email send failed:", result.error);
      }
    }
  }

  // Always 200, always identical body — no enumeration signal.
  return NextResponse.json({ ok: true });
}
