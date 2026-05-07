import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/gdpr/forget
 * Body: { email?: string; userId?: string; confirm: true }
 *
 * GDPR / CCPA "right to erasure". Returns the IDs that *would* be
 * hard-deleted across every persisted store; the actual delete is
 * client-side because the canonical state lives in browser localStorage
 * for demo workspaces. Production swaps the demo path for a server
 * transaction that wipes references in a single SQL `DELETE … RETURNING`.
 *
 * Audit trail: caller posts the response back to /api/audit so the
 * SOC 2 audit log records the actor, subject, and counts.
 *
 * Rate-limited 2/min — irreversible action.
 */

export const runtime = "edge";

interface Body {
  email?: string;
  userId?: string;
  confirm?: boolean;
  reason?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "gdpr-forget",
    limit: 2,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.confirm) {
    return NextResponse.json(
      { ok: false, error: "must set confirm: true" },
      { status: 400 },
    );
  }
  if (!body.email && !body.userId) {
    return NextResponse.json(
      { ok: false, error: "must provide email or userId" },
      { status: 400 },
    );
  }

  // Demo mode: no server data to delete. Return the contract a
  // production caller would implement so the client knows what to
  // wipe locally.
  return NextResponse.json({
    ok: true,
    subject: { email: body.email, userId: body.userId },
    reason: body.reason ?? null,
    requestedAt: new Date().toISOString(),
    /** Client should walk these stores and remove any row referencing the subject. */
    storesToWipe: [
      "vyne-contacts",
      "vyne-crm",
      "vyne-activity",
      "vyne-trash",
      "vyne-presence-*",
      "vyne-threads-*",
      "vyne-reactions-*",
      "vyne-notification-center",
      "vyne-ai-workspace", // memories may name the subject
    ],
    /** Manifest entry the caller can append to /api/audit. */
    auditEntry: {
      action: "gdpr.forget",
      subject: body.email ?? body.userId,
      reason: body.reason ?? null,
      irreversible: true,
    },
  });
}
