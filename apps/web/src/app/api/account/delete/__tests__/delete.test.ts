// PH-H — /api/account/delete contract tests.
//
// Four properties we MUST guarantee:
//   1. Unauthenticated callers can't enumerate or trigger deletion.
//   2. POST without `confirm: true` is a dry-run — no deletion record
//      is created. This is the "show me what would be deleted" path.
//   3. POST with `confirm: true` creates the AccountDeletion row with
//      scheduledFor exactly 30 days out, files an audit event, and
//      clears the session cookies.
//   4. The user can cancel their own pending request — same-user only.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

vi.mock("@/lib/auth/role", () => ({
  resolveSession: vi.fn(),
  ADMIN_ROLES: ["owner", "admin"],
}));

vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
}));

import { resolveSession } from "@/lib/auth/role";
import { POST, GET, DELETE } from "../route";

beforeEach(() => {
  resetPrismaMock();
  (resolveSession as ReturnType<typeof vi.fn>).mockReset();
  // Default: logged-in user from org-A.
  (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    uid: "user-1",
    email: "alice@vyne.app",
    role: "owner",
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "alice@vyne.app",
    orgId: "org-A",
  });
  mockPrisma.accountDeletion.findUnique.mockResolvedValue(null);
  // Every tenant-entity count returns 0 by default. Tests can override
  // specific delegates as needed.
  for (const key of [
    "deal",
    "contact",
    "account",
    "customer",
    "invoice",
    "product",
    "project",
    "task",
    "taskDependency",
    "order",
    "supplier",
    "expense",
    "journalEntry",
    "salesOpportunity",
    "salesQuote",
    "salesOrder",
    "salesProduct",
    "salesCustomer",
    "fieldTechnician",
    "fieldJob",
    "employee",
    "leaveRequest",
    "pushSubscription",
    "embedding",
  ] as const) {
    (mockPrisma[key].count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  }
});

function req(method: string, body?: unknown): Request {
  return new Request("https://test.vyne/api/account/delete", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("/api/account/delete — auth gate", () => {
  it("POST returns 401 without a session", async () => {
    (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await POST(req("POST", { confirm: true }));
    expect(res.status).toBe(401);
    expect(mockPrisma.accountDeletion.create).not.toHaveBeenCalled();
  });

  it("GET returns 401 without a session", async () => {
    (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await GET(req("GET"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 without a session", async () => {
    (resolveSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await DELETE(req("DELETE"));
    expect(res.status).toBe(401);
  });
});

describe("/api/account/delete — dry run (POST without confirm)", () => {
  it("returns a preview WITHOUT creating a deletion record", async () => {
    mockPrisma.deal.count.mockResolvedValueOnce(7);
    mockPrisma.contact.count.mockResolvedValueOnce(3);
    const res = await POST(req("POST", {}));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dryRun: boolean;
      preview: {
        user: { id: string; orgId: string };
        scheduledFor: string;
        entityCounts: Record<string, number>;
      };
    };
    expect(body.dryRun).toBe(true);
    expect(body.preview.user.orgId).toBe("org-A");
    expect(body.preview.entityCounts.deal).toBe(7);
    expect(body.preview.entityCounts.contact).toBe(3);
    expect(mockPrisma.accountDeletion.create).not.toHaveBeenCalled();
  });
});

describe("/api/account/delete — confirmed POST", () => {
  it("creates an AccountDeletion row with scheduledFor 30 days out", async () => {
    mockPrisma.accountDeletion.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "ad-1",
        ...data,
        requestedAt: new Date(),
      }),
    );
    const res = await POST(req("POST", { confirm: true, reason: "moving" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dryRun: boolean;
      scheduledFor: string;
      gracePeriodDays: number;
    };
    expect(body.dryRun).toBe(false);
    expect(body.gracePeriodDays).toBe(30);

    const createArg = mockPrisma.accountDeletion.create.mock.calls[0]?.[0] as {
      data: {
        userId: string;
        orgId: string;
        scheduledFor: Date;
        reason: string;
      };
    };
    expect(createArg.data.userId).toBe("user-1");
    expect(createArg.data.orgId).toBe("org-A");
    expect(createArg.data.reason).toBe("moving");
    // scheduledFor is approximately 30 days from now (allow ±60s for clock skew).
    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const actual = createArg.data.scheduledFor.getTime();
    expect(Math.abs(actual - expected)).toBeLessThan(60_000);
  });

  it("files an audit event for the deletion request", async () => {
    mockPrisma.accountDeletion.create.mockResolvedValue({
      id: "ad-1",
      requestedAt: new Date(),
      scheduledFor: new Date(),
    });
    await POST(req("POST", { confirm: true }));
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "account.deletion.requested",
          category: "security",
          actorId: "user-1",
          orgId: "org-A",
        }),
      }),
    );
  });

  it("clears the session cookies in the response", async () => {
    mockPrisma.accountDeletion.create.mockResolvedValue({
      id: "ad-1",
      requestedAt: new Date(),
      scheduledFor: new Date(),
    });
    const res = await POST(req("POST", { confirm: true }));
    // Next.js sets cookies via Set-Cookie headers. Both vyne-token and
    // vyne-demo should be present with Max-Age=0.
    const setCookies = res.headers.getSetCookie?.() ?? [
      res.headers.get("set-cookie") ?? "",
    ];
    const joined = setCookies.join(" | ");
    expect(joined).toMatch(/vyne-token=;/);
    expect(joined).toMatch(/vyne-demo=;/);
  });

  it("is idempotent — second confirm POST does not double-file", async () => {
    const existing = {
      id: "ad-existing",
      userId: "user-1",
      orgId: "org-A",
      requestedAt: new Date("2026-05-01"),
      scheduledFor: new Date("2026-06-01"),
      hardDeletedAt: null,
    };
    mockPrisma.accountDeletion.findUnique.mockResolvedValueOnce(existing);
    const res = await POST(req("POST", { confirm: true }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alreadyPending: boolean };
    expect(body.alreadyPending).toBe(true);
    expect(mockPrisma.accountDeletion.create).not.toHaveBeenCalled();
  });
});

describe("/api/account/delete — GET pending status", () => {
  it("returns pending: true when a request exists", async () => {
    mockPrisma.accountDeletion.findUnique.mockResolvedValueOnce({
      id: "ad-1",
      userId: "user-1",
      orgId: "org-A",
      requestedAt: new Date("2026-05-01"),
      scheduledFor: new Date("2026-06-01"),
      reason: "moving",
      hardDeletedAt: null,
    });
    const res = await GET(req("GET"));
    const body = (await res.json()) as { pending: boolean; reason: string };
    expect(body.pending).toBe(true);
    expect(body.reason).toBe("moving");
  });

  it("returns pending: false when no record exists", async () => {
    const res = await GET(req("GET"));
    const body = (await res.json()) as { pending: boolean };
    expect(body.pending).toBe(false);
  });
});

describe("/api/account/delete — DELETE cancel", () => {
  it("deletes the pending row and files a cancel audit event", async () => {
    mockPrisma.accountDeletion.findUnique.mockResolvedValueOnce({
      id: "ad-1",
      userId: "user-1",
      orgId: "org-A",
      hardDeletedAt: null,
    });
    const res = await DELETE(req("DELETE"));
    const body = (await res.json()) as { canceled: boolean };
    expect(body.canceled).toBe(true);
    expect(mockPrisma.accountDeletion.delete).toHaveBeenCalledWith({
      where: { id: "ad-1" },
    });
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "account.deletion.canceled",
        }),
      }),
    );
  });

  it("no-ops when there is no pending request", async () => {
    const res = await DELETE(req("DELETE"));
    const body = (await res.json()) as { canceled: boolean };
    expect(body.canceled).toBe(false);
    expect(mockPrisma.accountDeletion.delete).not.toHaveBeenCalled();
  });
});
