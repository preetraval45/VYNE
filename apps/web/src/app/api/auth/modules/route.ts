import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, requireCsrf } from "@/lib/api/security";
import { verifySessionToken } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  modules?: unknown;
}

function getSession(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  const token = cookies["vyne-token"];
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(req: Request) {
  const rl = await rateLimit({ key: "auth-modules-get", limit: 60, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { modules: true, plan: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ modules: user.modules, plan: user.plan });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const rl = await rateLimit({ key: "auth-modules-patch", limit: 30, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  const csrfFail = requireCsrf(req);
  if (csrfFail) return csrfFail;

  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const modulesRaw = Array.isArray(body.modules) ? body.modules : null;
  if (!modulesRaw) {
    return NextResponse.json({ error: "modules array required" }, { status: 400 });
  }
  const modules = modulesRaw
    .filter((m): m is string => typeof m === "string")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 30);

  try {
    const updated = await prisma.user.update({
      where: { id: session.uid },
      data: { modules },
      select: { modules: true },
    });
    return NextResponse.json({ ok: true, modules: updated.modules });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
