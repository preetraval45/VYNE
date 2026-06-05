// PH-G — Restore route contract tests.
//
// The restore route is the disaster-recovery counterpart to the backup
// route. We assert four critical properties:
//   1. Dry-run defaults to TRUE — accidentally hitting the endpoint
//      never writes anything.
//   2. Non-admin callers can't invoke the route.
//   3. The route validates the body's shape before touching Prisma.
//   4. When the caller specifies targetOrgId, every row's orgId is
//      REWRITTEN to that target — a malicious dump can't smuggle rows
//      into another tenant.

import { describe, it, expect, beforeEach, vi } from "vitest";
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
import { POST } from "../route";

const adminPass = () => null;
const denied = () =>
  new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });

beforeEach(() => {
  resetPrismaMock();
  (requireRole as ReturnType<typeof vi.fn>).mockReset();
  (resolveSession as ReturnType<typeof vi.fn>).mockReset();
  (requireRole as ReturnType<typeof vi.fn>).mockImplementation(adminPass);
  // Default: admin user from org-A.
  (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    uid: "user-admin",
    email: "a@vyne.app",
    role: "admin",
  });
  mockPrisma.user.findUnique.mockResolvedValue({ orgId: "org-A" });
});

function req(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validDump = (orgId: string | null = "org-A") => ({
  generatedAt: "2026-06-01T00:00:00Z",
  orgId,
  counts: { deals: 1, contacts: 1 },
  data: {
    deals: [
      {
        id: "deal-1",
        orgId,
        company: "Acme",
      },
    ],
    contacts: [
      {
        id: "contact-1",
        orgId,
        name: "Alex",
      },
    ],
  },
});

describe("POST /api/admin/restore", () => {
  it("defaults to dryRun=true and does NOT call upsert", async () => {
    const res = await POST(
      req("https://test.vyne/api/admin/restore", validDump("org-A")),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dryRun: boolean };
    expect(body.dryRun).toBe(true);
    expect(mockPrisma.deal.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled();
  });

  it("dryRun=0 invokes upsert per row", async () => {
    mockPrisma.deal.upsert.mockResolvedValue({ id: "deal-1", orgId: "org-A" });
    mockPrisma.contact.upsert.mockResolvedValue({
      id: "contact-1",
      orgId: "org-A",
    });
    const res = await POST(
      req("https://test.vyne/api/admin/restore?dryRun=0", validDump("org-A")),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: { totalRestored: number; totalErrors: number };
    };
    expect(body.summary.totalRestored).toBe(2);
    expect(body.summary.totalErrors).toBe(0);
    expect(mockPrisma.deal.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.contact.upsert).toHaveBeenCalledTimes(1);
  });

  it("rewrites every row's orgId to targetOrgId — body cannot smuggle into another tenant", async () => {
    mockPrisma.deal.upsert.mockResolvedValue({ id: "deal-1", orgId: "org-A" });
    mockPrisma.contact.upsert.mockResolvedValue({
      id: "contact-1",
      orgId: "org-A",
    });
    // Dump claims to be from "org-evil" — we should NOT trust it.
    await POST(
      req(
        "https://test.vyne/api/admin/restore?dryRun=0&targetOrgId=org-A",
        validDump("org-evil"),
      ),
    );
    const dealCall = mockPrisma.deal.upsert.mock.calls[0]?.[0] as {
      create: { orgId: string };
      update: { orgId: string };
    };
    expect(dealCall.create.orgId).toBe("org-A");
    expect(dealCall.update.orgId).toBe("org-A");
  });

  it("returns 400 for a body that isn't a backup payload", async () => {
    const res = await POST(
      req("https://test.vyne/api/admin/restore", { hello: "world" }),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.deal.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const r = new Request("https://test.vyne/api/admin/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });

  it("blocks non-admin callers via requireRole", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockImplementationOnce(denied);
    const res = await POST(
      req("https://test.vyne/api/admin/restore", validDump()),
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.deal.upsert).not.toHaveBeenCalled();
  });

  it("skips rows without an id (idempotency requires a primary key)", async () => {
    const dump = {
      generatedAt: "2026-06-01T00:00:00Z",
      orgId: "org-A",
      counts: { deals: 2 },
      data: {
        deals: [
          { orgId: "org-A", company: "no-id" },
          { id: "deal-keep", orgId: "org-A", company: "has-id" },
        ],
      },
    };
    mockPrisma.deal.upsert.mockResolvedValue({
      id: "deal-keep",
      orgId: "org-A",
    });
    const res = await POST(
      req("https://test.vyne/api/admin/restore?dryRun=0", dump),
    );
    const body = (await res.json()) as {
      summary: { totalAttempted: number; totalRestored: number };
      perEntity: { entity: string; restored: number; skipped: number }[];
    };
    expect(body.summary.totalAttempted).toBe(2);
    expect(body.summary.totalRestored).toBe(1);
    const dealResult = body.perEntity.find((p) => p.entity === "deals");
    expect(dealResult?.skipped).toBe(1);
    expect(mockPrisma.deal.upsert).toHaveBeenCalledTimes(1);
  });

  it("collects per-row upsert errors but keeps going", async () => {
    mockPrisma.deal.upsert.mockRejectedValueOnce(new Error("deadlock"));
    mockPrisma.contact.upsert.mockResolvedValue({
      id: "contact-1",
      orgId: "org-A",
    });
    const res = await POST(
      req("https://test.vyne/api/admin/restore?dryRun=0", validDump("org-A")),
    );
    const body = (await res.json()) as {
      ok: boolean;
      summary: { totalErrors: number; totalRestored: number };
    };
    // ok=false because there was an error, but contacts still got
    // restored — a single bad row doesn't take out the whole restore.
    expect(body.ok).toBe(false);
    expect(body.summary.totalErrors).toBe(1);
    expect(body.summary.totalRestored).toBe(1);
  });
});
