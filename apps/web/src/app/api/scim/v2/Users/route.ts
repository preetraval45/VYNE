import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * SCIM v2 /Users (23.7).
 *
 *   GET    /scim/v2/Users           — list users (paginated)
 *   POST   /scim/v2/Users           — provision a new user
 *   GET    /scim/v2/Users/:id       — read one (separate route file)
 *   PATCH  /scim/v2/Users/:id       — partial update
 *   DELETE /scim/v2/Users/:id       — de-provision
 *
 * Authentication: `Authorization: Bearer <SCIM_TOKEN>` (env var
 * `SCIM_BEARER_TOKEN`). Returns 401 when missing / mismatched.
 *
 * Demo storage: in-memory map. Production replaces with the canonical
 * users table + audit-log writes.
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

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `scim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function authenticate(req: Request): boolean {
  const token = process.env.SCIM_BEARER_TOKEN;
  if (!token) return true; // demo mode — accept anything
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

function userMeta(id: string, ts: string): ScimUser["meta"] {
  return {
    resourceType: "User",
    created: ts,
    lastModified: ts,
    location: `/api/scim/v2/Users/${id}`,
  };
}

export async function GET(req: Request) {
  const rl = await rateLimit({
    key: "scim-users-list",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;
  if (!authenticate(req)) return scimError("Unauthorized", 401);

  const url = new URL(req.url);
  const startIndex = Math.max(1, Number(url.searchParams.get("startIndex") ?? 1));
  const count = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("count") ?? 20)),
  );
  const filter = url.searchParams.get("filter") ?? "";
  let users = Array.from(store().values());
  // Trivial `userName eq "x"` filter parser — covers the common case.
  const m = /^userName\s+eq\s+"([^"]+)"$/i.exec(filter);
  if (m) users = users.filter((u) => u.userName.toLowerCase() === m[1].toLowerCase());
  const window = users.slice(startIndex - 1, startIndex - 1 + count);
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    startIndex,
    itemsPerPage: window.length,
    Resources: window,
  });
}

interface ScimCreateBody {
  userName?: string;
  active?: boolean;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ primary?: boolean; value: string; type?: string }>;
  externalId?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "scim-users-create",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;
  if (!authenticate(req)) return scimError("Unauthorized", 401);

  const body = (await req.json().catch(() => ({}))) as ScimCreateBody;
  if (!body.userName) return scimError("missing userName", 400);

  const ts = new Date().toISOString();
  const id = newId();
  const user: ScimUser = {
    id,
    userName: body.userName,
    active: body.active ?? true,
    name: body.name,
    emails: body.emails,
    externalId: body.externalId,
    meta: userMeta(id, ts),
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
  };
  store().set(id, user);
  return NextResponse.json(user, {
    status: 201,
    headers: { Location: `/api/scim/v2/Users/${id}` },
  });
}
