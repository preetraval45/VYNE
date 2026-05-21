# Hacker News Show HN

Submit at **noon ET (9 AM PT)** on launch day. The HN audience hates marketing speak — every word here is technical, terse, and earns trust through specifics. Aim for sub-200 chars in the title.

---

## Title (HN max 80 chars)

**Show HN: VYNE – AI-native workspace replacing Slack, Jira, Notion in one app**

Alternatives to A/B (only one will go live):

1. **Show HN: I built an AI workspace that replaces 8 SaaS tools (Postgres + Next.js)**
2. **Show HN: VYNE – an AI agent that reads + writes across CRM, projects, finance, chat**
3. **Show HN: An AI-native company OS – live demo, no signup**

Pick #1 unless your warm audience prefers a more concrete one.

---

## URL field

`https://vyne.vercel.app`

(Not `/login` or `/pricing` — HN crowd wants the landing page directly. The landing page hooks them; pricing is a one-click jump.)

---

## First comment (post immediately, this is half the launch)

```
Hey HN — VYNE is a single workspace that replaces Slack, Jira, Notion, and Salesforce. The non-obvious bit isn't "another all-in-one app." It's that the AI can read + write across every module (chat, projects, CRM, ops, finance, contacts) via tool-calling, with approval gates on destructive writes and a server-persisted audit trail.

The query that sold it for me: "which paying customers have an open support ticket and a deal in the negotiation stage?" Three seconds, cited rows from invoicing + support + CRM. That's a 30-minute SQL job in a normal stack.

Stack:
* Next.js 15 / React 19 / TypeScript on Vercel
* Postgres (Vercel Postgres + Prisma)
* Pusher for realtime (Supabase Realtime as a swap-in alt)
* Stripe for billing, with a 14-day trial
* LiveKit for ad-hoc audio "huddles" in any chat channel
* Multi-model AI: Claude (default), GPT-4o-mini, Groq Llama, Gemini
* RAG over uploaded PDFs (chunk → embed → pgvector retrieval)
* SOC 2 path: audit log Prisma model, field-level permissions, RBAC, GDPR export/erasure endpoints

What's there that I'm proudest of:
* Cmd+K searches across every entity + AI fall-through ("Ask Vyne AI" appears when no exact match)
* Inline editing on every list with live-collab borders (per-cell Pusher channel)
* AI agent traces — every multi-step run logs as a vertical timeline with replay-on-failure
* Continuous voice mode with barge-in (browser-native SpeechRecognition + SpeechSynthesis)
* /skill <slug> in the chat composer runs a saved multi-step tool chain
* Daily Postgres backup to Vercel Blob via Vercel Cron
* Lighthouse CI + Playwright E2E on every PR

Free tier with no credit card. $12/seat for the real product. Try the demo at vyne.vercel.app/login → "Try the demo".

Solo build, ~3 months, with AI dev tooling doing a lot of the heavy lifting. Happy to answer anything.
```

---

## Reply prep — top 5 expected questions

HN questions are sharper than PH/Twitter. Have these ready:

**Q: "Why does this need to exist? Notion + Linear + Slack + Stripe is fine."**

The fine answer is: it isn't fine. Knowledge work involves cross-module questions every day, and current tooling answers those questions by either (a) building a custom dashboard that goes stale, or (b) someone copy-pasting from 5 tabs into a 6th. VYNE answers them by running a tool-calling agent over a single Postgres database with audit-trailed access. The integration tax of separate tools is what I'm pricing in.

**Q: "What stops the AI from hallucinating + breaking my data?"**

Three things: (1) every write tool routes through a `splitToolCallsForApproval()` gate — destructive operations (`updateDeal`, `deleteTask`) render as inline approval cards; the user clicks Approve before anything mutates. (2) Every executed call gets an `AuditEvent` row with actor + diff + IP. (3) The `/api/admin/backup` endpoint runs nightly via Vercel Cron, archiving every entity to Vercel Blob; restore is a JSON re-import.

**Q: "Multi-model AI sounds like complexity for its own sake."**

The split is task-specific: Claude Sonnet/Opus for reasoning + tool-calling (best capability), Groq Llama for speed-sensitive ops (smart-replies, classification — sub-second), Gemini for image gen + grounded search (free quotas). The provider routing lives in `lib/ai/streamClient.ts`; it's ~50 lines of fallback logic. Cost meter shows live spend so the user sees the trade-off.

**Q: "Is this really one person?"**

Yes. The repo is ~250K LOC. I documented every shipped phase in a public plan (`docs/UI_UPGRADE_PLAN.md`) and the commits show the phasing — one feature batch per commit, ~30 commits. AI dev tooling did 60-70% of the typing; the architecture decisions, debugging, and integration work were mine.

**Q: "What's the moat?"**

Two things: (1) The thesis bet — "one workspace, one AI" is a config of the product, not just a feature, and competitors built around point solutions can't refactor without losing their existing customer base. (2) The integration count — by launch, 11 modules persist to the same Postgres, the AI tool-calling layer reads + writes across all 11, and Cmd+K searches them all. Adding a 12th is one factory file. Replicating 12 is the moat.

---

## What NOT to do on HN

- Don't post the launch tweet thread as your first comment — HN reads as marketing
- Don't engage with low-quality "how is this different from X" replies that don't actually engage
- Don't argue with the "this will fail because [enterprise sales hard]" crowd. Just say "we'll see" and move on
- Don't ask people to upvote — the algo will downrank
- Don't post on a Friday or Saturday (low traffic). Tuesday/Wednesday/Thursday only

---

## Cadence

- **9:00 AM PT** — submit the post + drop the first comment within 60 seconds
- **9:30 AM PT** — DM the 20 closest HN-active friends (NOT mass DMs — personalized; HN bans for vote rings if it sees coordinated upvoting)
- **11:00 AM PT** — first front-page check; if you're below #20, the post probably won't make it. Reply to every existing comment regardless.
- **2:00 PM PT** — second front-page check. If you peaked between #5–#15 you'll get 5-10K visitors today.
- **5:00 PM PT** — write a thank-you reply to your top critic (the person who pushed back hardest but engaged genuinely). HN audience respects this.
- **8:00 PM PT** — post will fall off the front page. Pin the screenshot of peak rank to your X profile.

Realistic outcome: top 30 = 500-1000 visitors. Top 10 = 5K-10K. Top 3 = 30K+ and a press inbound.
