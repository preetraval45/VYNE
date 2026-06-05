// PH-I — Audit export endpoint contract tests.
//
// The export is SOC 2 evidence — its claims need to be testable:
//   1. Non-admin callers can't pull anything.
//   2. Manifest's csvSha256 actually matches sha256(CSV bytes).
//   3. Manifest's row count matches the row count in the CSV.
//   4. CSV is sorted by createdAt asc → row id asc (deterministic).
//   5. Tenant scope is the session orgId, not anything from the URL.
//   6. Manifest embeds the checksum chain so the file is self-verifying.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

vi.mock("@/lib/auth/role", () => ({
  requireRole: vi.fn(),
  resolveSession: vi.fn(),
  ADMIN_ROLES: ["owner", "admin"],
}));

vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
}));

import { requireRole, resolveSession } from "@/lib/auth/role";
import { GET } from "../route";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

const adminPass = () => null;
const denied = () =>
  new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });

beforeEach(() => {
  resetPrismaMock();
  (requireRole as ReturnType<typeof vi.fn>).mockReset();
  (resolveSession as ReturnType<typeof vi.fn>).mockReset();
  (requireRole as ReturnType<typeof vi.fn>).mockImplementation(adminPass);
  (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    uid: "user-admin",
    email: "admin@vyne.app",
    role: "admin",
  });
  mockPrisma.user.findUnique.mockResolvedValue({ orgId: "org-A" });
  mockPrisma.auditEvent.findMany.mockResolvedValue([]);
  mockPrisma.auditChecksum.findMany.mockResolvedValue([]);
});

describe("GET /api/admin/audit-export", () => {
  it("returns 403 for non-admin callers", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockImplementationOnce(denied);
    const res = await GET(
      new Request("https://test.vyne/api/admin/audit-export"),
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.auditEvent.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 when the session can't be resolved to an orgId", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await GET(
      new Request("https://test.vyne/api/admin/audit-export"),
    );
    expect(res.status).toBe(401);
  });

  it("scopes findMany on the session's orgId (never trusts URL params)", async () => {
    await GET(
      new Request(
        // Even if someone tries ?orgId=org-B in the URL, the route should
        // filter on the session's orgId-A.
        "https://test.vyne/api/admin/audit-export?orgId=org-B",
      ),
    );
    const findArgs = mockPrisma.auditEvent.findMany.mock.calls[0]?.[0] as {
      where: { orgId: string };
    };
    expect(findArgs.where.orgId).toBe("org-A");
  });

  it("emits CSV with the column header + one row per audit_event", async () => {
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        actorId: "u1",
        actorName: "Alice",
        entityRef: "deal:d1",
        action: "deal.created",
        category: "data",
        severity: "info",
        summary: "Created",
        diff: null,
        ip: "1.2.3.4",
        userAgent: "ua",
        createdAt: new Date("2026-05-01T12:00:00Z"),
      },
      {
        id: "a2",
        actorId: "u1",
        actorName: "Alice",
        entityRef: "deal:d1",
        action: "deal.updated",
        category: "data",
        severity: "info",
        summary: "Updated",
        diff: { value: { from: 100, to: 200 } },
        ip: "1.2.3.4",
        userAgent: "ua",
        createdAt: new Date("2026-05-01T12:05:00Z"),
      },
    ]);
    const res = await GET(
      new Request("https://test.vyne/api/admin/audit-export"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const body = await res.text();
    // Header line + 2 data lines + 2 trailer lines starting with #
    const lines = body.split("\n");
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("createdAt");
    expect(lines[0]).toContain("summary");
    expect(lines[1]).toContain("a1");
    expect(lines[1]).toContain("Created");
    expect(lines[2]).toContain("a2");
    expect(lines[2]).toContain("Updated");
    // Trailer must include the manifest.
    expect(body).toContain("# VYNE Audit Export Manifest");
  });

  it("manifest's csvSha256 matches sha256(CSV body without trailer)", async () => {
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        actorId: "u1",
        actorName: "Alice",
        entityRef: "deal:d1",
        action: "deal.created",
        category: "data",
        severity: "info",
        summary: 'Hello, "world"', // exercise the CSV escaper
        diff: null,
        ip: "1.2.3.4",
        userAgent: "ua",
        createdAt: new Date("2026-05-01T12:00:00Z"),
      },
    ]);
    const res = await GET(
      new Request("https://test.vyne/api/admin/audit-export"),
    );
    const body = await res.text();
    // Split off the trailer (lines starting with "# " after the data).
    const trailerStart = body.indexOf("\n# VYNE Audit Export Manifest");
    expect(trailerStart).toBeGreaterThan(0);
    // The CSV body is everything before the trailer block. The route
    // emits `csv + trailer` where csv ends with "\n" and trailer starts
    // with "\n# VYNE...". indexOf finds that leading "\n" of the
    // trailer, so slicing up to (not including) that index gives the
    // exact bytes the route hashed.
    const csvOnly = body.slice(0, trailerStart);
    // Manifest line is "# <json>"
    const trailer = body.slice(trailerStart);
    const manifestLine = trailer.split("\n").find((l) => l.startsWith("# {"));
    expect(manifestLine).toBeDefined();
    const manifest = JSON.parse(manifestLine!.slice(2)) as {
      csvSha256: string;
      rowCount: number;
    };
    expect(manifest.csvSha256).toBe(sha256(csvOnly));
    expect(manifest.rowCount).toBe(1);
  });

  it("includes the per-day checksum chain in the manifest", async () => {
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.auditChecksum.findMany.mockResolvedValueOnce([
      {
        date: new Date("2026-04-15T00:00:00Z"),
        rowCount: 12,
        dailyHash: "DH1",
        chainHash: "CH1",
        prevHash: null,
      },
      {
        date: new Date("2026-04-16T00:00:00Z"),
        rowCount: 8,
        dailyHash: "DH2",
        chainHash: "CH2",
        prevHash: "CH1",
      },
    ]);
    const res = await GET(
      new Request("https://test.vyne/api/admin/audit-export"),
    );
    const body = await res.text();
    const manifestLine = body
      .split("\n")
      .find((l) => l.startsWith("# {")) as string;
    const manifest = JSON.parse(manifestLine.slice(2)) as {
      chain: {
        perDay: { date: string; chainHash: string }[];
        first: { chainHash: string } | null;
        last: { chainHash: string } | null;
      };
    };
    expect(manifest.chain.perDay).toHaveLength(2);
    expect(manifest.chain.first?.chainHash).toBe("CH1");
    expect(manifest.chain.last?.chainHash).toBe("CH2");
    // Response headers also expose the chain head for fast verification.
    expect(res.headers.get("x-vyne-audit-chain-head")).toBe("CH2");
  });

  it("orders rows deterministically (createdAt asc, then id asc)", async () => {
    await GET(new Request("https://test.vyne/api/admin/audit-export"));
    const findArgs = mockPrisma.auditEvent.findMany.mock.calls[0]?.[0] as {
      orderBy: Array<Record<string, string>>;
    };
    expect(findArgs.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
  });
});
