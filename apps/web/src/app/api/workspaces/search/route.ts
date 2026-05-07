import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/workspaces/search
 * Body: { q: string; workspaceIds?: string[]; limit?: number }
 *
 * Cross-workspace search aggregator (26.2). Fans out the query to
 * every workspace the caller is a member of, merges the results,
 * and stamps each row with its source workspace so the UI can group.
 *
 * Demo mode: every workspace shares the same fixture corpus, so the
 * endpoint duplicates results across the requested workspace ids.
 * Production swaps the inner loop for a real per-workspace DB query.
 *
 * Rate-limited 30/min — fan-out is expensive.
 */

export const runtime = "edge";

interface Body {
  q?: string;
  workspaceIds?: string[];
  limit?: number;
}

interface CrossResult {
  workspaceId: string;
  results: unknown[];
  count: number;
  ms: number;
  error?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "workspaces-search",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  const q = (body.q ?? "").trim();
  if (!q) {
    return NextResponse.json(
      { ok: false, error: "missing query" },
      { status: 400 },
    );
  }
  const limit = Math.min(Math.max(body.limit ?? 12, 1), 50);
  const workspaceIds =
    body.workspaceIds && body.workspaceIds.length > 0
      ? body.workspaceIds
      : ["ws-vyne-hq"];

  const origin = new URL(req.url).origin;
  const tasks = workspaceIds.map(async (wsId) => {
    const t0 = Date.now();
    try {
      const r = await fetch(`${origin}/api/search/global`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Cross-workspace fan-out passes the workspace id along so
          // production-side routing can pick the right tenant DB.
          "X-VYNE-Workspace": wsId,
        },
        body: JSON.stringify({ q, limit }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        results?: unknown[];
      };
      const results = (data.results ?? []).slice(0, limit);
      return {
        workspaceId: wsId,
        results,
        count: results.length,
        ms: Date.now() - t0,
      } as CrossResult;
    } catch (err) {
      return {
        workspaceId: wsId,
        results: [],
        count: 0,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : "fetch failed",
      } as CrossResult;
    }
  });
  const perWorkspace = await Promise.all(tasks);
  const merged = perWorkspace
    .flatMap((r) =>
      r.results.map((row) => ({
        ...(row as Record<string, unknown>),
        workspaceId: r.workspaceId,
      })),
    )
    .slice(0, limit * workspaceIds.length);

  return NextResponse.json({
    ok: true,
    q,
    workspaceIds,
    perWorkspace,
    merged,
    totalCount: merged.length,
  });
}
