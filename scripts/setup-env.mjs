#!/usr/bin/env node
// Interactive env-var setup helper (UI_UPGRADE_PLAN.md launch).
//
// Walks every env var the launch checklist needs, prints the dashboard
// URL where you'd grab the value, and pipes the answer to `vercel env add`
// for the production environment. Skip-to-next with empty input; abort
// the whole run with Ctrl+C.
//
// Usage:
//   cd vyne (repo root)
//   node scripts/setup-env.mjs
//
// Prereqs:
//   - `vercel login` already done (CLI authenticated to your team)
//   - Run from the monorepo root so `vercel env add` picks up the linked project

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const ENV_GROUPS = [
  {
    name: "Stripe billing (Priority 3)",
    vars: [
      {
        key: "STRIPE_SECRET_KEY",
        prompt: "Stripe secret key (sk_live_... or sk_test_...)",
        url: "https://dashboard.stripe.com/apikeys",
        secret: true,
      },
      {
        key: "STRIPE_PRICE_ID_STARTER",
        prompt: "Starter price ID (price_...)",
        url: "https://dashboard.stripe.com/products",
      },
      {
        key: "STRIPE_PRICE_ID_BUSINESS",
        prompt: "Business price ID (price_...)",
        url: "https://dashboard.stripe.com/products",
      },
      {
        key: "STRIPE_PRICE_ID_ENTERPRISE",
        prompt: "Enterprise price ID (optional, leave blank to skip)",
        url: "https://dashboard.stripe.com/products",
        optional: true,
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        prompt:
          "Stripe webhook signing secret (whsec_...). Add endpoint at /api/stripe/webhook first.",
        url: "https://dashboard.stripe.com/webhooks",
        secret: true,
      },
    ],
  },
  {
    name: "Realtime — Pusher (Priority 4)",
    vars: [
      {
        key: "NEXT_PUBLIC_PUSHER_KEY",
        prompt: "Pusher app key (client-readable)",
        url: "https://dashboard.pusher.com/apps",
      },
      {
        key: "NEXT_PUBLIC_PUSHER_CLUSTER",
        prompt: "Pusher cluster (mt1, us2, eu, etc.)",
        url: "https://dashboard.pusher.com/apps",
      },
      {
        key: "PUSHER_APP_ID",
        prompt: "Pusher app ID",
        url: "https://dashboard.pusher.com/apps",
      },
      {
        key: "PUSHER_KEY",
        prompt: "Pusher key (same value as NEXT_PUBLIC_PUSHER_KEY)",
        url: "https://dashboard.pusher.com/apps",
      },
      {
        key: "PUSHER_SECRET",
        prompt: "Pusher secret",
        url: "https://dashboard.pusher.com/apps",
        secret: true,
      },
      {
        key: "PUSHER_CLUSTER",
        prompt:
          "Pusher cluster (server-side, same as NEXT_PUBLIC_PUSHER_CLUSTER)",
        url: "https://dashboard.pusher.com/apps",
      },
    ],
  },
  {
    name: "Email — Resend (Priority 8.4 + 9.6)",
    vars: [
      {
        key: "RESEND_API_KEY",
        prompt: "Resend API key (re_...)",
        url: "https://resend.com/api-keys",
        secret: true,
      },
      {
        key: "RESEND_FROM",
        prompt:
          'From header, e.g. "VYNE <noreply@yourdomain.com>" (must be a verified Resend domain)',
        url: "https://resend.com/domains",
      },
    ],
  },
  {
    name: "Sentry (Priority 8.3)",
    vars: [
      {
        key: "NEXT_PUBLIC_SENTRY_DSN",
        prompt: "Sentry DSN (client-side error capture)",
        url: "https://sentry.io/settings/projects/",
      },
      {
        key: "SENTRY_AUTH_TOKEN",
        prompt: "Sentry auth token (sntrys_...) — for sourcemap upload",
        url: "https://sentry.io/settings/account/api/auth-tokens/",
        secret: true,
      },
      {
        key: "SENTRY_ORG",
        prompt: "Sentry org slug",
        url: "https://sentry.io",
      },
      {
        key: "SENTRY_PROJECT",
        prompt: "Sentry project slug",
        url: "https://sentry.io",
      },
    ],
  },
  {
    name: "Web Push — VAPID (Priority 8.5)",
    note: 'Generate a key pair first: `npx web-push generate-vapid-keys`',
    vars: [
      {
        key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
        prompt: "VAPID public key (from web-push generate-vapid-keys)",
      },
      {
        key: "VAPID_PRIVATE_KEY",
        prompt: "VAPID private key",
        secret: true,
      },
      {
        key: "VAPID_SUBJECT",
        prompt: 'VAPID subject (e.g. "mailto:you@yourdomain.com")',
      },
    ],
  },
  {
    name: "LiveKit — Huddles (Priority 6.1)",
    vars: [
      {
        key: "LIVEKIT_API_KEY",
        prompt: "LiveKit API key",
        url: "https://cloud.livekit.io",
      },
      {
        key: "LIVEKIT_API_SECRET",
        prompt: "LiveKit API secret",
        url: "https://cloud.livekit.io",
        secret: true,
      },
      {
        key: "LIVEKIT_URL",
        prompt: 'LiveKit URL (e.g. "wss://your-project.livekit.cloud")',
        url: "https://cloud.livekit.io",
      },
    ],
  },
  {
    name: "RAG embeddings (Priority 2)",
    vars: [
      {
        key: "OPENAI_API_KEY",
        prompt: "OpenAI API key (default embedding provider)",
        url: "https://platform.openai.com/api-keys",
        secret: true,
      },
      {
        key: "VOYAGE_API_KEY",
        prompt: "Voyage AI API key (optional alt embedding provider)",
        url: "https://www.voyageai.com",
        secret: true,
        optional: true,
      },
      {
        key: "EMBED_PROVIDER",
        prompt:
          'Force embed provider, "openai" or "voyage" (optional; auto-falls-back when blank)',
        optional: true,
      },
    ],
  },
  {
    name: "AI chat providers (need at least one)",
    vars: [
      {
        key: "ANTHROPIC_API_KEY",
        prompt: "Anthropic API key (Claude — recommended default)",
        url: "https://console.anthropic.com/settings/keys",
        secret: true,
      },
      {
        key: "GROQ_API_KEY",
        prompt: "Groq API key (Llama-3.3-70b fallback, ultra-fast)",
        url: "https://console.groq.com/keys",
        secret: true,
        optional: true,
      },
      {
        key: "GEMINI_API_KEY",
        prompt: "Gemini API key (image gen + grounded search)",
        url: "https://aistudio.google.com/app/apikey",
        secret: true,
        optional: true,
      },
    ],
  },
  {
    name: "Operations — backup + cron (Priority 8.7, 8.8, 9.6)",
    vars: [
      {
        key: "CRON_SECRET",
        prompt: "Cron auth secret (random 32-char hex; manual cron triggers)",
        secret: true,
      },
      {
        key: "BACKUP_BLOB_TOKEN",
        prompt:
          "Vercel Blob read-write token (auto-archives nightly backups). Generate at vercel.com/dashboard → Storage → Blob",
        url: "https://vercel.com/dashboard/stores",
        secret: true,
        optional: true,
      },
      {
        key: "AUTH_TOKEN_SECRET",
        prompt:
          "Session JWT signing secret (random 64-char hex). Required for real signups",
        secret: true,
      },
    ],
  },
  {
    name: "External invites + computer-use (optional)",
    vars: [
      {
        key: "EXTERNAL_INVITE_SIGNING_SECRET",
        prompt:
          "External channel invite signing secret (random 64-char hex; Priority 6.7)",
        secret: true,
        optional: true,
      },
      {
        key: "BROWSERBASE_API_KEY",
        prompt: "Browserbase API key (computer-use sandbox; Priority 5.5)",
        url: "https://www.browserbase.com",
        secret: true,
        optional: true,
      },
      {
        key: "BROWSERBASE_PROJECT_ID",
        prompt: "Browserbase project ID",
        url: "https://www.browserbase.com",
        optional: true,
      },
    ],
  },
];

const rl = createInterface({ input: stdin, output: stdout });
const ask = (q) =>
  new Promise((resolve) => rl.question(q, (a) => resolve(a)));

function runVercelEnvAdd(key, value) {
  return new Promise((resolve, reject) => {
    const child = spawn("vercel", ["env", "add", key, "production"], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.write(value + "\n");
    child.stdin.end();
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`vercel env add ${key} exited with code ${code}`));
    });
  });
}

function generateRandomHex(bytes) {
  const arr = new Uint8Array(bytes);
  // Node 20+ has crypto.getRandomValues on globalThis.
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  console.log("\n🚀 VYNE env-var setup\n");
  console.log(
    "This helper runs `vercel env add <KEY> production` for each variable.",
  );
  console.log("Empty input skips a variable. Ctrl+C aborts.\n");

  const proceed = await ask("Continue? (y/N) ");
  if (proceed.trim().toLowerCase() !== "y") {
    console.log("Aborted.");
    rl.close();
    return;
  }

  let setCount = 0;
  let skipCount = 0;

  for (const group of ENV_GROUPS) {
    console.log(`\n━━━ ${group.name} ━━━`);
    if (group.note) console.log(group.note);
    for (const v of group.vars) {
      const url = v.url ? ` (${v.url})` : "";
      const optional = v.optional ? " [optional]" : "";
      const helpForRandom =
        v.key === "CRON_SECRET" ||
        v.key === "AUTH_TOKEN_SECRET" ||
        v.key === "EXTERNAL_INVITE_SIGNING_SECRET";
      let value = await ask(
        `  ${v.key}${optional}${url}\n    ${v.prompt}${helpForRandom ? ' (or type "random" to generate)' : ""}: `,
      );
      value = value.trim();

      if (!value) {
        skipCount++;
        continue;
      }

      if (helpForRandom && value.toLowerCase() === "random") {
        const bytes = v.key === "AUTH_TOKEN_SECRET" ? 32 : 16;
        value = generateRandomHex(bytes);
        console.log(`    → generated ${bytes * 2}-char hex secret`);
      }

      try {
        await runVercelEnvAdd(v.key, value);
        setCount++;
      } catch (err) {
        console.error(`    ✗ failed to set ${v.key}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Done: ${setCount} set, ${skipCount} skipped.`);
  console.log(
    "\nRedeploy to pick up the new env vars: `vercel --prod --yes`\n",
  );
  rl.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  rl.close();
  process.exit(1);
});
