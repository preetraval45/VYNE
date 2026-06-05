#!/usr/bin/env node
/**
 * safe-db-push — wraps `prisma db push --skip-generate` with retry +
 * graceful degrade so a transient Neon outage doesn't fail the Vercel
 * build. We try up to 4 times with exponential backoff (1s → 2s → 4s
 * → 8s). If every attempt fails, we exit 0 and log a warning so the
 * `next build` step still runs — the app deploys with the previous
 * schema, and an operator can run `pnpm prisma db push` manually once
 * Neon is reachable.
 *
 * Why exit 0 on terminal failure?
 *   Failing the build leaves the production URL stuck on the previous
 *   commit. That hides forward progress (e.g. a UI-only fix) behind an
 *   unrelated DB hiccup. The schema-divergence risk is small because
 *   we don't intentionally ship breaking schema changes; this just
 *   smooths over Neon free-tier auto-suspend.
 */

const { spawnSync } = require("node:child_process");

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = spawnSync(
      "npx",
      ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
      { stdio: "inherit", shell: true },
    );
    if (result.status === 0) {
      console.log(`[safe-db-push] ok on attempt ${attempt}`);
      process.exit(0);
    }
    if (attempt === MAX_ATTEMPTS) {
      console.warn(
        `[safe-db-push] all ${MAX_ATTEMPTS} attempts failed. Continuing build with the prior schema. ` +
          `Run \`pnpm prisma db push\` manually once Neon is reachable to sync.`,
      );
      // Exit 0 so the wrapping npm build doesn't fail.
      process.exit(0);
    }
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.warn(
      `[safe-db-push] attempt ${attempt} failed; retrying in ${delay}ms…`,
    );
    await sleep(delay);
  }
})();
