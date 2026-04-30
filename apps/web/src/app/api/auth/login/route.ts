import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, generateCsrfToken, csrfCookieAttrs } from "@/lib/api/security";
import {
  COOKIE_MAX_AGE_SEC,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

function cookieAttrs(maxAge: number) {
  return ["Path=/", `Max-Age=${maxAge}`, "HttpOnly", "Secure", "SameSite=Strict"].join("; ");
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "auth-login", limit: 10, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  const token = signSessionToken({ uid: user.id, email: user.email });
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
