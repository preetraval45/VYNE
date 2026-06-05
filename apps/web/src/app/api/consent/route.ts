import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveSession } from "@/lib/auth/role";

// /api/consent (PH-H)
//
// Persists the user's cookie-consent decisions to Postgres so we have
// a tamper-evident audit trail (GDPR Art. 7(1) — "the controller
// shall be able to demonstrate that the data subject has consented").
// Anonymous visitors get a hashed visitor id; once they sign up, we
// re-stitch their pre-signup consents to the new userId.
//
// POST body: { decisions: Record<category, boolean>, visitorId?, source? }
// GET     :  current decisions for the caller (latest row per category)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "strictly_necessary",
  "functional",
  "analytics",
  "marketing",
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

function isCategory(s: string): s is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(s);
}

function getClientIp(req: Request): string {
  // Vercel sets x-forwarded-for; the leftmost is the original client.
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() ?? "";
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "consent-post",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: {
    decisions?: Record<string, boolean>;
    visitorId?: string;
    source?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.decisions || typeof body.decisions !== "object") {
    return NextResponse.json(
      { error: "decisions object required" },
      { status: 400 },
    );
  }

  const session = await resolveSession(req);
  const userId = session?.uid ?? null;
  const visitorId = body.visitorId ?? null;

  // Need at least one of userId / visitorId so we can attribute the
  // consent. The banner script generates a long-lived first-party
  // visitorId before signup; once signed in, userId wins.
  if (!userId && !visitorId) {
    return NextResponse.json(
      { error: "userId or visitorId required" },
      { status: 400 },
    );
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const source = body.source ?? "banner";

  const written: { category: string; granted: boolean }[] = [];
  for (const [rawCategory, granted] of Object.entries(body.decisions)) {
    if (!isCategory(rawCategory)) continue;
    if (typeof granted !== "boolean") continue;
    try {
      await prisma.consent.create({
        data: {
          userId,
          visitorId,
          category: rawCategory,
          granted,
          ip,
          userAgent,
          source,
        },
      });
      written.push({ category: rawCategory, granted });
    } catch {
      /* skip silently; the banner is best-effort */
    }
  }

  return NextResponse.json({ ok: true, written });
}

export async function GET(req: Request) {
  const session = await resolveSession(req);
  const url = new URL(req.url);
  const visitorId = url.searchParams.get("visitorId");
  const userId = session?.uid ?? null;
  if (!userId && !visitorId) {
    return NextResponse.json(
      { error: "userId or visitorId required" },
      { status: 400 },
    );
  }
  // Latest row per category wins.
  const rows = await prisma.consent.findMany({
    where: userId ? { userId } : { visitorId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const latest: Record<string, boolean> = {};
  for (const row of rows) {
    if (latest[row.category] === undefined) latest[row.category] = row.granted;
  }
  return NextResponse.json({ ok: true, decisions: latest });
}
