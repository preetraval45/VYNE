# Product Hunt launch listing

Schedule the launch for **12:01 AM PT on launch day** (Tuesday or Wednesday for max US visibility, never Friday/Saturday). Create the draft as **unlisted** 24h ahead so your hunter can claim it early.

---

## Tagline (60 char max — most important field)

**One AI workspace that replaces Slack, Jira, Notion, and Salesforce**

Alternative options to A/B:

1. **AI-native company OS — replaces 8 tools, one workspace**
2. **Run your whole company in one AI-grounded workspace**
3. **The workspace where AI can read + write across everything**

Pick #1 unless one of the others outperforms in your pre-launch audience test.

---

## Description (260 char max)

VYNE is the AI-native workspace that replaces Slack + Jira + Notion + Salesforce. One AI agent reads + writes across every module — chat, projects, CRM, ops, finance — so questions like "which paying customers have overdue tickets?" get answered in seconds.

---

## Topics (pick 3-5)

- Productivity
- Artificial Intelligence
- SaaS
- No-Code
- Developer Tools

---

## Maker comment (post immediately, pinned at top)

```
Hey Product Hunt! 👋

I built VYNE because I was tired of running my company across 12 disconnected tools.

The thesis: teams don't actually need separate apps for chat, projects, docs, CRM, accounting, and ops. They need ONE workspace where the AI can read + write across all of it. So I built that.

What's inside:
• AI agent that creates/updates/deletes records across every module (with approval gates)
• Drop a PDF in chat → ask questions → cited answers
• Continuous voice mode (hands-free, with barge-in)
• Huddles (Discord-style ad-hoc audio in any channel)
• /skill foo runs a saved multi-step chain
• Cmd+K with AI fall-through ("Ask Vyne AI" appears when no match)
• Every list is inline-editable with live collab borders

It's production-grade — Postgres-backed, Stripe billing with 14-day trial, real-time over Pusher, audit log, field-level permissions, GDPR endpoints. SOC 2-ready.

Free tier: full AI, 1 user. $12/seat for Starter. $24/seat for Business.

Try the demo (no signup): vyne.vercel.app/login → "Try the demo"

I'm here all day to answer questions. Especially curious which feature surprises you most when you actually use it. 🙏
```

---

## First-day reply prep

When the inevitable first 5 questions land:

**"What stack did you use?"**
Next.js 15 + React 19 + TypeScript on Vercel Edge. Postgres + Prisma. Pusher for realtime (Supabase Realtime as alt). Stripe for billing. LiveKit for huddles. Multi-model AI (Claude + GPT-4o-mini + Groq Llama + Gemini). All on the Vercel free tier or close to it for now.

**"How long did this take to build?"**
~3 months solo, with AI dev tooling doing a huge amount of the heavy lifting. The repo is ~250k LOC. I documented every phase in a public plan; happy to share if useful.

**"Is this open-source?"**
Not today. The product needs to charge to be sustainable. I'm watching the source-available trend (Cal.com, Plane, Outline) and may carve out parts later.

**"Where do you fit vs. Notion / Linear / Mem?"**
Notion = docs + DB. Linear = projects. Mem = personal notes with AI. VYNE is the only one where ONE agent acts across CRM + ops + finance + chat with an audit trail and approval gates. The "ask one question, get one answer across 4 modules" flow is what nobody else has end-to-end.

**"Will you raise / are you raising?"**
[Customize answer]

**"Why should I trust my data to a solo dev?"**
Real concern. Three answers: (1) every record is exportable as CSV + JSON via Settings → Data & backups; (2) daily Postgres backups archived to Vercel Blob with the existing GDPR export/erasure endpoints; (3) the AGPL audit log is on by default — every state change is server-persisted with actor + IP + diff. The receipts are stronger than most VC-backed teams.

---

## Visual assets needed

- **Hero gallery image** (1270 × 760, max 5 MB): screenshot of the AI chat answering a cross-module question with citations from CRM + invoicing
- **Gallery #2**: Cmd+K palette showing search results across 4 modules
- **Gallery #3**: huddle dock with 3 participants in a #sales channel
- **Gallery #4**: pricing page
- **Demo video** (60-90s, MP4): screen recording walking through signup → AI chat with PDF Q&A → CRM inline edit → huddle start. Talk track optional but recommended.
- **Logo** (240 × 240 PNG): use existing `apps/web/public/brand/logo-mark.svg` exported to PNG.
- **Maker headshot** (240 × 240 PNG): obvious.

---

## Hunter outreach (T-3 days)

If you don't have a hunter, reach out to:

- @rrhoover (PH founder)
- @chrismessina (top hunter, hunts 10+/week)
- @kevinwill (hunts AI products specifically)
- @bram (hunts dev-tool products)

Cold DM template:

```
Hey [Name] — building VYNE, an AI-native workspace that replaces Slack/Jira/Notion/Salesforce in one app. Launching on PH next [Tuesday]. Would mean a lot if you'd hunt it. Demo (no signup needed): vyne.vercel.app/login

Happy to share the gallery + tagline ahead of time so you can review.

Thanks!
```

---

## Day-of cadence (PT timezone since PH runs on PT)

- **12:01 AM** — launch goes live, drop the maker comment immediately
- **5:00 AM** — first wave of replies + DM the warm 50 ("we're live, would mean a lot if you upvote: [URL]")
- **6:00 AM ET / 3:00 AM PT** — schedule the launch tweet thread to go out at 8:00 AM ET
- **9:00 AM PT** — top 5 PH front page check, reply to every comment
- **12:00 PM PT** — post on Hacker News (separate launch — see hacker-news.md)
- **3:00 PM PT** — second wave of DMs to anyone who hadn't seen it yet
- **6:00 PM PT** — write a "going to bed at #X on PH, thanks all" post on X to ride the momentum
- **11:59 PM PT** — count the votes, screenshot the leaderboard, plan a "we made it to top X" follow-up tweet for the next morning

Goal: top 5 of the day. Top 3 if the audience is warm.
