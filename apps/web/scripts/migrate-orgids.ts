/* eslint-disable no-console */
/**
 * PH-A Round 2 — orgId backfill.
 *
 * Pre-launch, every signup defaulted to `User.orgId = "org-self"`,
 * which collapsed every account onto a single shared tenant. PH-A
 * round 1 fixed the signup path so new accounts each get a unique
 * `org_<random>` id. This script migrates any *existing* `org-self`
 * users onto unique orgIds so the cross-tenant guard works for them too.
 *
 * Idempotent — running it twice is a no-op. Safe to invoke from
 * Vercel Build (one-off) or as a npm script: `pnpm migrate:orgids`.
 *
 * What it does:
 *   1. For every User with orgId in {"org-self", ""}: generate a unique
 *      orgId and UPDATE the row.
 *   2. For each entity table tagged "demo" or "org-self": leave it on
 *      "org-demo" so existing demo workspaces continue rendering. We
 *      can't attribute legacy rows to a specific user (no createdBy on
 *      most entities) — surfacing them under the shared demo tenant is
 *      strictly safer than guessing.
 *   3. Logs counts; exits 0 on success, non-zero on error.
 *
 * Usage:
 *   pnpm dlx tsx apps/web/scripts/migrate-orgids.ts
 *
 * Required env: POSTGRES_PRISMA_URL (same as the app).
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const LEGACY_USER_ORG_IDS = new Set(["org-self", ""]);
const DEMO_ORG_ID = "org-demo";

function freshOrgId(): string {
  // 14-byte url-safe id — matches the signup-route encoding so prod
  // orgIds have a uniform shape.
  const raw = randomBytes(14)
    .toString("base64")
    .replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
  return `org_${raw}`;
}

async function main() {
  const prisma = new PrismaClient();

  let updatedUsers = 0;
  let normalizedDemo = 0;

  try {
    // ─── Step 1: backfill User.orgId ──────────────────────────────
    const legacyUsers = await prisma.user.findMany({
      where: {
        OR: [{ orgId: "org-self" }, { orgId: "" }],
      },
      select: { id: true, email: true, orgId: true },
    });

    console.log(
      `[migrate-orgids] found ${legacyUsers.length} legacy user(s) with org-self / empty orgId`,
    );

    for (const u of legacyUsers) {
      const newOrgId = freshOrgId();
      await prisma.user.update({
        where: { id: u.id },
        data: { orgId: newOrgId },
      });
      console.log(`  ${u.email} → ${newOrgId}`);
      updatedUsers += 1;
    }

    // ─── Step 2: normalize legacy entity orgIds ───────────────────
    // Every entity row with orgId "org-self" gets re-pointed to
    // "org-demo" — that surfaces legacy data on the public demo tour
    // without leaking it into a real customer's tenant.
    const tables: Array<{
      label: string;
      run: () => Promise<{ count: number }>;
    }> = [
      {
        label: "deals",
        run: () =>
          prisma.deal.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "contacts",
        run: () =>
          prisma.contact.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "customers",
        run: () =>
          prisma.customer.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "invoices",
        run: () =>
          prisma.invoice.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "products",
        run: () =>
          prisma.product.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "accounts",
        run: () =>
          prisma.account.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "projects",
        run: () =>
          prisma.project.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "tasks",
        run: () =>
          prisma.task.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "task_dependencies",
        run: () =>
          prisma.taskDependency.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "orders",
        run: () =>
          prisma.order.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "suppliers",
        run: () =>
          prisma.supplier.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
      {
        label: "journal_entries",
        run: () =>
          prisma.journalEntry.updateMany({
            where: { orgId: "org-self" },
            data: { orgId: DEMO_ORG_ID },
          }),
      },
    ];

    for (const t of tables) {
      try {
        const { count } = await t.run();
        if (count > 0) {
          console.log(
            `  ${t.label}: ${count} row(s) re-pointed to ${DEMO_ORG_ID}`,
          );
          normalizedDemo += count;
        }
      } catch (err) {
        console.warn(
          `  ${t.label}: skipped (${err instanceof Error ? err.message : String(err)})`,
        );
      }
    }

    console.log(
      `\n[migrate-orgids] done. users updated: ${updatedUsers}. legacy rows normalized: ${normalizedDemo}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[migrate-orgids] FAILED:", err);
  process.exit(1);
});
