import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * SCIM v2 /Users/:id — read / patch / delete one user.
 * Mirror of /scim/v2/Users for single-record ops.
 */

export const runtime = "edge";

interface ScimUser {
  id: string;
  userName: string;
  active: boolean;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ primary?: boolean; value: string; type?: string }>;
  externalId?: string;
  meta: {
    resourceType: "User";
    created: string;
    lastModified: string;
    location: string;
  };
  schemas: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var __vyneScimUsers: Map<string, ScimUser> | undefined;
}

function store(): Map<string, ScimUser> {
  if (!globalThis.__vyneScimUsers)
    globalThis.__vyneScimUsers = new Map();
  return globalThis.__vyneScimUsers;
}

function authenticate(req: Request): boolean {
  const token = process.env.SCIM_BEARER_TOKEN;
  if (!token) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}

function scimError(detail: string, status: number) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail,
      status: String(status),
    },
    { status },
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, ctx: RouteContext) {
  const rl = await rateLimit({
    key: "scim-users-get",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;
  if (!authenticate(req)) return scimError("Unauthorized", 401);
  const { id } = await ctx.params;
  const user = store().get(id);
  if (!user) return scimError("not found", 404);
  return NextResponse.json(user);
}

interface ScimPatchOp {
  op: "add" | "replace" | "remove";
  path?: string;
  value?: unknown;
}

interface ScimPatchBody {
  Operations?: ScimPatchOp[];
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const rl = await rateLimit({
    key: "scim-users-patch",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;
  if (!authenticate(req)) return scimError("Unauthorized", 401);
  const { id } = await ctx.params;
  const user = store().get(id);
  if (!user) return scimError("not found", 404);
  const body = (await req.json().catch(() => ({}))) as ScimPatchBody;
  const ops = body.Operations ?? [];
  const next: ScimUser = { ...user };
  for (const op of ops) {
    if (op.op === "replace") {
      if (op.path === "active" && typeof op.value === "boolean")
        next.active = op.value;
      else if (op.path === "userName" && typeof op.value === "string")
        next.userName = op.value;
      else if (
        op.path === "externalId" &&
        (typeof op.value === "string" || op.value === undefined)
      )
        next.externalId = op.value;
    }
  }
  next.meta = { ...user.meta, lastModified: new Date().toISOString() };
  store().set(id, next);
  return NextResponse.json(next);
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const rl = await rateLimit({
    key: "scim-users-delete",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;
  if (!authenticate(req)) return scimError("Unauthorized", 401);
  const { id } = await ctx.params;
  if (!store().has(id)) return scimError("not found", 404);
  store().delete(id);
  return new NextResponse(null, { status: 204 });
}
