// PH-D — POST /api/auth/mfa/disable
//
// Body: { password: string, code: string }
//
// Disabling MFA is a privileged action — we require BOTH the current
// password AND a valid TOTP (or recovery code) so a stolen session
// cookie alone can't turn off the second factor. On success, the
// secret + recovery codes are cleared from the User row.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveTenant } from "@/lib/auth/tenantGuard";
import { verifyPassword } from "@/lib/auth/server";
import {
  decryptSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DisableBody {
  password?: string;
  code?: string;
}

export async function POST(req: Request) {
  const ctx = await resolveTenant(req);
  if (!ctx || ctx.demo) {
    return NextResponse.json(
      { error: "Sign in to disable MFA" },
      { status: 401 },
    );
  }
  const rl = await rateLimit({
    key: "mfa-disable",
    limit: 5,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: DisableBody;
  try {
    body = (await req.json()) as DisableBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const password = body.password ?? "";
  const code = (body.code ?? "").trim();
  if (!password || !code) {
    return NextResponse.json(
      { error: "password and code required" },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 });
  }
  if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
    return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
  }
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json(
      { error: "Password is incorrect" },
      { status: 401 },
    );
  }

  // Accept either a fresh TOTP code or a recovery code.
  let accepted = false;
  try {
    const secret = decryptSecret(user.mfaSecretEncrypted);
    accepted = verifyTotpCode(secret, code);
  } catch {
    // ignore — recovery path next
  }
  if (!accepted) {
    const candidate = hashRecoveryCode(code);
    if (user.mfaRecoveryCodes.includes(candidate)) {
      accepted = true;
    }
  }
  if (!accepted) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaRecoveryCodes: [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
