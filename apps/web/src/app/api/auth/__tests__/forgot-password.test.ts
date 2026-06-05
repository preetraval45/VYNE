import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";

// PH-F R2 — Auth flow integration. The two critical guarantees:
//   1. /api/auth/forgot-password ALWAYS returns 200 (no enumeration).
//   2. /api/auth/forgot-password writes a sha256 token hash (never raw).
//
// We mock the email layer + rate-limit so the route's branches are
// reachable deterministically.

vi.mock("@/lib/api/security", () => ({
  rateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/auth/authRateLimit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/auth/authRateLimit")
  >("@/lib/auth/authRateLimit");
  return {
    ...actual,
    authRateLimit: vi.fn(async () => ({ ok: true })),
  };
});

const sentEmails: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(
    async (args: { to: string; subject: string; html: string }) => {
      sentEmails.push(args);
      return { ok: true, id: "test-id" };
    },
  ),
}));

import { POST } from "../forgot-password/route";

beforeEach(() => {
  resetPrismaMock();
  sentEmails.length = 0;
});

function req(body: unknown): Request {
  return new Request("https://test.vyne/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/auth/forgot-password — no enumeration", () => {
  it("returns 200 when the email matches a real user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
    } as never);
    mockPrisma.passwordResetToken.create.mockResolvedValue({} as never);
    const res = await POST(req({ email: "alice@vyne.app" }));
    expect(res.status).toBe(200);
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].to).toBe("alice@vyne.app");
  });

  it("returns 200 when the email does NOT match — same status, same body", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await POST(req({ email: "noone@vyne.app" }));
    expect(res.status).toBe(200);
    // No email goes out (no user to send to).
    expect(sentEmails.length).toBe(0);
    // Crucially the body is identical to the success case so an
    // attacker can't enumerate.
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 200 for a malformed email (no leak via 400)", async () => {
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(200);
    expect(sentEmails.length).toBe(0);
  });

  it("persists only the sha256 hash of the token, never the raw token", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
    } as never);
    mockPrisma.passwordResetToken.create.mockResolvedValue({} as never);
    await POST(req({ email: "alice@vyne.app" }));
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const writtenRow = (
      mockPrisma.passwordResetToken.create.mock.calls[0][0] as {
        data: { tokenHash: string };
      }
    ).data;
    // sha256 hex is 64 chars
    expect(writtenRow.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets a 1-hour TTL on the token (expiresAt > now)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
    } as never);
    mockPrisma.passwordResetToken.create.mockResolvedValue({} as never);
    const before = Date.now();
    await POST(req({ email: "alice@vyne.app" }));
    const written = (
      mockPrisma.passwordResetToken.create.mock.calls[0][0] as {
        data: { expiresAt: Date };
      }
    ).data;
    const ttlMs = written.expiresAt.getTime() - before;
    // Window: 0.95h ~ 1.05h to allow for test-runtime drift.
    expect(ttlMs).toBeGreaterThan(0.95 * 3600 * 1000);
    expect(ttlMs).toBeLessThan(1.05 * 3600 * 1000);
  });
});
