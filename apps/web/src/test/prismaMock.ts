// PH-F R2 — Prisma mock harness for integration tests.
//
// Lets route-handler tests assert tenant scoping + business logic
// without spinning a real Postgres in CI. Pattern:
//
//   import { mockPrisma, resetPrismaMock } from "@/test/prismaMock";
//   beforeEach(() => resetPrismaMock());
//
//   it("filters list on orgId", async () => {
//     mockPrisma.deal.findMany.mockResolvedValue([{id:"d1", orgId:"A", ...}]);
//     const res = await GET(reqAsOrg("A"));
//     ...
//   });
//
// We auto-replace `@/lib/prisma` with our mock via vi.mock so every
// route handler picks up the stub without changing its imports.

import { vi } from "vitest";

type AnyFn = (...args: never[]) => unknown;
type Model = {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};

function makeModel(): Model {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  };
}

const MODELS = [
  "user",
  "subscription",
  "passwordResetToken",
  "deal",
  "contact",
  "account",
  "customer",
  "invoice",
  "product",
  "order",
  "supplier",
  "journalEntry",
  "project",
  "task",
  "taskDependency",
  "expense",
  "salesOpportunity",
  "salesQuote",
  "salesOrder",
  "salesProduct",
  "salesCustomer",
  "fieldTechnician",
  "fieldJob",
  "employee",
  "leaveRequest",
  "auditEvent",
  "pushSubscription",
  "embedding",
  "consent",
  "accountDeletion",
  "auditChecksum",
] as const;

type ModelKey = (typeof MODELS)[number];
type MockPrisma = Record<ModelKey, Model> & {
  $transaction: ReturnType<typeof vi.fn>;
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
};

function buildMock(): MockPrisma {
  const out = {} as Record<string, unknown>;
  for (const m of MODELS) out[m] = makeModel();
  out.$transaction = vi.fn(async (arg: unknown) => {
    // Accept either array of promises (resolve all) or a callback (call
    // with the same mock).
    if (Array.isArray(arg)) {
      return Promise.all(arg as Promise<unknown>[]);
    }
    if (typeof arg === "function") {
      return (arg as AnyFn)(out as never);
    }
    return undefined;
  });
  out.$connect = vi.fn(async () => undefined);
  out.$disconnect = vi.fn(async () => undefined);
  return out as MockPrisma;
}

export const mockPrisma: MockPrisma = buildMock();

/** Reset every mock between tests so no leak from one test poisons
 *  the next. Call in beforeEach. */
export function resetPrismaMock(): void {
  for (const m of MODELS) {
    const model = mockPrisma[m];
    for (const fn of Object.values(model)) {
      (fn as { mockReset: () => void }).mockReset();
    }
  }
  mockPrisma.$transaction.mockReset();
  mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[]);
    if (typeof arg === "function") return (arg as AnyFn)(mockPrisma as never);
    return undefined;
  });
  mockPrisma.$connect.mockReset();
  mockPrisma.$disconnect.mockReset();
}

// Auto-wire the mock so any test importing this file gets `prisma`
// stubbed everywhere it's used. Tests just import this once.
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

/** Build a Request with the `vyne-token` cookie set to a payload that
 *  resolves to the given userId + orgId. The auth layer uses an HMAC,
 *  but tests only need the SHAPE to flow through — the test sets up
 *  the User row in mockPrisma so resolveSession's DB fallback picks
 *  up the right orgId without needing a valid signature. */
export function reqAsOrg(orgId: string, userId = `user-${orgId}`) {
  // Compose a fake but parseable cookie. resolveTenant calls
  // verifySessionToken which validates the HMAC — for unit tests
  // we shortcut by also mocking the tenantGuard module separately.
  // This helper exists for tests that override the auth layer too.
  return new Request("https://test.vyne/api/x", {
    headers: {
      cookie: `vyne-token=test-token-${userId}`,
      "x-forwarded-for": "127.0.0.1",
    },
  });
}
