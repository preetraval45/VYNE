// PH-D — POST /api/auth/mfa/confirm
//
// Body: { secret: string, code: string }
//
// Verifies that the user's authenticator generated the expected 6-digit
// code from the secret returned by /api/auth/mfa/setup, then persists
// the secret (AES-256-GCM encrypted) to the User row + flips
// mfaEnabled=true. Returns 10 single-use recovery codes — shown ONCE
// to the user and never recoverable afterward.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveTenant } from "@/lib/auth/tenantGuard";
import {
  encryptSecret,
  generateRecoveryCodes,
  verifyTotpCode,
} from "@/lib/auth/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ConfirmBody {
  secret?: string;
  code?: string;
}

export async function POST(req: Request) {
  const ctx = await resolveTenant(req);
  if (!ctx || ctx.demo) {
    return NextResponse.json(
      { error: "Sign in with a real account to enable MFA" },
      { status: 401 },
    );
  }
  const rl = await rateLimit({
    key: "mfa-confirm",
    limit: 10,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const secret = (body.secret ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!secret || !code) {
    return NextResponse.json(
      { error: "secret and code required" },
      { status: 400 },
    );
  }

  if (!verifyTotpCode(secret, code)) {
    return NextResponse.json(
      {
        error:
          "That code didn't match. Try again with the current one in your authenticator.",
      },
      { status: 400 },
    );
  }

  try {
    const encrypted = encryptSecret(secret);
    const { raw: recoveryRaw, hashed: recoveryHashed } =
      generateRecoveryCodes();

    await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: encrypted,
        mfaRecoveryCodes: recoveryHashed,
      },
    });

    return NextResponse.json({
      ok: true,
      recoveryCodes: recoveryRaw,
      message:
        "MFA enabled. Save the recovery codes — you won't see them again.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
