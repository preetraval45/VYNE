import { NextResponse } from "next/server";

// /api/admin/cron/access-review-reminder (PH-I)
//
// Quarterly cron — fires on the 1st of Jan / Apr / Jul / Oct at
// 09:00 UTC. Sends a checklist email to the operator inbox so the
// quarterly access review actually happens (SOC 2 CC6.1).
//
// Action items are simple links back to the docs that drive the
// review:
//   • docs/soc2/access-control.md — current operator list + key rotation log
//   • docs/soc2/vendor-management.md — annual sub-processor review
//
// Best-effort: if Resend isn't configured we still return ok=true
// + log to console so the cron isn't marked failed (the schedule
// itself is the audit evidence; the email is the prompt).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — cron only" },
      { status: 401 },
    );
  }

  const now = new Date();
  const q = quarterLabel(now);
  const to = process.env.ACCESS_REVIEW_INBOX ?? "preet@americancircuits.com";
  const apiKey = process.env.RESEND_API_KEY;

  const body = [
    `# Quarterly access review — ${q}`,
    ``,
    `Triggered by cron at ${now.toISOString()}.`,
    ``,
    `## Checklist (target completion within 14 days)`,
    ``,
    `1. Open docs/soc2/access-control.md — review every operator row`,
    `   • Confirm MFA is still on for every system listed`,
    `   • Remove anyone whose role changed or contract ended`,
    `2. Open docs/soc2/vendor-management.md — confirm every sub-processor is still in use`,
    `   • Pull latest SOC 2 report from each vendor trust portal`,
    `   • Note any exceptions affecting controls we rely on`,
    `3. Rotate any API keys whose rotation cadence has lapsed (annual = >365d, quarterly = >90d)`,
    `4. Log the review in docs/soc2/access-control.md → "Access review log" table with today's date`,
    `5. Open a tabletop incident-response exercise for this quarter (docs/soc2/tabletop-*.md)`,
    ``,
    `## SOC 2 mapping`,
    `Evidence for CC6.1 (logical access) + CC9.2 (vendor management) + CC1.5 (accountability).`,
    ``,
    `Don't reply to this email — it's automated.`,
  ].join("\n");

  if (!apiKey) {
    console.log(
      `[access-review-reminder] ${q} — no RESEND_API_KEY; email skipped.`,
    );
    return NextResponse.json({
      ok: true,
      quarter: q,
      delivered: false,
      reason: "RESEND_API_KEY not configured",
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "VYNE Audit <audit@vyne.app>",
        to,
        subject: `Access review reminder — ${q}`,
        text: body,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          quarter: q,
          delivered: false,
          status: res.status,
          detail,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, quarter: q, delivered: true, to });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        quarter: q,
        delivered: false,
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
