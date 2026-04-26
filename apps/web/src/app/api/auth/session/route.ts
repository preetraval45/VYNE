import { NextResponse } from "next/server";
import {
  rateLimit,
  generateCsrfToken,
  csrfCookieAttrs,
} from "@/lib/api/security";

export const runtime = "edge";

// Server-side cookie writer for the auth session.
// The dashboard middleware in apps/web/src/middleware.ts looks for
// `vyne-token` (real JWT) or `vyne-demo=1` (demo bypass). Previously
// both were written by the client via document.cookie — that means a
// reflected XSS can read the token. This route accepts the token from
// the auth store after a successful login and re-issues it as
// HttpOnly + Secure + SameSite=Strict so JS can no longer touch it.
//
// Why expose this as an API route at all? Because we don't have a
// server-side login flow yet (api-gateway is not deployed). Once that
// service is live, the proper fix is for /api/gateway/login to set the
// cookie itself in its 200 response and this shim route can go away.

interface SessionPayload {
  token?: string;
  demo?: boolean;
}

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function cookieAttrs(maxAge: number) {
  // HttpOnly blocks document.cookie reads → mitigates XSS session theft.
  // Secure ensures the cookie only travels over HTTPS.
  // SameSite=Strict blocks CSRF on top-level POST navigations.
  return [
    `Path=/`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
  ].join("; ");
}

export async function POST(req: Request) {
  // Modest rate limit — successful logins are rare, so 10/min/IP is
  // generous and stops credential-stuffing patterns from spamming us.
  const rl = await rateLimit({
    key: "auth-session",
    limit: 10,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: SessionPayload;
  try {
    body = (await req.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const isDemo = body.demo === true;
  if (!token && !isDemo) {
    return NextResponse.json(
      { error: "Provide either token or demo: true" },
      { status: 400 },
    );
  }

  // Issue a fresh CSRF token bound to this session. The token also
  // travels back in the JSON body so JS that doesn't trust document.cookie
  // (e.g. our auth store) can grab it directly.
  const csrf = generateCsrfToken();
  const res = NextResponse.json({
    ok: true,
    mode: isDemo ? "demo" : "auth",
    csrf,
  });

  if (isDemo) {
    res.headers.append(
      "Set-Cookie",
      `vyne-demo=1; ${cookieAttrs(COOKIE_MAX_AGE_SEC)}`,
    );
  } else if (token) {
    // Tokens are kept server-set. The browser cannot read this back —
    // every authed API request must rely on the cookie travelling with
    // it, not on JS being able to read the value.
    const value = encodeURIComponent(token);
    res.headers.append(
      "Set-Cookie",
      `vyne-token=${value}; ${cookieAttrs(COOKIE_MAX_AGE_SEC)}`,
    );
  }

  // Always (re)issue the CSRF cookie alongside the auth cookie so the
  // double-submit pair stays in lockstep.
  res.headers.append(
    "Set-Cookie",
    `vyne-csrf=${csrf}; ${csrfCookieAttrs(COOKIE_MAX_AGE_SEC)}`,
  );

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // Expire both cookies immediately. Secure/HttpOnly attributes still
  // matter on the deletion so middlemen can't downgrade the cookie.
  res.headers.append("Set-Cookie", `vyne-token=; ${cookieAttrs(0)}`);
  res.headers.append("Set-Cookie", `vyne-demo=; ${cookieAttrs(0)}`);
  res.headers.append("Set-Cookie", `vyne-csrf=; ${csrfCookieAttrs(0)}`);
  return res;
}
