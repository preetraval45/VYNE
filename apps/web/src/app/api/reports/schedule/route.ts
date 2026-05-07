import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/reports/schedule
 * Body: { reportId: string; cadence: "daily-9am" | "weekly-mon-9am" | "monthly-first-9am";
 *         delivery: "email" | "slack"; target: string; cc?: string[] }
 *
 * Registers a scheduled delivery: the cron worker picks the report
 * up at the next firing, renders it as PNG + HTML + CSV, and posts
 * to the chosen channel.
 *
 * Demo mode persists schedules in-memory; production swaps for a
 * row in `report_schedules` + a Vercel Cron entry.
 *
 * GET /api/reports/schedule  → list all active schedules.
 */

export const runtime = "edge";

interface Schedule {
  id: string;
  reportId: string;
  cadence: string;
  delivery: "email" | "slack";
  target: string;
  cc?: string[];
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __vyneReportSchedules: Map<string, Schedule> | undefined;
}

function store(): Map<string, Schedule> {
  if (!globalThis.__vyneReportSchedules)
    globalThis.__vyneReportSchedules = new Map();
  return globalThis.__vyneReportSchedules;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rsch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ALLOWED_CADENCES = new Set([
  "hourly",
  "daily-9am",
  "daily-5pm",
  "weekly-mon-9am",
  "weekly-fri-5pm",
  "monthly-first-9am",
]);

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "report-schedule",
    limit: 12,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Partial<Schedule> & {
    delivery?: string;
  };
  if (!body.reportId) {
    return NextResponse.json(
      { ok: false, error: "missing reportId" },
      { status: 400 },
    );
  }
  if (!body.cadence || !ALLOWED_CADENCES.has(body.cadence)) {
    return NextResponse.json(
      {
        ok: false,
        error: `invalid cadence (must be one of: ${Array.from(ALLOWED_CADENCES).join(", ")})`,
      },
      { status: 400 },
    );
  }
  if (body.delivery !== "email" && body.delivery !== "slack") {
    return NextResponse.json(
      { ok: false, error: 'delivery must be "email" or "slack"' },
      { status: 400 },
    );
  }
  if (!body.target) {
    return NextResponse.json(
      { ok: false, error: "missing target" },
      { status: 400 },
    );
  }

  const row: Schedule = {
    id: newId(),
    reportId: body.reportId,
    cadence: body.cadence,
    delivery: body.delivery,
    target: body.target,
    cc: body.cc,
    createdAt: new Date().toISOString(),
  };
  store().set(row.id, row);
  return NextResponse.json({ ok: true, schedule: row });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    schedules: Array.from(store().values()),
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "missing id" },
      { status: 400 },
    );
  }
  const removed = store().delete(id);
  return NextResponse.json({ ok: true, removed });
}
