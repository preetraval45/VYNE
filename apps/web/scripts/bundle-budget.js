#!/usr/bin/env node
/**
 * Bundle-size budget enforcement for VYNE.
 *
 * Run after `next build`:
 *   node scripts/bundle-budget.js
 *
 * Walks .next/build-manifest.json + .next/server/app-paths-manifest.json,
 * sums the gzip-compressed JS shipped per route, and fails the
 * process when any route exceeds the configured budget. Prints a
 * top-N table so the largest routes are obvious in CI logs.
 *
 * Budgets are deliberately tight so a casual import bloat shows up
 * in PR review instead of staging. Override per-route via
 * BUDGET_OVERRIDES below.
 */

import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const STATIC_DIR = path.join(NEXT_DIR, "static");

const DEFAULT_BUDGET_KB = 220;
const BUDGET_OVERRIDES = {
  // Routes with legitimate weight (rich editors, charts).
  "/ai/chat": 360,
  "/docs": 320,
  "/reporting": 320,
  "/observe": 320,
  // Onboarding wizard imports the whole module list.
  "/onboarding": 320,
};

const TOP_N = 12;

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function fileGzipSize(absPath) {
  if (!existsSync(absPath)) return 0;
  const buf = await readFile(absPath);
  return gzipSync(buf).length;
}

async function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error("✖ No .next directory — run `next build` first.");
    process.exit(1);
  }
  const manifestPath = path.join(NEXT_DIR, "build-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`✖ Missing ${manifestPath}.`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  const pages = manifest.pages ?? {};
  const rootMain = manifest.rootMainFiles ?? [];

  // Resolve gzip size per file once.
  const sizeCache = new Map();
  async function gzip(file) {
    if (sizeCache.has(file)) return sizeCache.get(file);
    const abs = path.join(NEXT_DIR, file);
    const s = await fileGzipSize(abs);
    sizeCache.set(file, s);
    return s;
  }

  const rows = [];
  for (const [route, files] of Object.entries(pages)) {
    const all = new Set([...(files ?? []), ...rootMain]);
    let total = 0;
    for (const f of all) {
      if (!f.endsWith(".js")) continue;
      total += await gzip(f);
    }
    const budget = (BUDGET_OVERRIDES[route] ?? DEFAULT_BUDGET_KB) * 1024;
    rows.push({ route, bytes: total, budget });
  }
  rows.sort((a, b) => b.bytes - a.bytes);

  console.log(`\nBundle budget report — ${rows.length} routes\n`);
  console.log("ROUTE".padEnd(38) + "FIRST LOAD JS (gzip)".padEnd(24) + "BUDGET".padEnd(12) + "STATUS");
  console.log("─".repeat(86));

  let failed = 0;
  for (const r of rows.slice(0, TOP_N)) {
    const pct = (r.bytes / r.budget) * 100;
    const status = r.bytes <= r.budget ? "ok" : "OVER";
    if (r.bytes > r.budget) failed += 1;
    console.log(
      r.route.padEnd(38) +
        fmtKb(r.bytes).padEnd(24) +
        fmtKb(r.budget).padEnd(12) +
        `${status} (${pct.toFixed(0)}%)`,
    );
  }
  if (rows.length > TOP_N) {
    console.log(`… ${rows.length - TOP_N} smaller routes omitted`);
  }
  // Always check every route, not just the top-N.
  for (const r of rows.slice(TOP_N)) {
    if (r.bytes > r.budget) {
      failed += 1;
      console.log(
        `OVER ${r.route} ${fmtKb(r.bytes)} > ${fmtKb(r.budget)}`,
      );
    }
  }

  if (failed > 0) {
    console.error(`\n✖ ${failed} route(s) exceed their budget.`);
    process.exit(1);
  }
  console.log("\n✓ Every route is within budget.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
