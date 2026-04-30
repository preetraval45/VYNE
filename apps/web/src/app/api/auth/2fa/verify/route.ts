import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /api/auth/2fa/verify — accepts a 6-digit TOTP code and a userId.
// MVP implementation: validates shape only, marks the user's session
// cookie as "2fa_ok=1" so the rest of the app can check it. A full
// rollout requires per-user secrets stored in Postgres + the standard
// otplib HMAC-SHA1 verification window. This stub is structured so the
// drop-in is one diff away.

interface Body {
  code: string;
  userId?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "auth-2fa", limit: 10, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Code must be 6 digits" },
      { status: 400 },
    );
  }

  // STUB: accept any 6-digit code that isn't the obvious throwaway
  // (000000 / 123456). Replace with otplib's authenticator.verify
  // against the user's secret once Postgres holds per-user secrets.
  const REJECT = new Set(["000000", "123456"]);
  if (REJECT.has(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, verified: true });
  res.cookies.set("vyne-2fa", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
  });
  return res;
}
