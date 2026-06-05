// PH-F R3 — Tenant isolation tests for createCrudHandlers, the shared
// factory used by 20+ CRUD routes:
//   /api/contacts, /api/accounts, /api/customers, /api/invoices,
//   /api/products, /api/projects, /api/tasks, /api/task-dependencies,
//   /api/orders, /api/suppliers, /api/journal-entries, /api/expenses,
//   /api/sales/{opportunities, quotes, orders, products, customers},
//   /api/field-service/{jobs, technicians}, /api/hr/{employees, leave-requests}
//
// Covering the factory is strictly more powerful than per-route tests:
// any tenant-isolation bug here would leak data across every consumer.
// Instead of writing 80+ near-identical tests (one per HTTP verb per
// route), we exhaustively test the factory's contract using "contact" as
// a stand-in Prisma model. The same handlers serve every other resource.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

const tenantA = {
  userId: "user-A",
  orgId: "org-A",
  email: "a@vyne.app",
  role: "owner" as const,
  demo: false,
};
const tenantB = {
  userId: "user-B",
  orgId: "org-B",
  email: "b@vyne.app",
  role: "owner" as const,
  demo: false,
};

vi.mock("@/lib/auth/tenantGuard", () => ({
  requireTenant: vi.fn(),
  requireRealTenant: vi.fn(),
  resolveTenant: vi.fn(),
  VYNE_DEMO_ORG_ID: "org-demo",
}));

vi.mock("@/lib/auth/role", () => ({
  requireRole: vi.fn(async () => null), // null === pass
  WRITE_ROLES: ["owner", "admin", "manager", "member"],
  ADMIN_ROLES: ["owner", "admin"],
}));

vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/pusher", () => ({
  publish: vi.fn(() => Promise.resolve()),
}));

import { requireTenant } from "@/lib/auth/tenantGuard";
import { requireRole } from "@/lib/auth/role";
import { rateLimit } from "@/lib/api/security";
import { publish } from "@/lib/pusher";
import { createCrudHandlers } from "../crud";

const handlers = createCrudHandlers({
  model: "contact",
  resource: "contacts",
  events: {
    created: "contact:created",
    updated: "contact:updated",
    deleted: "contact:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    email: typeof b.email === "string" ? b.email : "",
  }),
});

beforeEach(() => {
  resetPrismaMock();
  (requireTenant as ReturnType<typeof vi.fn>).mockReset();
  (requireRole as ReturnType<typeof vi.fn>).mockReset();
  (requireRole as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (publish as ReturnType<typeof vi.fn>).mockClear();
});

function req(method: string, body?: unknown): Request {
  return new Request("https://test.vyne/api/contacts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("createCrudHandlers — tenant isolation", () => {
  describe("list (GET)", () => {
    it("filters findMany on the caller's orgId", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      const res = await handlers.list(req("GET"));
      expect(res.status).toBe(200);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: "org-A" },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      );
    });

    it("does NOT call findMany without a tenant context (401 short-circuit)", async () => {
      const unauthorized = new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
        },
      );
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
        unauthorized,
      );
      const res = await handlers.list(req("GET"));
      expect(res.status).toBe(401);
      expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
    });

    it("returns the rate limiter's response when limit is exceeded", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      const ratelimited = new Response("Too many", { status: 429 });
      (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        response: ratelimited,
      });
      const res = await handlers.list(req("GET"));
      expect(res.status).toBe(429);
      expect(mockPrisma.contact.findMany).not.toHaveBeenCalled();
    });
  });

  describe("create (POST)", () => {
    it("stamps the caller's orgId on the new row", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.create.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
        name: "Acme",
        email: "",
      });
      const res = await handlers.create(req("POST", { name: "Acme" }));
      expect(res.status).toBe(200);
      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: "org-A",
            name: "Acme",
          }),
        }),
      );
    });

    it("ignores body-provided orgId — never lets the client choose the tenant", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.create.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
        name: "Mallet",
      });
      // Attacker tries to plant a row in org-B from a session in org-A.
      await handlers.create(req("POST", { name: "Mallet", orgId: "org-B" }));
      const callArgs = mockPrisma.contact.create.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      // The factory spreads { orgId: ctx.orgId, ...data } so the
      // session's orgId wins via property-order: any orgId in the body
      // gets overwritten. Defense in depth: this is the assertion that
      // would catch a refactor flipping the spread order.
      expect(callArgs.data.orgId).toBe("org-A");
    });

    it("returns 400 for invalid JSON body", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      const badReq = new Request("https://test.vyne/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      });
      const res = await handlers.create(badReq);
      expect(res.status).toBe(400);
      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("gates writes through requireRole — returns the role-check response on denial", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      const forbidden = new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
      });
      (requireRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        forbidden,
      );
      const res = await handlers.create(req("POST", { name: "X" }));
      expect(res.status).toBe(403);
      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("emits the created event on the tenant-scoped Pusher channel", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.create.mockResolvedValue({
        id: "c-new",
        orgId: "org-A",
        name: "Pub Test",
      });
      await handlers.create(req("POST", { name: "Pub Test" }));
      expect(publish).toHaveBeenCalledWith(
        "org-org-A",
        "contact:created",
        expect.objectContaining({ id: "c-new", orgId: "org-A" }),
      );
    });
  });

  describe("update (PATCH)", () => {
    it("returns 404 when the row belongs to another org (no cross-tenant write)", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      // findFirst with {id, orgId: org-A} returns null because the
      // row is owned by org-B.
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      const res = await handlers.update(req("PATCH", { name: "Hijack" }), {
        params: Promise.resolve({ id: "row-from-B" }),
      });
      expect(res.status).toBe(404);
      // The critical assertion: the factory MUST NOT have called .update
      // when findFirst returned null. Cross-tenant probes must be invisible.
      expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    });

    it("strips orgId from the body — even an authenticated user can't move their row to another tenant", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
        name: "Renamed",
      });
      await handlers.update(
        req("PATCH", { name: "Renamed", orgId: "org-B", org_id: "org-B" }),
        { params: Promise.resolve({ id: "c1" }) },
      );
      const updateArg = mockPrisma.contact.update.mock.calls[0]?.[0] as {
        data: Record<string, unknown>;
      };
      expect(updateArg.data).not.toHaveProperty("orgId");
      expect(updateArg.data).not.toHaveProperty("org_id");
      expect(updateArg.data).toEqual({ name: "Renamed" });
    });

    it("succeeds when the row belongs to the caller's org", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
        name: "Renamed",
      });
      const res = await handlers.update(req("PATCH", { name: "Renamed" }), {
        params: Promise.resolve({ id: "c1" }),
      });
      expect(res.status).toBe(200);
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1", orgId: "org-A" },
        }),
      );
    });
  });

  describe("remove (DELETE)", () => {
    it("returns 404 for cross-tenant probes and never invokes delete", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantB);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      const res = await handlers.remove(req("DELETE"), {
        params: Promise.resolve({ id: "row-from-A" }),
      });
      expect(res.status).toBe(404);
      expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
    });

    it("deletes only after the tenancy check passes", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "c1",
        orgId: "org-A",
      });
      mockPrisma.contact.delete.mockResolvedValue({ id: "c1" });
      const res = await handlers.remove(req("DELETE"), {
        params: Promise.resolve({ id: "c1" }),
      });
      expect(res.status).toBe(200);
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1", orgId: "org-A" },
        }),
      );
      expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
    });

    it("gates deletes through requireRole — admin-only by default", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      const forbidden = new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
      });
      (requireRole as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        forbidden,
      );
      const res = await handlers.remove(req("DELETE"), {
        params: Promise.resolve({ id: "c1" }),
      });
      expect(res.status).toBe(403);
      expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
    });
  });
});
