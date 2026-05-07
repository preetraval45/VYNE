import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/integrations/sheets/sync
 * Body: { sheetId: string; range?: string; module: string; direction: "pull" | "push" | "both" }
 *
 * Google Sheets bidirectional sync entry point.
 *
 *   pull → Sheets is the source of truth; we mirror rows into VYNE
 *   push → VYNE is the source of truth; we write rows back into Sheets
 *   both → conflict-resolved last-write-wins (timestamp column required)
 *
 * Real implementation hooks Google's Sheets v4 API (we already have
 * the OAuth scopes `https://www.googleapis.com/auth/spreadsheets` in
 * the Drive integration). Until the OAuth credentials land, this
 * route returns a 501 with the contract so the client UI can render
 * a "Connect Google" prompt instead of a hard error.
 */

export const runtime = "edge";

interface Body {
  sheetId?: string;
  range?: string;
  module?: string;
  direction?: "pull" | "push" | "both";
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "sheets-sync",
    limit: 12,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.sheetId) {
    return NextResponse.json(
      { ok: false, error: "missing sheetId" },
      { status: 400 },
    );
  }
  if (!body.module) {
    return NextResponse.json(
      { ok: false, error: "missing module" },
      { status: 400 },
    );
  }

  const hasGoogleAuth = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  if (!hasGoogleAuth) {
    return NextResponse.json(
      {
        ok: false,
        error: "google-auth-missing",
        message:
          "Connect Google in Settings → Integrations to enable Sheets sync.",
        connectUrl: "/settings?panel=integrations",
        contract: {
          /** Once auth lands, the response shape will be: */
          example: {
            ok: true,
            sheetId: body.sheetId,
            module: body.module,
            direction: body.direction ?? "pull",
            stats: {
              pulled: 0,
              pushed: 0,
              conflicts: 0,
              elapsedMs: 0,
            },
          },
        },
      },
      { status: 501 },
    );
  }

  // Production path: walk the Sheets API, diff against the module's
  // store, apply changes, return stats. Stubbed for the OSS branch.
  return NextResponse.json({
    ok: true,
    sheetId: body.sheetId,
    module: body.module,
    direction: body.direction ?? "pull",
    stats: {
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      elapsedMs: 0,
      stub: true,
    },
  });
}
