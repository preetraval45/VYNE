// PH-C — /api/auth/reset-password
//
// Verifies a forgot-password token, updates the user's password hash,
// marks the token used, and clears any login-failure counter. Rate
// limited at 5/hour per IP (master plan).
//
// PH-D will add the PasswordResetToken Prisma model so this stops
// no-oping. For now the route validates input + rate limit + returns a
// helpful "token system not yet provisioned" error when the table is
// missing — frontend can still wire the page without breaking.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  authRateLimit,
  clearLoginFailures,
  hashEmail,
} from "@/lib/auth/authRateLimit";
import { hashPassword, validatePassword } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResetBody {
  token?: string;
  newPassword?: string;
}

export async function POST(req: Request) {
  const rl = await authRateLimit({
    req,
    ipKey: "auth-reset-ip",
    ipLimit: 5,
    ipWindowSec: 60 * 60,
  });
  if (!rl.ok) return rl.response;

  let body: ResetBody;
  try {
    body = (await req.json()) as ResetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rawToken = (body.token ?? "").trim();
  const newPassword = body.newPassword ?? "";
  if (!rawToken || !newPassword) {
    return NextResponse.json(
      { error: "Token and password required" },
      { status: 400 },
    );
  }

  const pw = validatePassword(newPassword);
  if (!pw.valid) {
    return NextResponse.json(
      { error: `Password must include: ${pw.failed.join(", ")}` },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  let row;
  try {
    row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Password reset is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Reset link is invalid or expired." },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: row.userId } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 400 });
  }

  const { saltHex, hash } = hashPassword(newPassword);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, passwordSalt: saltHex },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }

  // Clear any active lockout counter so the user can sign in
  // immediately after reset.
  await clearLoginFailures(hashEmail(user.email));

  return NextResponse.json({ ok: true });
}
