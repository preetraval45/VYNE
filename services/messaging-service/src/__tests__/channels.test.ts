import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock modules before importing the route ──────────────────────────────────

const mockQuery = vi.fn();
const mockWithTransaction = vi.fn();

vi.mock("../db/index.js", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

vi.mock("../middleware/auth.js", () => ({
  authenticate: vi.fn(async () => {}),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockReply() {
  const reply: Record<string, any> = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    user: {
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      role: "owner" as const,
    },
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  };
}

// We need to simulate Fastify route registration to extract handlers
type RouteHandler = (request: any, reply: any) => Promise<any>;

const registeredRoutes: Record<string, RouteHandler> = {};

function createMockFastify() {
  return {
    addHook: vi.fn(),
    get: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`GET ${path}`] = handler;
    }),
    post: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`POST ${path}`] = handler;
    }),
    patch: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`PATCH ${path}`] = handler;
    }),
    delete: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`DELETE ${path}`] = handler;
    }),
    put: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`PUT ${path}`] = handler;
    }),
    io: null,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Channels Routes", () => {
  let fastify: ReturnType<typeof createMockFastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(registeredRoutes).forEach(
      (key) => delete registeredRoutes[key],
    );

    fastify = createMockFastify();

    // Import and register routes
    const { default: channelsRoutes } = await import("../routes/channels.js");
    await channelsRoutes(fastify as any);
  });

  // ── POST /channels ───────────────────────────────────────────────────────

  describe("POST /channels", () => {
    it("should create a channel and return 201", async () => {
      const newChannel = {
        id: "channel-1",
        org_id: "org-1",
        name: "general",
        description: null,
        type: "public",
        created_by: "user-1",
        created_at: new Date(),
      };

      mockWithTransaction.mockImplementation(async (callback: any) => {
        const txQuery = vi.fn();
        txQuery.mockResolvedValueOnce({ rows: [newChannel] }); // INSERT channel
        txQuery.mockResolvedValueOnce({ rows: [] }); // INSERT member
        return callback(txQuery);
      });

      const request = createMockRequest({
        body: { name: "general", type: "public" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({ channel: newChannel });
    });

    it("should return 400 for invalid channel name", async () => {
      const request = createMockRequest({
        body: { name: "INVALID NAME!", type: "public" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 for empty channel name", async () => {
      const request = createMockRequest({
        body: { name: "", type: "public" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 for channel name exceeding max length", async () => {
      const longName = "a".repeat(101);
      const request = createMockRequest({
        body: { name: longName, type: "public" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ── GET /channels ────────────────────────────────────────────────────────

  describe("GET /channels", () => {
    it("should list channels for the authenticated user", async () => {
      const channels = [
        {
          id: "ch-1",
          org_id: "org-1",
          name: "general",
          type: "public",
          member_role: "owner",
          last_read_at: new Date(),
        },
        {
          id: "ch-2",
          org_id: "org-1",
          name: "random",
          type: "public",
          member_role: "member",
          last_read_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: channels });

      const request = createMockRequest();
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ channels });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT c.*"),
        ["user-1", "org-1"],
      );
    });

    it("should return empty array when user has no channels", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest();
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ channels: [] });
    });
  });

  // ── POST /channels/:id/members ────────────────────────────────────────────

  describe("POST /channels/:id/members", () => {
    it("should add a member when requester is owner", async () => {
      // Requester is owner
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] }) // role check
        .mockResolvedValueOnce({ rows: [] }); // upsert member

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { userId: "new-user-uuid-0000-000000000001" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/members"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
    });

    it("should return 403 when requester is a regular member", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ role: "member" }] });

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { userId: "new-user-uuid-0000-000000000001" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/members"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it("should return 404 when channel not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        params: { id: "nonexistent" },
        body: { userId: "new-user-uuid-0000-000000000001" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/members"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 for invalid userId", async () => {
      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { userId: "not-a-uuid" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/members"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ── GET /channels/:id ────────────────────────────────────────────────────

  describe("GET /channels/:id", () => {
    it("should return channel when user is a member", async () => {
      const channel = {
        id: "ch-1",
        org_id: "org-1",
        name: "general",
        type: "public",
      };
      mockQuery.mockResolvedValueOnce({ rows: [channel] });

      const request = createMockRequest({ params: { id: "ch-1" } });
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels/:id"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ channel });
    });

    it("should return 404 when channel not found or user not a member", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({ params: { id: "nonexistent" } });
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels/:id"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });
  });

  // ── DELETE /channels/:id (archive) ────────────────────────────────────────

  describe("DELETE /channels/:id", () => {
    it("should archive channel when requester is owner", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rows: [] }); // archive update

      const request = createMockRequest({ params: { id: "ch-1" } });
      const reply = createMockReply();

      const handler = registeredRoutes["DELETE /channels/:id"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(204);
    });

    it("should return 403 when non-owner tries to archive", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ role: "member" }] });

      const request = createMockRequest({ params: { id: "ch-1" } });
      const reply = createMockReply();

      const handler = registeredRoutes["DELETE /channels/:id"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });
});
