# VYNE Launch Checklist

Operator-side checklist to take VYNE from "code shipped" → "live, monitored, charging real cards." Every item is reviewable in 15 minutes or less. Skip nothing.

**Current state**: every line of the 9 priorities is on production at [vyne.vercel.app](https://vyne.vercel.app). What's left is configuration, DNS, and marketing.

---

## 1. Env vars (Vercel project settings → Environment Variables)

Run `bash scripts/setup-env.sh` (or `node scripts/setup-env.mjs`) to walk through each in order. Or set them by hand — the matrix below is grouped by feature and notes which exact code path each one unlocks.

### 1.1 Stripe billing (Priority 3)

| Variable | Source | Effect when set |
|---|---|---|
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys → Secret key (`sk_live_…`) | `/api/stripe/checkout` mints real Checkout sessions |
| `STRIPE_PRICE_ID_STARTER` | dashboard.stripe.com → Products → Starter → Pricing (`price_…`) | Pricing page Starter tier becomes purchasable |
| `STRIPE_PRICE_ID_BUSINESS` | dashboard.stripe.com → Products → Business → Pricing | Pricing page Business tier becomes purchasable |
| `STRIPE_PRICE_ID_ENTERPRISE` | dashboard.stripe.com → Products → Enterprise (optional) | Enterprise tier becomes purchasable instead of mailto:sales |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com → Developers → Webhooks → Add endpoint `https://vyne.vercel.app/api/stripe/webhook` → Signing secret (`whsec_…`) | Webhook handler verifies signatures + writes Subscription rows |

**After setting**: Stripe dashboard → Webhooks → confirm 5 events selected: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

### 1.2 Realtime — Pusher (Priority 4 default)

| Variable | Source | Effect when set |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | dashboard.pusher.com → App → Keys → `key` | Client SDK initialises |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same panel → cluster (e.g. `mt1`, `us2`, `eu`) | Client routes to the right region |
| `PUSHER_APP_ID` | Server-side from same panel | `lib/pusher.ts` server SDK initialises |
| `PUSHER_KEY` | Same value as `NEXT_PUBLIC_PUSHER_KEY` | Server SDK auth |
| `PUSHER_SECRET` | Server-side from same panel | Server publish + presence-channel signing |
| `PUSHER_CLUSTER` | Same as `NEXT_PUBLIC_PUSHER_CLUSTER` | Server-side region |

**Verification**: Settings → Realtime → "Send test event" → expects round-trip < 500ms.

### 1.3 Realtime — Supabase (alternative to Pusher)

If Pusher pricing isn't workable, set these instead and **skip the Pusher block**:

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_REALTIME_PROVIDER=supabase` | Routes the dispatcher to Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT |

### 1.4 Email — Resend (Priority 8.4 + 9.6 drip)

| Variable | Source | Effect |
|---|---|---|
| `RESEND_API_KEY` | resend.com → API Keys → `re_…` | `/api/notifications/send` + drip cron actually email people |
| `RESEND_FROM` | e.g. `VYNE <noreply@yourdomain.com>` | "From" header (must be a verified Resend domain) |

**Before setting `RESEND_FROM`**: verify your sending domain in Resend → Domains. SPF + DKIM TXT records take ~10 min.

### 1.5 Sentry (Priority 8.3)

| Variable | Source | Effect |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | sentry.io → Project → Settings → Client keys | Client + server error capture activates |
| `SENTRY_AUTH_TOKEN` | sentry.io → Settings → Auth Tokens (`sntrys_…`) | Sourcemap upload during build |
| `SENTRY_ORG` | sentry.io URL slug, e.g. `your-org` | Sourcemap target |
| `SENTRY_PROJECT` | sentry.io URL slug, e.g. `vyne-web` | Sourcemap target |

**After deploy**: Sentry → Issues → confirm at least one event ingested (trigger by visiting `/` and watching the network tab for `/api/sentry-tunnel`).

### 1.6 Web Push — VAPID (Priority 8.5)

Generate a key pair locally:

```bash
npx web-push generate-vapid-keys
```

Copy the output:

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Service worker subscribes against this |
| `VAPID_PRIVATE_KEY` | Server signs push payloads |
| `VAPID_SUBJECT` | `mailto:you@yourdomain.com` (required by spec) |

### 1.7 LiveKit — Huddles (Priority 6.1)

| Variable | Source | Effect |
|---|---|---|
| `LIVEKIT_API_KEY` | livekit.cloud → Project → Settings → Keys | `/api/huddles/token` mints JWTs |
| `LIVEKIT_API_SECRET` | Same panel | JWT signing |
| `LIVEKIT_URL` | Project URL, e.g. `wss://your-project.livekit.cloud` | Client connects here |

### 1.8 RAG embeddings — pick one (Priority 2)

Real RAG needs a real embedding provider. Without these, the `/api/ai/embed` route falls back to a deterministic 384-dim hash vector (works for demos, useless for retrieval quality).

| Variable | Source | Effect |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API Keys | Default embedding provider (`text-embedding-3-small`) |
| `VOYAGE_API_KEY` (alt) | voyageai.com | Alternative provider (`voyage-3`) |
| `EMBED_PROVIDER` | `openai` or `voyage` | Force a specific provider when both keys are set |

### 1.9 AI chat providers (need at least one)

| Variable | Source | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Claude Haiku/Sonnet/Opus default |
| `OPENAI_API_KEY` | (same as 1.8) | GPT-4o-mini fallback in compare mode |
| `GROQ_API_KEY` | console.groq.com | Llama-3.3-70b fast fallback |
| `GEMINI_API_KEY` | aistudio.google.com → API key | Image generation + grounded search |

### 1.10 Computer-use sandbox (Priority 5.5, optional)

| Variable | Source | Effect |
|---|---|---|
| `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | browserbase.com | Sandboxed browser for AI agent automation |
| `E2B_API_KEY` (alt) | e2b.dev | Alternative sandbox provider |

### 1.11 External channel invites (Priority 6.7)

| Variable | Effect |
|---|---|
| `EXTERNAL_INVITE_SIGNING_SECRET` | HMAC-signs cross-workspace channel invite tokens. Set to a random 64-char hex string (or reuse `EMBED_SIGNING_SECRET`) |
| `EMBED_SIGNING_SECRET` | Same purpose, also signs embed tokens for read-only iframes |

### 1.12 Operations — Cron + Backup (Priority 8.7, 8.8, 9.6)

| Variable | Effect |
|---|---|
| `CRON_SECRET` | Set to a random 32-char hex. Lets you trigger the daily backup + drip-email cron manually with `curl -H "Authorization: Bearer <secret>"` |
| `BACKUP_BLOB_TOKEN` | Vercel Blob read-write token. Backup cron auto-archives to Blob when set |

### 1.13 Auth + DB (already configured by Vercel Postgres integration)

| Variable | Source |
|---|---|
| `POSTGRES_PRISMA_URL` | Auto-provisioned by Vercel Postgres |
| `POSTGRES_URL_NON_POOLING` | Auto-provisioned (used by `prisma db push`) |
| `AUTH_TOKEN_SECRET` | Set to a random 64-char hex. Signs session JWTs |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Auto-provisioned by Vercel KV (Upstash) — backs the rate limiter |

### 1.14 Public URLs

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | Already set in `vercel.json` to `production` |
| `NEXT_PUBLIC_DEMO_MODE` | Already `false` in `vercel.json` |
| `NEXT_PUBLIC_STATUS_URL` | Optional. Defaults to `https://status.vyne.app`; set if you have a real statuspage.io |

---

## 2. DNS / custom domain

The app currently lives at `vyne.vercel.app`. Pointing a real apex like `vyne.dev` or `vyne.app`:

1. **Vercel dashboard** → Project → Settings → Domains → Add `vyne.dev` (or your apex).
2. Vercel returns either an `A` record (`76.76.21.21`) or a `CNAME` (`cname.vercel-dns.com`). Add to your DNS provider.
3. Vercel auto-provisions the TLS cert (~2 min after DNS propagates).
4. **Update CSP**: `vercel.json` headers section uses `vyne.vercel.app` in `Access-Control-Allow-Origin`. Find/replace to your new apex + redeploy.
5. **Update OG image** in `src/app/opengraph-image.tsx` — the bottom-right footer says "vyne.vercel.app". Change to your apex.
6. **Update sitemap + robots** — `SITE_URL` constant in both `src/app/robots.ts` and `src/app/sitemap.ts`.
7. **Update webhooks** — Stripe + any third-party webhooks have `vyne.vercel.app/api/...` URLs hard-coded. Update each to the new apex.
8. **Redirect `vyne.vercel.app` → apex**: Vercel auto-handles when you flip the apex to "primary" in the Domains panel.

After DNS propagates, run a smoke test:

```bash
curl -sI https://yourapex.com | grep -E "HTTP|content-security|x-vercel"
```

Should see `HTTP/2 200`, your CSP header echoed back, and `x-vercel-cache: HIT` on a second curl.

---

## 3. Stripe live-mode dry run

Before flipping live keys, do a test-mode end-to-end with the test card `4242 4242 4242 4242`:

1. Set Stripe keys to `sk_test_…` + test-mode `price_…` IDs in Vercel preview environment.
2. Visit `/pricing` → click Starter → complete Checkout with `4242 4242 4242 4242` / any future date / `123` / any zip.
3. Land on `/home?checkout=success`. Open Settings → Billing — should show "Active" + plan = Starter.
4. Stripe dashboard → Customers → confirm row created.
5. Stripe dashboard → Webhooks → most recent delivery → 200 OK.
6. Cancel from Settings → Billing → portal link. Confirm `customer.subscription.deleted` fires + the row flips to `plan: free`.

Now flip the env vars to live keys + repeat with a real card (or skip if you trust the dry run).

---

## 4. Pre-launch verification

Run each, expect green:

- **Build is clean**: `cd apps/web && npx next build` exits 0
- **E2E pass**: `npx playwright test` (CI runs this on every PR; the manual check is for confidence before flipping live)
- **Lighthouse**: Settings → Realtime → Send test event (round-trip < 500ms confirms Pusher)
- **Demo flow**: Open `/login` in incognito → click "Try the demo" → confirm CRM/contacts/etc render with seeded data
- **Real signup**: New email → complete signup → confirm `Subscription{status:"trialing", currentPeriodEnd: now+14d}` row exists in Postgres
- **Trial banner**: Logged-in trial user sees the banner under the topbar
- **Cost preview**: Open `/ai/chat`, type a question → cost chip appears above the composer
- **RAG end-to-end**: Drop a PDF into chat → indexing toast → ask a question about its contents → answer cites the file
- **Audit log**: POST to `/api/audit` with a test event → `GET` (admin) sees the event back
- **Backup endpoint**: GET `/api/admin/backup?download=1` → downloads JSON dump
- **Cron**: Vercel dashboard → Crons → confirm "Next run" timestamps for `/api/admin/backup` + `/api/notifications/drip`

---

## 5. Marketing & press

The launch-day deliverables live in `docs/marketing/`:

- [`press-release.md`](marketing/press-release.md) — boilerplate press release (450 words). Customize CEO quote + send to press contacts.
- [`launch-tweet.md`](marketing/launch-tweet.md) — X/Twitter thread (12 tweets) timed for launch day.
- [`product-hunt.md`](marketing/product-hunt.md) — Product Hunt listing: tagline, gallery captions, first-comment template.
- [`hacker-news.md`](marketing/hacker-news.md) — HN title + first comment + answer-prep for top 5 expected questions.
- [`email-to-press.md`](marketing/email-to-press.md) — cold-outreach template for journalists (TechCrunch / The Information / Lenny / a16z / etc).
- [`launch-day-script.md`](marketing/launch-day-script.md) — hour-by-hour playbook (T-2h prep through T+24h close-out).

Pre-launch:

1. **Schedule the Product Hunt launch** (12:01am PT for max US visibility). Create an unlisted draft 24h ahead so the hunter can claim early.
2. **Pre-warm the audience** — DM 20-50 people the day before with a "we're launching tomorrow, would mean a lot if you could upvote at 7am ET" ask.
3. **Schedule the launch tweet** in Typefully or Hypefury for 8am ET.
4. **Brief the team** on Slack: launch URL, where to share, who's on press calls today.

---

## 6. Post-launch monitoring (first 48h)

Watch these dashboards in this order of priority:

1. **Vercel → Deployments** — confirm the production deploy is serving 2xx for every request. Any 5xx in the first hour gets investigated immediately.
2. **Sentry → Issues** — first occurrence of any unhandled error. Anything with > 5 occurrences in the first hour is a hotfix priority.
3. **Stripe → Payments** — confirm at least one real transaction lands. Watch for `payment_failed` events that might indicate a webhook misconfiguration.
4. **Vercel Analytics** — page-view spike on landing + pricing. Healthy ratio: pricing page views / landing views ≥ 0.15. Lower means the landing CTA is buried.
5. **Postgres → connection count** — Vercel Postgres free tier caps at ~25 concurrent. If you see queue spikes, upgrade to Pro or move the heavy reads (RAG retrieve) to a read replica.
6. **Upstash Redis → ratelimit hits** — many 429s = either an attacker probing or you're throttling legitimate users. Tune in `lib/api/security.ts`.
7. **/status page** — keep this open in a tab. It surfaces operational/degraded/outage from your statuspage.io feed.

Daily for the first week:

- Review the previous day's audit log: `/settings → Audit log` (admin) or query Postgres `SELECT category, action, COUNT(*) FROM audit_events WHERE created_at > NOW() - interval '24h' GROUP BY 1, 2 ORDER BY 3 DESC`. Anomalies stand out.
- Backup confirmation: Vercel Cron → `/api/admin/backup` → check the response logs for `created` counts. If `failed > 0` for any entity, dig into the error.
- Drip sent count: Postgres `SELECT COUNT(*) FROM audit_events WHERE action LIKE 'drip:%' AND created_at > CURRENT_DATE`. Should match approximately yesterday's signups × 1 step.
- Inbox triage: `support@vyne.dev` (or wherever you set your support inbox). Reply to every message in < 24h for the first month. This is how you find the bugs the analytics miss.

---

## 7. The ten rough edges users will hit first (rank-ordered)

Pre-empt the top complaints before they show up:

1. **"It signed me up but my data is mock data, not mine."** → 1.5 server-side seed solves this; document it in onboarding step 1 ("Try the demo data, then import your real data from Settings → Data & backups").
2. **"The AI is slow."** → Cost meter chip pre-empts billing surprise; add a model selector chip on the chat composer that lets people pick Haiku for speed.
3. **"I can't find the export button."** → Already shipped on every list. Add a one-line tooltip pointing it out on first visit.
4. **"Stripe redirected me but I'm still on the trial."** → Webhook lag is usually < 5s. If user reports > 60s, check webhook signing-secret mismatch.
5. **"Why are my pinned channels gone after refresh?"** → Personalization store is localStorage today. Server-sync is on the post-launch backlog (Priority 24 in old plans).
6. **"How do I invite my team?"** → Settings → Members → Invite. Surface this as the first welcome-checklist step.
7. **"Mobile is missing the bottom nav."** → Should auto-render at ≤ 768px; if not, suspect a custom CSS override. Ship-blocker — fix before launch.
8. **"What happens if I cancel?"** → Pricing FAQ + a paragraph in the cancellation flow itself.
9. **"My PDF didn't get indexed."** → Server hits the 8 MB cap or the PDF is image-only (needs OCR). Surface specific error per case.
10. **"How do I delete my account?"** → Settings → Trash → "Delete workspace". Also wire `/api/gdpr/forget` to a "Delete forever" button in Privacy settings.

---

## 8. Sign-off

**This checklist is done when:**

- [ ] All env vars in §1 set in Vercel production
- [ ] Custom domain pointed (or you've decided to stay on `vyne.vercel.app` for v1)
- [ ] Stripe live-mode dry-run completed end-to-end
- [ ] Pre-launch verification (§4) all green
- [ ] Marketing assets (§5) final-edited and scheduled
- [ ] Post-launch monitoring (§6) tabs open + Sentry alert routes configured
- [ ] Pricing page tested with a real card or staged test card

**Then ship.**
