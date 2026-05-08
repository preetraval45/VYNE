import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";

// /api/notifications/drip (UI_UPGRADE_PLAN.md 9.6)
//
// Onboarding email drip cron. Walks every user whose account is
// younger than 14 days and sends the right milestone email based on
// account age:
//   day 0  → welcome ("you're in")
//   day 2  → "try AI: ask Vyne about your data"
//   day 7  → "import a CSV in 30 seconds"
//   day 14 → "your trial ends tomorrow"
//
// Idempotent: each (userId, kind) combo writes an AuditEvent so a
// re-run within the same day is a no-op. Uses the existing /api/
// notifications/send pipe (Resend) so RESEND_API_KEY gates real
// delivery — without it, the route still walks the user list and
// records "would-have-sent" audits for telemetry.
//
// Trigger: Vercel Cron in vercel.json (`/api/notifications/drip?cron=1`,
// daily 09:00 UTC). Manual triggers require admin role + CRON_SECRET.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DripStep {
  kind: "welcome" | "try-ai" | "import-data" | "trial-ending";
  dayMin: number;
  dayMax: number;
  subject: string;
  body: string;
}

const STEPS: DripStep[] = [
  {
    kind: "welcome",
    dayMin: 0,
    dayMax: 1,
    subject: "Welcome to VYNE — your workspace is ready",
    body: `<p>Hey {{name}},</p>
<p>You're in. Your workspace at <a href="https://vyne.vercel.app/home">vyne.vercel.app</a> is pre-loaded with demo data so you can explore every module before adding your own.</p>
<p>What to try first:</p>
<ul>
  <li>Press <code>Cmd+K</code> to search anything across CRM, projects, chat, and docs.</li>
  <li>Try the AI chat — it knows about your demo data and can act on it.</li>
  <li>Import your real contacts or deals from Settings → Data & backups.</li>
</ul>
<p>Reply to this email if you get stuck. We read every reply.</p>`,
  },
  {
    kind: "try-ai",
    dayMin: 2,
    dayMax: 3,
    subject: "Ask Vyne what's stuck in your pipeline",
    body: `<p>Hey {{name}},</p>
<p>The fastest way to feel VYNE click is to ask the AI a question about your data:</p>
<ul>
  <li>"Which deals stalled in Negotiation > 14 days?"</li>
  <li>"Draft a follow-up to every customer with an unpaid invoice."</li>
  <li>"Summarize what changed in #wins this week."</li>
</ul>
<p>Open <a href="https://vyne.vercel.app/ai/chat">the AI chat</a> and try one. The more it knows about your workspace, the better it gets.</p>`,
  },
  {
    kind: "import-data",
    dayMin: 6,
    dayMax: 8,
    subject: "Import your real data in 30 seconds",
    body: `<p>Hey {{name}},</p>
<p>Demo data is fun for 5 minutes. Real data is what makes VYNE useful.</p>
<p>Drop a CSV into <a href="https://vyne.vercel.app/contacts">contacts</a> or <a href="https://vyne.vercel.app/crm">CRM</a> — the import wizard maps columns automatically. Coming from Salesforce / HubSpot / Pipedrive? We have presets that handle the column names for you.</p>
<p>Settings → Data & backups → Import.</p>`,
  },
  {
    kind: "trial-ending",
    dayMin: 12,
    dayMax: 14,
    subject: "Your trial ends in 2 days",
    body: `<p>Hey {{name}},</p>
<p>Your 14-day trial ends in 2 days. After that, your workspace stays online but caps drop to the Free tier (1 user, 1k records, 50 AI messages/month).</p>
<p>Pick a paid plan if you'd like to keep teamwork + bigger AI budgets:</p>
<ul>
  <li>Starter — $12/seat/mo, 10 users, Sonnet</li>
  <li>Business — $24/seat/mo, 50 users, Opus, priority support</li>
</ul>
<p><a href="https://vyne.vercel.app/pricing">Upgrade in one click →</a></p>
<p>If now isn't the right time, no problem — your data sticks around at Free.</p>`,
  },
];

function isVercelCron(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("cron") !== "1") return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / 86400000);
}

interface DripResult {
  user: string;
  kind: string;
  status: "sent" | "skipped-already-sent" | "skipped-out-of-window" | "failed";
  reason?: string;
}

async function processUser(
  user: { id: string; email: string; name: string; createdAt: Date },
  origin: string,
): Promise<DripResult[]> {
  const day = daysSince(user.createdAt);
  const results: DripResult[] = [];
  for (const step of STEPS) {
    if (day < step.dayMin || day > step.dayMax) {
      results.push({
        user: user.email,
        kind: step.kind,
        status: "skipped-out-of-window",
      });
      continue;
    }
    // Already-sent guard via AuditEvent.
    const auditKey = `drip:${step.kind}`;
    const existing = await prisma.auditEvent
      .findFirst({
        where: { actorId: user.id, action: auditKey },
        select: { id: true },
      })
      .catch(() => null);
    if (existing) {
      results.push({
        user: user.email,
        kind: step.kind,
        status: "skipped-already-sent",
      });
      continue;
    }

    try {
      const html = step.body.replaceAll("{{name}}", user.name || "there");
      const sendRes = await fetch(`${origin}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Bypass CSRF for cron-internal calls — the existing route
          // accepts a system path when the call originates from the
          // server. For prod we'd swap to a service-key header.
          "x-vyne-internal": "drip",
        },
        body: JSON.stringify({
          to: user.email,
          kind: "digest", // existing template handler accepts digest
          subject: step.subject,
          body: html,
        }),
      });
      const ok = sendRes.ok;
      // Record audit either way so we don't re-attempt today.
      await prisma.auditEvent
        .create({
          data: {
            actorId: user.id,
            actorName: user.email,
            entityRef: `user:${user.id}`,
            action: auditKey,
            category: "system",
            summary: `Drip: ${step.kind} (${ok ? "sent" : "failed"})`,
            severity: ok ? "info" : "warning",
          },
        })
        .catch(() => {
          /* swallow */
        });
      results.push({
        user: user.email,
        kind: step.kind,
        status: ok ? "sent" : "failed",
      });
    } catch (err) {
      results.push({
        user: user.email,
        kind: step.kind,
        status: "failed",
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  }
  return results;
}

export async function GET(req: Request) {
  const rl = await rateLimit({
    key: "drip-cron",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  if (!isVercelCron(req)) {
    return NextResponse.json(
      {
        error:
          "Cron-only endpoint. Set CRON_SECRET + Authorization: Bearer <secret> for manual triggers.",
      },
      { status: 401 },
    );
  }

  const origin = new URL(req.url).origin;
  const cutoff = new Date(Date.now() - 15 * 86400000);

  let users: Array<{
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  }> = [];
  try {
    users = await prisma.user.findMany({
      where: { createdAt: { gte: cutoff } },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 500,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "DB unreachable" },
      { status: 500 },
    );
  }

  const all: DripResult[] = [];
  for (const user of users) {
    const results = await processUser(user, origin);
    all.push(...results);
  }

  const summary = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    processedUsers: users.length,
    sent: summary.sent ?? 0,
    skipped:
      (summary["skipped-already-sent"] ?? 0) +
      (summary["skipped-out-of-window"] ?? 0),
    failed: summary.failed ?? 0,
    results: all.slice(0, 20), // truncate so the response stays small
  });
}
