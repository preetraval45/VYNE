# Launch-day script

Hour-by-hour playbook from T-2h prep through T+24h close-out. Print this. Tape it to your monitor.

All times **launch-day local time**. The "anchor" is **8:00 AM ET launch tweet** — every other event is relative to that.

---

## T-2 days (Sunday for a Tuesday launch)

- [ ] Final read of `docs/LAUNCH_CHECKLIST.md` §1 — every required env var set in Vercel production
- [ ] Stripe live-mode dry run (real card, $1 test charge — refund immediately)
- [ ] Smoke test: `/login` demo → `/signup` real → `/ai/chat` PDF Q&A → `/pricing` checkout → all green
- [ ] Schedule Product Hunt as **unlisted** for 12:01 AM PT launch day
- [ ] DM your hunter (if using one) the listing URL for early review
- [ ] Run Lighthouse manually on the 6 key routes — note any score < 80 that needs a hot patch
- [ ] Set Sentry alert routes: any unresolved P0 (>10 events) pings your phone

## T-1 day (Monday for a Tuesday launch)

- [ ] Pre-warm DM list: 50-100 contacts who'd plausibly upvote / share
  - Template: "Hey [name] — launching VYNE on PH + HN tomorrow. The thesis: AI workspace that replaces 8 tools. Would mean a lot if you can upvote at 12:01 AM PT (or whenever you're up). Demo is real, not vaporware: [link]. Thanks 🙏"
- [ ] Schedule the launch tweet thread in Typefully for **8:00 AM ET**
- [ ] Schedule the press emails to send Tuesday 7:00 AM ET (one outlet at a time)
- [ ] Final pricing-page polish: confirm price IDs match production, FAQ wording is right
- [ ] Tell your support inbox who's covering replies during launch day
- [ ] Get a good night's sleep. Set alarm for 5:30 AM ET (PH launch window opens at midnight PT but the maker doesn't need to be up until prep-time)

---

## Launch day

### T-2:30 (5:30 AM ET) — wake-up + system check

- [ ] Coffee
- [ ] Confirm Product Hunt listing went live at 12:01 AM PT (3:01 AM ET); reply to any early comments
- [ ] Open these tabs and keep them open all day:
  - PH listing
  - HN submission queue (you'll submit at noon ET)
  - Vercel deployments + logs
  - Sentry → Issues
  - Stripe → Payments
  - X / Twitter (your account + the launch thread)
  - vyne.vercel.app (smoke check every hour)
  - email + Slack

### T-1:00 (7:00 AM ET) — press outreach

- [ ] Send personalized cold-email to the 7 priority press contacts (TC / Verge / The Information / Axios / Lenny / Pragmatic Engineer / Big Technology)
- [ ] Each gets a different subject line; one outlet "exclusive" if they reply within 4h
- [ ] Update your press tracking sheet — date sent, status

### T-0:00 (8:00 AM ET) — anchor: launch tweet goes live

- [ ] Confirm the scheduled thread fired
- [ ] First reply to the anchor tweet: drop the demo link
- [ ] Pin the anchor tweet to your X profile
- [ ] DM the warm 50: "we're live, [link to the anchor tweet]"

### T+0:30 (8:30 AM ET) — first wave

- [ ] PH front-page check: where are you ranked?
- [ ] Reply to every PH comment (be there in person — robotic replies destroy launch traction)
- [ ] First metric pull: visitors / signups / Stripe events. Even 5 signups in 30 min is healthy.

### T+2:00 (10:00 AM ET) — momentum check

- [ ] Reply to every X reply on the anchor tweet
- [ ] If a power-user retweets, quote-tweet them with a personalized thanks (boosts their reach + makes them feel seen — they retweet again)
- [ ] Sentry sweep: any P0 unresolved? Hotfix priority.
- [ ] Vercel logs: any 5xx spikes? Drill into the route.

### T+4:00 (12:00 PM ET / 9:00 AM PT) — Hacker News submission

- [ ] Submit `Show HN: VYNE – AI-native workspace replacing Slack, Jira, Notion in one app`
- [ ] Drop the prepared first comment (`docs/marketing/hacker-news.md`) within 60 seconds
- [ ] DM 20 closest HN-active friends (NOT a mass DM — one-by-one, personalized)
- [ ] Don't ask for upvotes — HN's vote-ring detection will downrank you. Just say "we're live, would value your eyes on the technical thread."

### T+6:00 (2:00 PM ET) — second wave

- [ ] HN front-page check. Top 30? Reply to every comment. Top 10? Cancel any meetings, you're on the front page.
- [ ] PH leaderboard check. Top 5? Tweet the rank screenshot. Top 3? Pin it everywhere.
- [ ] Second wave of DMs: anyone in your network who hadn't seen the launch yet
- [ ] Press inbox check: any replies to the morning emails?

### T+8:00 (4:00 PM ET) — crisis hour

- [ ] First sustained 5xx spike (if any) usually shows up here when load builds. Vercel logs first, Sentry second.
- [ ] If Stripe is down, the pricing page checkouts fail silently — confirm one fresh checkout works.
- [ ] If Postgres connection count spikes (Vercel Postgres free tier ~25 concurrent), mitigate by adding `connection_limit=10` to the pooled URL or enabling Neon/Postgres Pro.

### T+10:00 (6:00 PM ET / 3:00 PM PT) — east coast wraps, west coast peaks

- [ ] Post a "going to bed at #X on PH, thanks all" tweet to the anchor thread to ride the momentum
- [ ] Reply to every still-unanswered PH comment
- [ ] Email recap: send a "today's stats" message to the team / advisors (signups, top tweet engagement, PH rank, HN rank)

### T+13:00 (9:00 PM ET) — west coast wraps

- [ ] Final PH leaderboard check. Screenshot the rank.
- [ ] Final HN check. If you peaked in the top 10, the post is still drawing traffic.
- [ ] Set tomorrow's first task: write the "we made it to top X on PH, here's what surprised us" follow-up tweet for 10 AM ET

### T+18:00 (2:00 AM ET) — sleep

If you've made it to T+18 and not collapsed, the launch worked. Sleep.

---

## T+24h (Wednesday morning, the day after launch)

- [ ] **Numbers email** — to advisors, investors, team. Include: signup count, $0/Free vs $12+/Starter conversion, top-traffic source, top-shared tweet, PH final rank, HN peak rank, press replies pending.
- [ ] **The follow-up tweet** — "we hit #X on PH yesterday. here's what surprised us 🧵." 7-10 tweets of insights, not victory laps. Examples that work:
  - "the most-commented feature wasn't the AI — it was Cmd+K"
  - "62% of signups came from a single retweet by [@influencer]"
  - "the demo button gets 3× more clicks than the signup CTA — we'll move it to the hero"
- [ ] **Reply to every press email that came in overnight**
- [ ] **Triage support inbox** — every email gets a reply within 24h for the first month. This is how you find the bugs analytics miss.
- [ ] **Hotfix sweep** — review yesterday's Sentry issues; ship fixes for anything with > 5 occurrences

## T+48h to T+7d

- [ ] One post-mortem doc: what worked, what didn't, what to do differently next launch
- [ ] If a press piece is in flight: confirm publish date, share the hosted-image / demo video they need
- [ ] First retention check: of the signups from launch day, how many returned on day 2? Day 3? This is your single most-important number for the next month
- [ ] If retention is healthy (> 30% day-2): pour gas on paid acquisition (Twitter ads to your retweets, LinkedIn promoted posts targeting "ops manager" / "founder")
- [ ] If retention is mid (10-30%): focus on the activation gap. Where do users drop off? Onboarding? AI-first-use? Pricing-page bounce? Find the gap, ship a fix, watch the next cohort
- [ ] If retention is poor (< 10%): pause acquisition. Talk to 20 churned users. Find the why before spending another dollar on growth.

---

## Crisis playbook

**If the site goes down:**
1. Vercel logs first. Look for 5xx + cold-start errors.
2. If it's a Postgres connection issue, switch to the non-pooling URL temporarily and bump connection limits.
3. If it's a runtime error, redeploy the previous build via `vercel rollback`.
4. Tweet "investigating, back in 5" — silence is worse than a tweet.

**If a critical AI route 500s under load:**
1. Sentry → grep for the error pattern.
2. Most likely cause: an upstream LLM provider (Claude / OpenAI / Groq) hit rate limits. The fallback chain in `lib/ai/streamClient.ts` should kick in — confirm.
3. If a single provider is down, comment out its key in Vercel env temporarily. The fallback engages.

**If Stripe webhooks fail:**
1. Stripe → Webhooks → recent deliveries. Look for non-200s.
2. Common cause: signing-secret mismatch. Verify `STRIPE_WEBHOOK_SECRET` matches the dashboard's most recent value.
3. Stripe auto-retries failed webhooks for 3 days. Subscription state catches up automatically once you fix.

**If a tweet goes viral and traffic 100×s:**
1. Vercel scales automatically — watch for 5xx, not capacity.
2. The single bottleneck is usually Postgres connections. Pre-warm by bumping the connection pool before the spike if you can see it coming.
3. Vercel Analytics has a 2.5K event/mo free tier. Consider upgrading mid-launch if you're going to overshoot.

**If a critic posts a thread bashing the product:**
1. Read it carefully. Most critique has a kernel of real insight.
2. Reply once, in good faith. Acknowledge what's right, push back on what's wrong, never insult.
3. Move on. Engaging beyond one reply rewards the bad-faith pile-on.

---

## End-of-week debrief

By Sunday night (5 days after launch):

- [ ] Final numbers tally: signups, paying customers, MRR, top-of-funnel sources
- [ ] Retention by cohort: day-1, day-3, day-7
- [ ] Top 3 product wins (based on user replies)
- [ ] Top 3 product gaps (the bugs / missing features users mention most)
- [ ] Press piece pipeline: which outlets in flight, expected publish dates
- [ ] Next launch: what's the second wave (Hacker News re-share? Newsletter guest post? a16z scout outreach?)
- [ ] Take a day off. Launch days burn a week of energy in 24h.
