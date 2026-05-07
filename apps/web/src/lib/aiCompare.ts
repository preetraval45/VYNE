"use client";

/**
 * Compare-mode aggregator (28.2.11).
 *
 *   const run = await runCompare({
 *     prompt: "Draft a board update.",
 *     models: ["claude", "groq", "openai"],
 *     system: "Be terse.",
 *   });
 *   const winner = pickWinner(run);
 *
 * Wraps the existing `/api/ai/compare` Edge route (Phase 16.11) with
 * client-side orchestration:
 *
 *   - Track per-provider elapsed-ms so the UI can render a pill.
 *   - Score each answer for hallucination signals (length / specificity
 *     / citation count) so the UI can surface a suggested winner.
 *   - "promote" helper writes the chosen answer back into the active
 *     conversation, marking the other branches as discarded.
 */

export type CompareProvider = "claude" | "groq" | "openai";

export interface CompareRow {
  provider: CompareProvider;
  model: string;
  text: string | null;
  elapsedMs: number;
  error?: string;
  /** Heuristic 0..1 quality score — only used to suggest a winner. */
  qualityScore?: number;
  /** Diagnostic flags the UI can render as small chips. */
  flags?: string[];
}

export interface CompareRun {
  prompt: string;
  startedAt: string;
  finishedAt: string;
  rows: CompareRow[];
}

export interface RunCompareOpts {
  prompt: string;
  models?: CompareProvider[];
  system?: string;
}

interface CompareApiResp {
  ok?: boolean;
  results?: Array<{
    provider: CompareProvider;
    model: string;
    text: string | null;
    elapsedMs: number;
    error?: string;
  }>;
}

export async function runCompare(opts: RunCompareOpts): Promise<CompareRun> {
  const startedAt = new Date().toISOString();
  if (typeof window === "undefined") {
    return {
      prompt: opts.prompt,
      startedAt,
      finishedAt: startedAt,
      rows: [],
    };
  }
  try {
    const res = await fetch("/api/ai/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: opts.prompt,
        models: opts.models ?? ["claude", "groq", "openai"],
        system: opts.system,
      }),
    });
    const data = (await res.json()) as CompareApiResp;
    const rows = (data.results ?? []).map(scoreRow);
    return {
      prompt: opts.prompt,
      startedAt,
      finishedAt: new Date().toISOString(),
      rows,
    };
  } catch {
    return {
      prompt: opts.prompt,
      startedAt,
      finishedAt: new Date().toISOString(),
      rows: [],
    };
  }
}

function scoreRow(row: CompareRow): CompareRow {
  const flags: string[] = [];
  let score = 0;
  if (!row.text) {
    flags.push("empty");
    return { ...row, qualityScore: 0, flags };
  }
  const len = row.text.length;
  if (len < 80) {
    flags.push("very-short");
    score += 0.15;
  } else if (len < 200) {
    score += 0.45;
  } else if (len < 1_500) {
    score += 0.75;
  } else {
    flags.push("verbose");
    score += 0.55;
  }
  const digits = (row.text.match(/\d/g) ?? []).length;
  if (digits >= 3) score += 0.1;
  const bullets = (row.text.match(/^\s*[-*•]\s/gm) ?? []).length;
  if (bullets >= 2) score += 0.1;
  const cites = (row.text.match(/\[[a-z]+:[^\]]+\]/gi) ?? []).length;
  if (cites > 0) {
    score += 0.05 * Math.min(cites, 4);
    flags.push(`${cites} citation${cites === 1 ? "" : "s"}`);
  }
  if (row.elapsedMs > 8_000) {
    flags.push("slow");
    score -= 0.1;
  }
  return { ...row, qualityScore: Math.max(0, Math.min(1, score)), flags };
}

export function pickWinner(run: CompareRun): CompareRow | null {
  let best: CompareRow | null = null;
  for (const row of run.rows) {
    if (!row.text) continue;
    if (!best || (row.qualityScore ?? 0) > (best.qualityScore ?? 0)) {
      best = row;
    }
  }
  return best;
}

export function summariseRun(run: CompareRun): string {
  const okRows = run.rows.filter((r) => r.text);
  const winner = pickWinner(run);
  if (!winner) return "No provider returned a usable answer.";
  return `${okRows.length}/${run.rows.length} providers responded · suggested: ${winner.provider} (${winner.model})`;
}
