import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock modules ─────────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock("../db/index.js", () => ({
  query: mockQuery,
}));

vi.mock("../middleware/auth.js", () => ({
  authenticate: vi.fn(async () => {}),
}));

vi.mock("../workers/queue.js", () => ({
  enqueueEmbedding: vi.fn(),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned"),
}));

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
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
      role: "member" as const,
    },
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  };
}

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
    delete: vi.fn((path: string, ...args: any[]) => {
      const handler = args[args.length - 1] as RouteHandler;
      registeredRoutes[`DELETE ${path}`] = handler;
    }),
    put: vi.fn((path: string, handler: RouteHandler) => {
      registeredRoutes[`PUT ${path}`] = handler;
    }),
    io: null,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Messages Routes", () => {
  let fastify: ReturnType<typeof createMockFastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(registeredRoutes).forEach(
      (key) => delete registeredRoutes[key],
    );

    fastify = createMockFastify();

    const { default: messagesRoutes } = await import("../routes/messages.js");
    await messagesRoutes(fastify as any);
  });

  // ── POST /channels/:id/messages ────────────────────────────────────────────

  describe("POST /channels/:id/messages", () => {
    it("should send a message and return 201", async () => {
      const newMessage = {
        id: "msg-1",
        org_id: "org-1",
        channel_id: "ch-1",
        user_id: "user-1",
        content: "Hello world",
        type: "text",
        created_at: new Date(),
      };

      // assertChannelMember query
      mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
      // INSERT message
      mockQuery.mockResolvedValueOnce({ rows: [newMessage] });

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { content: "Hello world", type: "text" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({ message: newMessage });
    });

    it("should return 400 when content is empty and no attachments", async () => {
      // assertChannelMember
      mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { type: "text" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("should return 403 when user is not a channel member", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // not a member

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { content: "Hello", type: "text" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it("should return 400 for content exceeding max length", async () => {
      const longContent = "x".repeat(10_001);

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: { content: longContent, type: "text" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("should handle thread reply by incrementing parent reply count", async () => {
      const threadParentId = "parent-msg-1";
      const newMessage = {
        id: "msg-reply-1",
        org_id: "org-1",
        channel_id: "ch-1",
        user_id: "user-1",
        content: "Thread reply",
        type: "text",
        thread_id: threadParentId,
        created_at: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // channel member
        .mockResolvedValueOnce({ rows: [newMessage] }) // INSERT message
        .mockResolvedValueOnce({ rows: [] }); // UPDATE parent reply_count

      const request = createMockRequest({
        params: { id: "ch-1" },
        body: {
          content: "Thread reply",
          type: "text",
          threadId: threadParentId,
        },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      // Verify the parent reply_count update was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("reply_count"),
        [threadParentId],
      );
    });
  });

  // ── POST /messages/:id/reactions ───────────────────────────────────────────

  describe("POST /messages/:id/reactions", () => {
    it("should toggle a reaction on a message", async () => {
      const updatedMessage = {
        id: "msg-1",
        channel_id: "ch-1",
        reactions: { "👍": ["user-1"] },
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedMessage] });

      const request = createMockRequest({
        params: { id: "msg-1" },
        body: { emoji: "👍" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /messages/:id/reactions"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        reactions: updatedMessage.reactions,
      });
    });

    it("should return 400 for empty emoji", async () => {
      const request = createMockRequest({
        params: { id: "msg-1" },
        body: { emoji: "" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /messages/:id/reactions"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 when message not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        params: { id: "nonexistent" },
        body: { emoji: "👍" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["POST /messages/:id/reactions"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });
  });

  // ── PATCH /messages/:id ───────────────────────────────────────────────────

  describe("PATCH /messages/:id", () => {
    it("should edit a message", async () => {
      const updatedMessage = {
        id: "msg-1",
        channel_id: "ch-1",
        content: "Updated content",
        is_edited: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedMessage] });

      const request = createMockRequest({
        params: { id: "msg-1" },
        body: { content: "Updated content" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["PATCH /messages/:id"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ message: updatedMessage });
    });

    it("should return 404 when message not found or not the author", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        params: { id: "nonexistent" },
        body: { content: "Updated content" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["PATCH /messages/:id"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it("should return 400 for empty edit content", async () => {
      const request = createMockRequest({
        params: { id: "msg-1" },
        body: { content: "" },
      });
      const reply = createMockReply();

      const handler = registeredRoutes["PATCH /messages/:id"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ── GET /channels/:id/messages ─────────────────────────────────────────────

  describe("GET /channels/:id/messages", () => {
    it("should return messages for a channel the user belongs to", async () => {
      const messages = [
        { id: "msg-1", content: "Hello", created_at: new Date() },
        { id: "msg-2", content: "World", created_at: new Date() },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // assertChannelMember
        .mockResolvedValueOnce({ rows: messages }); // SELECT messages

      const request = createMockRequest({
        params: { id: "ch-1" },
        query: {},
      });
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          hasMore: expect.any(Boolean),
        }),
      );
    });

    it("should return 403 when user is not a member", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // not a member

      const request = createMockRequest({
        params: { id: "ch-1" },
        query: {},
      });
      const reply = createMockReply();

      const handler = registeredRoutes["GET /channels/:id/messages"];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });
});
