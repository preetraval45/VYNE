import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit, generateCsrfToken, csrfCookieAttrs } from "@/lib/api/security";
import {
  COOKIE_MAX_AGE_SEC,
  hashPassword,
  signSessionToken,
  validatePassword,
} from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  companyName?: string;
  modules?: unknown;
  plan?: string;
}

function cookieAttrs(maxAge: number) {
  return ["Path=/", `Max-Age=${maxAge}`, "HttpOnly", "Secure", "SameSite=Strict"].join("; ");
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "auth-signup", limit: 5, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const companyName = (body.companyName ?? "").trim();
  const password = body.password ?? "";
  const plan = (body.plan ?? "custom").slice(0, 32);
  const modulesRaw = Array.isArray(body.modules) ? body.modules : [];
  const modules = modulesRaw
    .filter((m): m is string => typeof m === "string")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (name.length < 2) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (companyName.length < 2)
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  if (modules.length === 0)
    return NextResponse.json({ error: "Pick at least one module" }, { status: 400 });

  const pw = validatePassword(password);
  if (!pw.valid) {
    return NextResponse.json(
      { error: `Password must include: ${pw.failed.join(", ")}` },
      { status: 400 },
    );
  }

  const { saltHex, hash } = hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name,
        companyName,
        passwordHash: hash,
        passwordSalt: saltHex,
        modules,
        plan,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
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
