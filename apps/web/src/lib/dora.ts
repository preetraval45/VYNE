// DORA-style metrics computed from a deploy list. Cheap, reproducible,
// good enough to display trends without needing a separate analytics
// pipeline. All four metrics: deploy frequency, lead time for changes,
// change failure rate, mean time to recovery.

export interface DoraDeploy {
  status: "queued" | "in_progress" | "success" | "failed" | "cancelled";
  environment: string;
  startedAt: string;
  completedAt: string | null;
}

export interface DoraSummary {
  freq7d: number;
  freq30d: number;
  changeFailureRate: number;
  leadTimeMedianMin: number | null;
  mttrMedianMin: number | null;
  /** Daily deploy counts for the last 14 days; oldest first. */
  spark: number[];
}

const DAY = 86400000;

export function computeDora(deploys: DoraDeploy[]): DoraSummary {
  const now = Date.now();
  const since7 = now - 7 * DAY;
  const since30 = now - 30 * DAY;

  const recent7 = deploys.filter((d) => new Date(d.startedAt).getTime() >= since7);
  const recent30 = deploys.filter((d) => new Date(d.startedAt).getTime() >= since30);

  const prodDeploys = deploys.filter((d) => d.environment === "production");
  const failed = prodDeploys.filter((d) => d.status === "failed").length;
  const successOrFailed = prodDeploys.filter(
    (d) => d.status === "success" || d.status === "failed",
  ).length;

  const leadTimes = deploys
    .filter((d) => d.status === "success" && d.completedAt)
    .map((d) => new Date(d.completedAt!).getTime() - new Date(d.startedAt).getTime())
    .filter((n) => n > 0);
  const mttrs = deploys
    .filter((d) => d.status === "failed" && d.completedAt)
    .map((d) => new Date(d.completedAt!).getTime() - new Date(d.startedAt).getTime())
    .filter((n) => n > 0);

  const spark: number[] = Array.from({ length: 14 }, () => 0);
  for (const d of deploys) {
    const ts = new Date(d.startedAt).getTime();
    const ageDays = Math.floor((now - ts) / DAY);
    if (ageDays >= 0 && ageDays < 14) spark[13 - ageDays] += 1;
  }

  return {
    freq7d: recent7.length,
    freq30d: recent30.length,
    changeFailureRate:
      successOrFailed > 0 ? Math.round((failed / successOrFailed) * 100) : 0,
    leadTimeMedianMin: median(leadTimes.map((n) => Math.round(n / 60000))),
    mttrMedianMin: median(mttrs.map((n) => Math.round(n / 60000))),
    spark,
  };
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
