import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { publish } from "@/lib/pusher";
import {
  requireRole,
  WRITE_ROLES,
  ADMIN_ROLES,
  type WorkspaceRole,
} from "@/lib/auth/role";
import { requireTenant } from "@/lib/auth/tenantGuard";

// Generic CRUD route factory. Each module that wants Postgres-backed
// list/create/update/delete writes ~10 lines instead of duplicating
// the Deal route pattern. Multi-tenant scoping is enforced at this
// layer — every list/create/update/delete is gated by `requireTenant`
// and every Prisma query filters on the caller's `orgId`. The legacy
// `cfg.orgId` default is retained as a last-resort fallback used only
// when somehow no session resolves (will not happen in practice now
// that requireTenant rejects unauthenticated requests with 401).
//
// Convention:
//   const handlers = createCrudHandlers({ model: "contact", orgId: "demo", events: { created: "contact:created", ... } });
//   export const GET = handlers.list;
//   export const POST = handlers.create;
// And in /[id]/route.ts:
//   export const PATCH = handlers.update;
//   export const DELETE = handlers.remove;

type PrismaModelKey =
  | "contact"
  | "customer"
  | "invoice"
  | "product"
  | "account"
  | "project"
  | "task"
  | "taskDependency"
  | "order"
  | "supplier"
  | "journalEntry"
  | "expense"
  | "salesOpportunity"
  | "salesQuote"
  | "salesOrder"
  | "salesProduct"
  | "salesCustomer"
  | "fieldTechnician"
  | "fieldJob"
  | "employee"
  | "leaveRequest";

interface CrudConfig {
  /** Prisma delegate name on the singleton (lowercased, matches schema model) */
  model: PrismaModelKey;
  /** Default org id for new rows; multi-tenant gets pulled from session later. */
  orgId?: string;
  /** Prefix for rate-limit keys + the prefix for Pusher event ids. */
  resource: string;
  /** Event names broadcast over Pusher when changes happen. */
  events: { created: string; updated: string; deleted: string };
  /** Optional default-row patcher for create — sets defaults for required string fields. */
  withDefaults?: (body: Record<string, unknown>) => Record<string, unknown>;
  /** UI_UPGRADE_PLAN.md 7.2 — RBAC gate on writes. Defaults to all
   *  write-capable roles (owner/admin/manager/member). Reads are
   *  always permitted to any authenticated user. Demo mode (no token)
   *  bypasses the gate so demo workspaces still mutate without auth. */
  writeRoles?: WorkspaceRole[];
  /** RBAC gate on deletes. Defaults to ADMIN_ROLES (owner/admin) since
   *  deletes are irreversible. */
  deleteRoles?: WorkspaceRole[];
}

interface CrudHandlers {
  list: (req: Request) => Promise<Response>;
  create: (req: Request) => Promise<Response>;
  update: (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  remove: (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
}

function getDelegate(model: PrismaModelKey) {
  return prisma[model] as unknown as {
    findMany: (args: object) => Promise<unknown[]>;
    findFirst: (args: {
      where: object;
      select?: object;
    }) => Promise<{ orgId: string } | null>;
    create: (args: { data: object }) => Promise<{ orgId: string } & object>;
    update: (args: {
      where: object;
      data: object;
    }) => Promise<{ orgId: string } & object>;
    delete: (args: { where: object }) => Promise<unknown>;
    findUnique: (args: {
      where: object;
      select?: object;
    }) => Promise<{ orgId: string } | null>;
  };
}

export function createCrudHandlers(cfg: CrudConfig): CrudHandlers {
  const delegate = getDelegate(cfg.model);
  const orgIdDefault = cfg.orgId ?? "demo";
  const writeRoles = cfg.writeRoles ?? WRITE_ROLES;
  const deleteRoles = cfg.deleteRoles ?? ADMIN_ROLES;

  return {
    list: async (req: Request) => {
      const ctx = await requireTenant(req);
      if (ctx instanceof Response) return ctx;

      const rl = await rateLimit({
        key: `${cfg.resource}-list`,
        limit: 60,
        windowSec: 60,
        req,
      });
      if (!rl.ok) return rl.response!;

      try {
        const rows = await delegate.findMany({
          where: { orgId: ctx.orgId },
          orderBy: { createdAt: "desc" },
          take: 500,
        });
        return NextResponse.json({ [`${cfg.resource}`]: rows });
      } catch (err) {
        return NextResponse.json(
          {
            [`${cfg.resource}`]: [],
            error: err instanceof Error ? err.message : "DB error",
          },
          { status: 500 },
        );
      }
    },

    create: async (req: Request) => {
      const ctx = await requireTenant(req);
      if (ctx instanceof Response) return ctx;

      const rl = await rateLimit({
        key: `${cfg.resource}-create`,
        limit: 30,
        windowSec: 60,
        req,
      });
      if (!rl.ok) return rl.response!;

      const roleCheck = await requireRole(req, writeRoles);
      if (roleCheck) return roleCheck;

      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const data = cfg.withDefaults ? cfg.withDefaults(body) : body;
      // Carry client-provided id so optimistic local insert + server
      // converge on the same row id (matches the CRM Deal pattern).
      const id = typeof body.id === "string" ? body.id : undefined;

      try {
        const row = await delegate.create({
          // orgId from the session — `orgIdDefault` retained only as a
          // last-resort fallback (should never trigger because ctx is
          // guaranteed by requireTenant above).
          data: {
            orgId: ctx.orgId || orgIdDefault,
            ...(id ? { id } : {}),
            ...data,
          },
        });
        void publish(
          `org-${(row as { orgId: string }).orgId}`,
          cfg.events.created,
          row,
        );
        return NextResponse.json({ row });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "DB error" },
          { status: 500 },
        );
      }
    },

    update: async (req, { params }) => {
      const ctx = await requireTenant(req);
      if (ctx instanceof Response) return ctx;

      const { id } = await params;
      const rl = await rateLimit({
        key: `${cfg.resource}-patch`,
        limit: 60,
        windowSec: 60,
        req,
      });
      if (!rl.ok) return rl.response!;

      const roleCheck = await requireRole(req, writeRoles);
      if (roleCheck) return roleCheck;

      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body)) {
        if (v === undefined) continue;
        // Never let the body override the tenant boundary.
        if (k === "orgId" || k === "org_id") continue;
        data[k] = v;
      }

      try {
        // Tenant check: confirm the row belongs to the caller's org
        // BEFORE updating. Cross-tenant PATCH returns 404 (not 403 — we
        // don't even acknowledge the row exists).
        const existing = await delegate.findFirst({
          where: { id, orgId: ctx.orgId },
          select: { orgId: true },
        });
        if (!existing) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        const row = await delegate.update({
          where: { id },
          data,
        });
        void publish(
          `org-${(row as { orgId: string }).orgId}`,
          cfg.events.updated,
          row,
        );
        return NextResponse.json({ row });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "DB error" },
          { status: 500 },
        );
      }
    },

    remove: async (req, { params }) => {
      const ctx = await requireTenant(req);
      if (ctx instanceof Response) return ctx;

      const { id } = await params;
      const rl = await rateLimit({
        key: `${cfg.resource}-delete`,
        limit: 60,
        windowSec: 60,
        req,
      });
      if (!rl.ok) return rl.response!;

      const roleCheck = await requireRole(req, deleteRoles);
      if (roleCheck) return roleCheck;

      try {
        const existing = await delegate.findFirst({
          where: { id, orgId: ctx.orgId },
          select: { orgId: true },
        });
        if (!existing) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        await delegate.delete({ where: { id } });
        void publish(`org-${existing.orgId}`, cfg.events.deleted, { id });
        return NextResponse.json({ ok: true });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "DB error" },
          { status: 500 },
        );
      }
    },
  };
}
