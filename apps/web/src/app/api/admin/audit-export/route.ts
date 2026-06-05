import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { requireRole, ADMIN_ROLES, resolveSession } from "@/lib/auth/role";
import { can } from "@/lib/auth/permissions";

// /api/admin/audit-export (PH-I — SOC 2 evidence)
//
// CSV export of audit_events for the caller's orgId, accompanied by:
//   • a manifest (rowCount + sha256 of the CSV bytes)
//   • the chain of daily checksums from audit_checksums covering the
//     export range
// An auditor can:
//   1. Verify sha256(CSV bytes) matches the manifest's hash.
//   2. Recompute each day's dailyHash from the CSV slice + confirm
//      it matches the stored audit_checksums.dailyHash.
//   3. Recompute the chainHash chain + confirm continuity from the
//      first row.
//
// Query params:
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD  (UTC, half-open [from, to))
//   defaults: last 90 days
// Response: text/csv with two trailer comment lines containing the
// manifest + chain head (so the file is self-verifying).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  // RFC 4180: any field containing comma, quote, or newline gets
  // wrapped in quotes; embedded quotes are doubled.
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const COLUMNS = [
  "id",
  "createdAt",
  "actorId",
  "actorName",
  "entityRef",
  "action",
  "category",
  "severity",
  "summary",
  "ip",
  "userAgent",
  "diff",
] as const;

export async function GET(req: Request) {
  const rl = await rateLimit({
    key: "audit-export",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const gate = await requireRole(req, ADMIN_ROLES);
  if (gate) return gate;

  // Resolve the caller's orgId — never trust query strings for tenant.
  const session = await resolveSession(req);
  let orgId: string | null = null;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { orgId: true },
      });
      orgId = user?.orgId ?? null;
    } catch {
      orgId = null;
    }
  }
  if (!orgId) {
    return new Response(JSON.stringify({ error: "Tenant unresolved" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Belt-and-braces: defer to the permission matrix even though
  // requireRole(ADMIN_ROLES) already ran. Keeps the audit trail
  // honest about which permission did the gating.
  if (session && !can(session.role, "security.audit.export")) {
    return new Response(JSON.stringify({ error: "Permission denied" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const toParam = url.searchParams.get("to");
  const fromParam = url.searchParams.get("from");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam
    ? new Date(fromParam)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

  const rows = await prisma.auditEvent.findMany({
    where: { orgId, createdAt: { gte: from, lt: to } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 50000, // hard cap to avoid blowing memory on a huge dump
  });

  const csvLines: string[] = [COLUMNS.join(",")];
  for (const r of rows) {
    csvLines.push(
      COLUMNS.map((c) => {
        if (c === "createdAt") return csvCell(r.createdAt.toISOString());
        if (c === "diff") return csvCell(r.diff);
        return csvCell((r as unknown as Record<string, unknown>)[c]);
      }).join(","),
    );
  }

  // Manifest
  const csv = csvLines.join("\n") + "\n";
  const csvSha256 = createHash("sha256").update(csv).digest("hex");

  // Pull the checksum-chain entries covering the range so the auditor
  // can verify off-line.
  const fromDay = new Date(from);
  fromDay.setUTCHours(0, 0, 0, 0);
  const checksums = await prisma.auditChecksum.findMany({
    where: { orgId, date: { gte: fromDay, lt: to } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      rowCount: true,
      dailyHash: true,
      chainHash: true,
      prevHash: true,
    },
  });

  const manifest = {
    orgId,
    exportedAt: new Date().toISOString(),
    range: { from: from.toISOString(), to: to.toISOString() },
    rowCount: rows.length,
    csvSha256,
    chain: {
      first: checksums[0] ?? null,
      last: checksums[checksums.length - 1] ?? null,
      perDay: checksums.map((c) => ({
        date: c.date.toISOString().slice(0, 10),
        rowCount: c.rowCount,
        dailyHash: c.dailyHash,
        chainHash: c.chainHash,
        prevHash: c.prevHash,
      })),
    },
  };

  // Embed the manifest as a trailing comment block (lines starting
  // with `#`) so the file is single-artefact self-verifying. Excel
  // ignores `#`-prefixed lines if loaded as comma-delimited.
  const trailer =
    "\n# VYNE Audit Export Manifest\n" + `# ${JSON.stringify(manifest)}\n`;

  const filename = `vyne-audit-${orgId}-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv`;

  return new Response(csv + trailer, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-vyne-audit-rowcount": String(rows.length),
      "x-vyne-audit-sha256": csvSha256,
      "x-vyne-audit-chain-head": manifest.chain.last?.chainHash ?? "",
    },
  });
}
