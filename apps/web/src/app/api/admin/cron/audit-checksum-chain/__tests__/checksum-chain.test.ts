// PH-I — Audit checksum chain contract tests.
//
// What we MUST guarantee:
//   1. Cron rejects unauthenticated callers (no x-vercel-cron-signature
//      AND no Bearer CRON_SECRET).
//   2. For every org with activity in the day, an audit_checksums row
//      is upserted with rowCount + dailyHash + chainHash + prevHash.
//   3. chainHash = sha256(prevHash || dailyHash) — the chain links.
//   4. Re-running on the same day with the same data produces the same
//      hash (deterministic / idempotent).
//   5. Tampering with a single audit_event field changes the hash.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
}));

import { GET } from "../route";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function authReq(): Request {
  return new Request("https://test.vyne/api/admin/cron/audit-checksum-chain", {
    method: "GET",
    headers: { "x-vercel-cron-signature": "verified" },
  });
}

beforeEach(() => {
  resetPrismaMock();
});

describe("audit-checksum-chain cron", () => {
  it("returns 401 without the Vercel-Cron header or bearer secret", async () => {
    const r = new Request(
      "https://test.vyne/api/admin/cron/audit-checksum-chain",
      { method: "GET" },
    );
    const res = await GET(r);
    expect(res.status).toBe(401);
    expect(mockPrisma.auditEvent.groupBy).not.toHaveBeenCalled();
  });

  it("processes zero orgs cleanly when no audit activity exists", async () => {
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([]);
    const res = await GET(authReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orgsProcessed: number };
    expect(body.orgsProcessed).toBe(0);
    expect(mockPrisma.auditChecksum.upsert).not.toHaveBeenCalled();
  });

  it("computes chainHash as sha256(prevHash || dailyHash) and upserts one row per org", async () => {
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-A", _count: { _all: 2 } },
    ]);
    const day1 = new Date("2026-05-01T12:00:00Z");
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        actorId: "user-1",
        actorName: "alice",
        entityRef: "deal:d1",
        action: "deal.created",
        category: "data",
        severity: "info",
        summary: "Created deal d1",
        diff: null,
        ip: "1.2.3.4",
        userAgent: "Mozilla/5.0",
        createdAt: day1,
      },
      {
        id: "a2",
        actorId: "user-1",
        actorName: "alice",
        entityRef: "deal:d1",
        action: "deal.updated",
        category: "data",
        severity: "info",
        summary: "Updated deal d1",
        diff: { value: { from: 100, to: 200 } },
        ip: "1.2.3.4",
        userAgent: "Mozilla/5.0",
        createdAt: day1,
      },
    ]);
    // Yesterday's chain row → chainHash "PREV".
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce({
      orgId: "org-A",
      date: new Date("2026-04-30T00:00:00Z"),
      rowCount: 1,
      dailyHash: "ignored",
      chainHash: "PREV",
      prevHash: null,
    });

    const res = await GET(authReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      orgsProcessed: number;
      results: Array<{ chainHash: string; prevHash: string | null }>;
    };
    expect(body.orgsProcessed).toBe(1);

    const upsertArg = mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
      create: {
        orgId: string;
        rowCount: number;
        dailyHash: string;
        chainHash: string;
        prevHash: string | null;
      };
    };
    expect(upsertArg.create.orgId).toBe("org-A");
    expect(upsertArg.create.rowCount).toBe(2);
    expect(upsertArg.create.prevHash).toBe("PREV");
    // chainHash MUST be sha256(prevHash || dailyHash).
    const expectedChain = sha256("PREV" + upsertArg.create.dailyHash);
    expect(upsertArg.create.chainHash).toBe(expectedChain);
    expect(body.results[0].chainHash).toBe(expectedChain);
  });

  it("uses null prevHash for the very first chain row", async () => {
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-B", _count: { _all: 1 } },
    ]);
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([
      {
        id: "b1",
        actorId: "user-2",
        actorName: "bob",
        entityRef: "user:b1",
        action: "user.signed-in",
        category: "auth",
        severity: "info",
        summary: "Sign in",
        diff: null,
        ip: "",
        userAgent: "",
        createdAt: new Date("2026-05-01T08:00:00Z"),
      },
    ]);
    // No previous day row.
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce(null);

    await GET(authReq());
    const upsertArg = mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
      create: { dailyHash: string; chainHash: string; prevHash: string | null };
    };
    expect(upsertArg.create.prevHash).toBeNull();
    // chainHash = sha256("" || dailyHash) when prevHash is null
    expect(upsertArg.create.chainHash).toBe(
      sha256("" + upsertArg.create.dailyHash),
    );
  });

  it("is deterministic — two runs with the same input produce the same hash", async () => {
    const baseRow = {
      id: "x1",
      actorId: "user-1",
      actorName: "alice",
      entityRef: "deal:d1",
      action: "deal.created",
      category: "data",
      severity: "info",
      summary: "Created deal d1",
      diff: null,
      ip: "1.2.3.4",
      userAgent: "ua",
      createdAt: new Date("2026-05-01T12:00:00Z"),
    };

    // Run 1
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-A", _count: { _all: 1 } },
    ]);
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([baseRow]);
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce(null);
    await GET(authReq());
    const firstUpsert = mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
      create: { dailyHash: string; chainHash: string };
    };

    // Run 2 — identical inputs.
    mockPrisma.auditChecksum.upsert.mockClear();
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-A", _count: { _all: 1 } },
    ]);
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([baseRow]);
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce(null);
    await GET(authReq());
    const secondUpsert = mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
      create: { dailyHash: string; chainHash: string };
    };

    expect(secondUpsert.create.dailyHash).toBe(firstUpsert.create.dailyHash);
    expect(secondUpsert.create.chainHash).toBe(firstUpsert.create.chainHash);
  });

  it("flips the hash when a single field of an audit_event changes (tamper-evidence)", async () => {
    const rowA = {
      id: "x1",
      actorId: "user-1",
      actorName: "alice",
      entityRef: "deal:d1",
      action: "deal.created",
      category: "data",
      severity: "info",
      summary: "Created deal d1",
      diff: null,
      ip: "1.2.3.4",
      userAgent: "ua",
      createdAt: new Date("2026-05-01T12:00:00Z"),
    };
    const rowB = { ...rowA, summary: "Tampered summary" };

    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-A", _count: { _all: 1 } },
    ]);
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([rowA]);
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce(null);
    await GET(authReq());
    const hashA = (
      mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
        create: { dailyHash: string };
      }
    ).create.dailyHash;

    mockPrisma.auditChecksum.upsert.mockClear();
    mockPrisma.auditEvent.groupBy.mockResolvedValueOnce([
      { orgId: "org-A", _count: { _all: 1 } },
    ]);
    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([rowB]);
    mockPrisma.auditChecksum.findUnique.mockResolvedValueOnce(null);
    await GET(authReq());
    const hashB = (
      mockPrisma.auditChecksum.upsert.mock.calls[0]?.[0] as {
        create: { dailyHash: string };
      }
    ).create.dailyHash;

    expect(hashA).not.toBe(hashB);
  });
});
