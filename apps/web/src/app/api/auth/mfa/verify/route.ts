// PH-D — POST /api/auth/mfa/verify
//
// Body: { mfaSessionToken: string, code: string }
//
// Second step of the login flow when the user has MFA enabled. The
// short-lived `mfaSessionToken` was issued by /api/auth/login after a
// successful password verify; this endpoint validates the TOTP code
// (or a single-use recovery code), then issues the real session.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_MAX_AGE_SEC,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/server";
import { csrfCookieAttrs, generateCsrfToken } from "@/lib/api/security";
import {
  authRateLimit,
  clearLoginFailures,
  hashEmail,
} from "@/lib/auth/authRateLimit";
import {
  decryptSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
  mfaSessionToken?: string;
  code?: string;
}

function cookieAttrs(maxAge: number) {
  return [
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
}

export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const mfaSessionToken = (body.mfaSessionToken ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!mfaSessionToken || !code) {
    return NextResponse.json(
      { error: "mfaSessionToken and code required" },
      { status: 400 },
    );
  }

  // Verify the short-lived MFA-session token (same HMAC scheme as the
  // long-lived session token — we just use a different exp window).
  const payload = verifySessionToken(mfaSessionToken);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired MFA challenge" },
      { status: 401 },
    );
  }

  // Rate-limit per IP + per user. Keeps brute force on the 6-digit
  // code at ~5 attempts/min which is uncrackable in a single window
  // (1M combinations).
  const rl = await authRateLimit({
    req,
    ipKey: "auth-mfa-verify-ip",
    ipLimit: 10,
    ipWindowSec: 60,
    emailKey: "auth-mfa-verify-email",
    emailHash: hashEmail(payload.email),
    emailLimit: 5,
    emailWindowSec: 60,
  });
  if (!rl.ok) return rl.response;

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.uid } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) {
    return NextResponse.json(
      { error: "MFA not configured for this account" },
      { status: 400 },
    );
  }

  // First try the TOTP path. If that fails AND the code looks like a
  // recovery code, try the recovery list. Recovery codes are
  // hash-compared then removed (single-use).
  let accepted = false;
  try {
    const secret = decryptSecret(user.mfaSecretEncrypted);
    accepted = verifyTotpCode(secret, code);
  } catch {
    // decrypt failed — treat as not accepted, fall through to recovery
  }

  if (!accepted) {
    const candidate = hashRecoveryCode(code);
    const idx = user.mfaRecoveryCodes.indexOf(candidate);
    if (idx >= 0) {
      // Consume the recovery code.
      const updated = user.mfaRecoveryCodes.filter((_, i) => i !== idx);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaRecoveryCodes: updated },
        });
        accepted = true;
      } catch {
        // ignore — accepted stays false
      }
    }
  }

  if (!accepted) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Clear any lockout counter so the user can keep working without
  // hitting the throttle.
  await clearLoginFailures(hashEmail(user.email));

  const token = signSessionToken({
    uid: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  });
  const csrf = generateCsrfToken();

  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      modules: user.modules,
      plan: user.plan,
      role: user.role,
      orgId: user.orgId,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt.toISOString(),
    },
    token,
    csrf,
  });
  res.headers.append(
    "Set-Cookie",
    `vyne-token=${encodeURIComponent(token)}; ${cookieAttrs(COOKIE_MAX_AGE_SEC)}`,
  );
  res.headers.append(
    "Set-Cookie",
    `vyne-csrf=${csrf}; ${csrfCookieAttrs(COOKIE_MAX_AGE_SEC)}`,
  );
  return res;
}
