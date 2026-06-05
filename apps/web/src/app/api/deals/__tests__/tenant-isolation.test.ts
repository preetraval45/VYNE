import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

// PH-F R2 — Integration test for the highest-value security property:
// /api/deals filters on session.orgId in every read + write. A bug
// here is a multi-tenant data leak, so we exhaust every handler path.
//
// We mock `requireTenant` so the handlers see a deterministic
// TenantContext without needing a valid HMAC-signed session cookie.

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

// Also disable rate limiting for these unit-level tests; the limiter
// has its own test path elsewhere.
vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
  requireAuth: vi.fn(),
  generateCsrfToken: vi.fn(() => "test-csrf"),
  csrfCookieAttrs: vi.fn(() => ""),
}));

vi.mock("@/lib/pusher", () => ({
  publish: vi.fn(() => Promise.resolve()),
}));

import { requireTenant } from "@/lib/auth/tenantGuard";
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

beforeEach(() => {
  resetPrismaMock();
  (requireTenant as ReturnType<typeof vi.fn>).mockReset();
});

function req(method: string, body?: unknown): Request {
  return new Request("https://test.vyne/api/deals", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/deals — tenant isolation", () => {
  describe("GET", () => {
    it("filters findMany on the caller's orgId", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.deal.findMany.mockResolvedValue([]);
      await GET(req("GET"));
      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: "org-A" } }),
      );
    });

    it("returns 401 when no session is present", async () => {
      const unauthorized = new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 },
      );
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
        unauthorized,
      );
      const res = await GET(req("GET"));
      expect(res.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("writes the caller's orgId into the new row", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.deal.create.mockResolvedValue({
        id: "deal-1",
        orgId: "org-A",
        company: "Acme",
        contactName: "",
        email: "",
        stage: "Lead",
        value: 0,
        probability: 0,
        assignee: "Alex",
        source: "inbound",
        nextAction: "",
        notes: "",
        customFields: null,
        lastActivity: new Date(),
      });
      await POST(req("POST", { company: "Acme" }));
      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId: "org-A", company: "Acme" }),
        }),
      );
    });

    it("rejects body without company", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      const res = await POST(req("POST", {}));
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH", () => {
    it("returns 404 when the deal belongs to another org (no cross-tenant access)", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      // findFirst with {id, orgId: A} returns null because the deal is
      // owned by org-B.
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      const res = await PATCH(req("PATCH", { stage: "Won" }), {
        params: Promise.resolve({ id: "deal-from-B" }),
      });
      expect(res.status).toBe(404);
      // Crucially: we did NOT call .update on a row from another org.
      expect(mockPrisma.deal.update).not.toHaveBeenCalled();
    });

    it("allows update when the deal belongs to the caller's org", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantA);
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: "deal-a1",
        orgId: "org-A",
      });
      mockPrisma.deal.update.mockResolvedValue({
        id: "deal-a1",
        orgId: "org-A",
        company: "Acme",
        contactName: "",
        email: "",
        stage: "Won",
        value: 0,
        probability: 100,
        assignee: "Alex",
        source: "inbound",
        nextAction: "",
        notes: "",
        customFields: null,
        lastActivity: new Date(),
      });
      const res = await PATCH(req("PATCH", { stage: "Won" }), {
        params: Promise.resolve({ id: "deal-a1" }),
      });
      expect(res.status).toBe(200);
      expect(mockPrisma.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "deal-a1", orgId: "org-A" } }),
      );
    });
  });

  describe("DELETE", () => {
    it("returns 404 cross-tenant, never invokes delete", async () => {
      (requireTenant as ReturnType<typeof vi.fn>).mockResolvedValue(tenantB);
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      const res = await DELETE(req("DELETE"), {
        params: Promise.resolve({ id: "deal-from-A" }),
      });
      expect(res.status).toBe(404);
      expect(mockPrisma.deal.delete).not.toHaveBeenCalled();
    });
  });
});
