import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/gdpr/export
 * Body: { email?: string; userId?: string }
 *
 * GDPR / CCPA "right of access" — returns every record in the
 * workspace that references the target user, packaged as a single
 * JSON blob the caller can save / forward to the data subject.
 *
 * Demo mode: aggregates from the canonical fixture set + any
 * server-side store reachable from this route. Production swaps the
 * fixture reads for a real DB scan.
 *
 * Rate-limited 4/min so a public endpoint can't be used to walk the
 * dataset.
 */

export const runtime = "edge";

interface Body {
  email?: string;
  userId?: string;
}

interface ExportSection {
  module: string;
  rows: unknown[];
  exportedAt: string;
}

function matches(value: unknown, needle: string | undefined): boolean {
  if (!needle) return false;
  if (typeof value === "string") return value.toLowerCase().includes(needle);
  if (Array.isArray(value)) return value.some((v) => matches(v, needle));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) =>
      matches(v, needle),
    );
  }
  return false;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "gdpr-export",
    limit: 4,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase();
  const userId = body.userId?.trim().toLowerCase();
  if (!email && !userId) {
    return NextResponse.json(
      { ok: false, error: "must provide `email` or `userId`" },
      { status: 400 },
    );
  }

  const needle = email ?? userId;
  const exportedAt = new Date().toISOString();

  // Fixture imports are deferred so the endpoint stays edge-light.
  const [crmModule, hrModule, chatModule] = await Promise.all([
    import("@/lib/fixtures/crm").catch(() => null),
    import("@/lib/fixtures/hr").catch(() => null),
    import("@/lib/fixtures/chat").catch(() => null),
  ]);

  const sections: ExportSection[] = [];

  // CRM deals
  const deals =
    (crmModule as { DEALS?: unknown[]; MOCK_DEALS?: unknown[] } | null)?.DEALS ??
    (crmModule as { MOCK_DEALS?: unknown[] } | null)?.MOCK_DEALS ??
    [];
  const dealHits = deals.filter((d) => matches(d, needle));
  if (dealHits.length > 0) {
    sections.push({ module: "crm", rows: dealHits, exportedAt });
  }

  // HR employees
  const employees =
    (hrModule as { EMPLOYEES?: unknown[] } | null)?.EMPLOYEES ?? [];
  const empHits = employees.filter((e) => matches(e, needle));
  if (empHits.length > 0) {
    sections.push({ module: "hr", rows: empHits, exportedAt });
  }

  // Chat messages
  const messages =
    (chatModule as { MOCK_MESSAGES?: unknown[]; MESSAGES?: unknown[] } | null)
      ?.MOCK_MESSAGES ??
    (chatModule as { MESSAGES?: unknown[] } | null)?.MESSAGES ??
    [];
  const msgHits = messages.filter((m) => matches(m, needle));
  if (msgHits.length > 0) {
    sections.push({ module: "chat", rows: msgHits, exportedAt });
  }

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  return NextResponse.json({
    ok: true,
    subject: { email, userId },
    exportedAt,
    totalRows,
    sections,
    /** Manifest the caller can append to the export ZIP for SOC 2 audit. */
    manifest: {
      generator: "VYNE GDPR Export",
      version: "1",
      sectionCount: sections.length,
      retention: "Caller is responsible for forwarding to the data subject within 30 days.",
    },
  });
}
