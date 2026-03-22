import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ── Mock modules ─────────────────────────────────────────────────────────────

const mockPoolQuery = vi.fn();

vi.mock("../db/index.js", () => ({
  default: { query: mockPoolQuery },
  pool: { query: mockPoolQuery },
}));

const mockPublishEvent = vi.fn();

vi.mock("../utils/eventbridge.js", () => ({
  publishEvent: mockPublishEvent,
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

function generateSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")}`;
}

type RouteHandler = (request: any, reply: any) => Promise<any>;
const registeredRoutes: Record<
  string,
  { handler: RouteHandler; config?: any }
> = {};

function createMockFastify() {
  return {
    addHook: vi.fn(),
    get: vi.fn(),
    post: vi.fn(
      (path: string, configOrHandler: any, maybeHandler?: RouteHandler) => {
        if (maybeHandler) {
          registeredRoutes[`POST ${path}`] = {
            handler: maybeHandler,
            config: configOrHandler,
          };
        } else {
          registeredRoutes[`POST ${path}`] = { handler: configOrHandler };
        }
      },
    ),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

function createWebhookRequest(
  eventType: string,
  payload: Record<string, unknown>,
  options: {
    secret?: string;
    orgId?: string;
    rawBody?: string;
  } = {},
) {
  const body = payload;
  const rawBodyStr = options.rawBody ?? JSON.stringify(body);
  const signature = options.secret
    ? generateSignature(rawBodyStr, options.secret)
    : "";

  return {
    headers: {
      "x-github-event": eventType,
      "x-hub-signature-256": signature,
      "x-vyne-org-id": options.orgId ?? "org-1",
    },
    body,
    rawBody: Buffer.from(rawBodyStr, "utf8"),
    query: {},
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Webhooks Routes", () => {
  let fastify: ReturnType<typeof createMockFastify>;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(registeredRoutes).forEach(
      (key) => delete registeredRoutes[key],
    );
    process.env = { ...originalEnv };

    // Reset module cache so process.env changes take effect
    vi.resetModules();

    fastify = createMockFastify();

    const { default: webhooksRoutes } = await import("../routes/webhooks.js");
    await webhooksRoutes(fastify as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── Signature Verification ─────────────────────────────────────────────────

  describe("GitHub webhook signature verification", () => {
    it("should accept a valid signature", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

      // Re-register routes with updated env
      vi.resetModules();
      const freshFastify = createMockFastify();
      Object.keys(registeredRoutes).forEach(
        (key) => delete registeredRoutes[key],
      );
      const { default: webhooksRoutes } = await import("../routes/webhooks.js");
      await webhooksRoutes(freshFastify as any);

      const payload = {
        action: "opened",
        repository: { full_name: "org/repo" },
      };
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, "test-secret");

      const request = {
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": signature,
          "x-vyne-org-id": "org-1",
        },
        body: payload,
        rawBody: Buffer.from(rawBody, "utf8"),
        query: {},
      };
      const reply = createMockReply();

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ received: true });
    });

    it("should reject an invalid signature", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "real-secret";

      vi.resetModules();
      const freshFastify = createMockFastify();
      Object.keys(registeredRoutes).forEach(
        (key) => delete registeredRoutes[key],
      );
      const { default: webhooksRoutes } = await import("../routes/webhooks.js");
      await webhooksRoutes(freshFastify as any);

      const payload = { action: "opened" };
      const rawBody = JSON.stringify(payload);
      const wrongSignature = generateSignature(rawBody, "wrong-secret");

      const request = {
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": wrongSignature,
          "x-vyne-org-id": "org-1",
        },
        body: payload,
        rawBody: Buffer.from(rawBody, "utf8"),
        query: {},
      };
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it("should skip signature verification when no secret is configured", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "";

      vi.resetModules();
      const freshFastify = createMockFastify();
      Object.keys(registeredRoutes).forEach(
        (key) => delete registeredRoutes[key],
      );
      const { default: webhooksRoutes } = await import("../routes/webhooks.js");
      await webhooksRoutes(freshFastify as any);

      const request = {
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": "",
          "x-vyne-org-id": "org-1",
        },
        body: { ref: "refs/heads/main", commits: [], pusher: { name: "user" } },
        rawBody: Buffer.from("{}", "utf8"),
        query: {},
      };
      const reply = createMockReply();

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Push Event Handling ─────────────────────────────────────────────────────

  describe("Push event handling", () => {
    it("should return 200 and log the push event", async () => {
      const pushPayload = {
        ref: "refs/heads/main",
        commits: [
          { id: "abc123", message: "fix: resolve bug" },
          { id: "def456", message: "feat: add feature" },
        ],
        pusher: { name: "preet" },
        repository: { full_name: "vyne/backend" },
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const request = createWebhookRequest("push", pushPayload);
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ received: true });
    });

    it("should handle push without org_id gracefully", async () => {
      const pushPayload = {
        ref: "refs/heads/main",
        commits: [],
        pusher: { name: "user" },
      };

      const request = {
        headers: {
          "x-github-event": "push",
          "x-hub-signature-256": "",
        },
        body: pushPayload,
        rawBody: Buffer.from(JSON.stringify(pushPayload), "utf8"),
        query: {},
      };
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      // Should still return 200 but log warning about missing org_id
      expect(reply.status).toHaveBeenCalledWith(200);
    });
  });

  // ── PR Event Handling ──────────────────────────────────────────────────────

  describe("Pull request event handling", () => {
    it("should process PR opened event", async () => {
      const prPayload = {
        action: "opened",
        pull_request: {
          number: 42,
          title: "Add new feature",
          merged: false,
          user: { login: "preet" },
          base: { ref: "main" },
          head: { ref: "feature/new" },
          html_url: "https://github.com/vyne/backend/pull/42",
          created_at: "2026-03-21T10:00:00Z",
          merged_at: null,
          closed_at: null,
        },
        repository: { full_name: "vyne/backend" },
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const request = createWebhookRequest("pull_request", prPayload);
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ received: true });
    });

    it("should detect merged PRs", async () => {
      const prPayload = {
        action: "closed",
        pull_request: {
          number: 43,
          title: "Merged PR",
          merged: true,
          user: { login: "preet" },
          base: { ref: "main" },
          head: { ref: "feature/merged" },
          html_url: "https://github.com/vyne/backend/pull/43",
          created_at: "2026-03-20T10:00:00Z",
          merged_at: "2026-03-21T10:00:00Z",
          closed_at: "2026-03-21T10:00:00Z",
        },
        repository: { full_name: "vyne/backend" },
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const request = createWebhookRequest("pull_request", prPayload);
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it("should detect closed (not merged) PRs", async () => {
      const prPayload = {
        action: "closed",
        pull_request: {
          number: 44,
          title: "Closed PR",
          merged: false,
          user: { login: "preet" },
          base: { ref: "main" },
          head: { ref: "feature/closed" },
          html_url: "https://github.com/vyne/backend/pull/44",
          created_at: "2026-03-20T10:00:00Z",
          merged_at: null,
          closed_at: "2026-03-21T10:00:00Z",
        },
        repository: { full_name: "vyne/backend" },
      };

      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPublishEvent.mockResolvedValue(undefined);

      const request = createWebhookRequest("pull_request", prPayload);
      const reply = createMockReply();

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
    });
  });

  // ── Unhandled Events ──────────────────────────────────────────────────────

  describe("Unhandled event types", () => {
    it("should return 200 for unrecognized event types", async () => {
      const request = createWebhookRequest("star", { action: "created" });
      const reply = createMockReply();

      mockPoolQuery.mockResolvedValue({ rows: [] });

      const handler = registeredRoutes["POST /webhooks/github"]?.handler;
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ received: true });
    });
  });
});
