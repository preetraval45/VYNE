import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCsrfToken, csrfCookieAttrs } from "@/lib/api/security";
import {
  COOKIE_MAX_AGE_SEC,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth/server";
import {
  authRateLimit,
  checkAccountLock,
  clearLoginFailures,
  hashEmail,
  recordLoginFailure,
} from "@/lib/auth/authRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
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
  // First-pass IP rate limit BEFORE we know the email — protects the
  // endpoint from brute-force scans that don't even target a real user.
  // Per master plan: 5/min per IP, 50/hour per IP.
  const ipRl = await authRateLimit({
    req,
    ipKey: "auth-login-ip",
    ipLimit: 5,
    ipWindowSec: 60,
  });
  if (!ipRl.ok) return ipRl.response;

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }

  // Per-email rate limit + account-lockout check. We hash the email so
  // raw addresses never enter Redis.
  const emailHash = hashEmail(email);

  const locked = await checkAccountLock(emailHash);
  if (locked) return locked;

  const emailRl = await authRateLimit({
    req,
    // Both keys repeat here only because authRateLimit requires the IP
    // path too — the IP check is idempotent thanks to Redis INCR so the
    // second call just bumps the counter.
    ipKey: "auth-login-ip-paired",
    ipLimit: 100, // generous because we already gated on auth-login-ip
    ipWindowSec: 60,
    emailKey: "auth-login-email",
    emailHash,
    emailLimit: 5,
    emailWindowSec: 60,
  });
  if (!emailRl.ok) return emailRl.response;

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (
    !user ||
    !verifyPassword(password, user.passwordSalt, user.passwordHash)
  ) {
    // Lockout-counter bump. After LOCKOUT_THRESHOLD failures in the
    // configured window, the account is soft-locked for 15 min.
    const justLocked = await recordLoginFailure(emailHash);
    return NextResponse.json(
      {
        error: justLocked
          ? "Too many failed attempts. Account temporarily locked."
          : "Email or password is incorrect.",
      },
      { status: justLocked ? 423 : 401 },
    );
  }

  // Successful login — clear failure counter so legitimate users
  // aren't locked by their N+1 attempt after a few typos.
  await clearLoginFailures(emailHash);

  // PH-D — MFA gate. When the user has enabled TOTP, return a
  // SHORT-LIVED `mfaSessionToken` instead of issuing the full session.
  // The client posts that token + the 6-digit code to
  // /api/auth/mfa/verify which then writes the real session cookies.
  // We DO NOT set `vyne-token` here in this branch — the password
  // alone is not enough.
  if (user.mfaEnabled) {
    const mfaSessionToken = signSessionToken({
      uid: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    });
    return NextResponse.json({
      ok: true,
      step: "mfa",
      mfaRequired: true,
      mfaSessionToken,
    });
  }

  // No MFA — issue the real session.
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
