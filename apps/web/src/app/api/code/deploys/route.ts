import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";

// ─── /api/code/deploys ─────────────────────────────────────────────
//
// Fetches the real deployment list for vyne.vercel.app from the Vercel
// REST API when VERCEL_TOKEN + VERCEL_PROJECT_ID are configured. This
// turns the /code page from a fixture demo into a live cockpit for the
// app's own production deploys (eat your own dogfood). When env vars
// are missing we return a 200 with `provider: "fixture"` so the client
// can fall back to MOCK_DEPLOYMENTS without erroring.

export interface NormalizedDeploy {
  id: string;
  serviceName: string;
  version: string | null;
  environment: "production" | "preview" | "development";
  status: "queued" | "in_progress" | "success" | "failed" | "cancelled";
  triggeredBy: string;
  commitSha: string | null;
  commitMessage: string | null;
  branch: string | null;
  url: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  source?: string;
  state: string;
  readyState?: string;
  type?: string;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  target?: string | null;
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitAuthorName?: string;
    [k: string]: unknown;
  };
  creator?: {
    username?: string;
    email?: string;
  };
}

function mapState(state: string): NormalizedDeploy["status"] {
  switch (state) {
    case "READY":
      return "success";
    case "ERROR":
    case "ERROR_RUNTIME":
      return "failed";
    case "BUILDING":
    case "INITIALIZING":
    case "DEPLOYING":
    case "QUEUED":
      return "in_progress";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "in_progress";
  }
}

function mapEnv(target: string | null | undefined): NormalizedDeploy["environment"] {
  if (target === "production") return "production";
  if (target === "preview") return "preview";
  return "development";
}

export async function GET(req: Request) {
  const rl = await rateLimit({ key: "code-deploys", limit: 30, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json({ deploys: [], provider: "fixture" });
  }

  const params = new URLSearchParams({ projectId, limit: "30" });
  if (teamId) params.set("teamId", teamId);

  try {
    const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ deploys: [], provider: "fixture", error: `Vercel API ${res.status}` });
    }
    const body = (await res.json()) as { deployments?: VercelDeployment[] };
    const deploys: NormalizedDeploy[] = (body.deployments ?? []).map((d) => ({
      id: d.uid,
      serviceName: d.name,
      version: d.meta?.githubCommitSha ? d.meta.githubCommitSha.slice(0, 7) : null,
      environment: mapEnv(d.target),
      status: mapState(d.readyState ?? d.state),
      triggeredBy:
        d.meta?.githubCommitAuthorName ??
        d.creator?.username ??
        d.creator?.email ??
        "Vercel",
      commitSha: d.meta?.githubCommitSha ?? null,
      commitMessage: d.meta?.githubCommitMessage ?? null,
      branch: d.meta?.githubCommitRef ?? null,
      url: d.url ? `https://${d.url}` : null,
      startedAt: new Date(d.createdAt).toISOString(),
      completedAt: d.ready ? new Date(d.ready).toISOString() : null,
    }));
    return NextResponse.json({ deploys, provider: "vercel" });
  } catch (err) {
    return NextResponse.json({
      deploys: [],
      provider: "fixture",
      error: err instanceof Error ? err.message : "Vercel API error",
    });
  }
}
