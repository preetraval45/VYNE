# Launch tweet thread

Schedule for **8:00 AM ET launch day** in Typefully or Hypefury. 12 tweets. Each is < 280 chars; copy-paste straight in.

---

## Tweet 1 (anchor — most-shared, write the strongest hook)

I built an AI-native workspace that replaces Slack, Jira, Notion, and Salesforce.

One app. One AI that knows about every deal, every doc, every channel.

Free to try. Live now → vyne.vercel.app

(thread on what's actually inside ↓)

---

## Tweet 2

The thesis is contrarian but lands when you use it:

teams don't need 15 disconnected tools. They need 1 workspace where the AI can see everything, and reason across it.

"which customers with overdue invoices have an open ticket?" — instant answer. No analyst required.

---

## Tweet 3 — feature drop 1 (chat)

Chat that doesn't suck.

→ Threads inline (Linear-style, no panel-flip)
→ AI catch-up when you've been away
→ /skill foo runs a saved multi-step chain
→ Huddles (Discord-style voice in any channel)
→ Per-channel notification schedule
→ Translate any message in one tap

[GIF: chat with inline thread expansion]

---

## Tweet 4 — feature drop 2 (AI)

The AI is the real product.

→ Reads + writes across every module via tool-calling
→ Approval gate before any destructive write
→ Continuous voice mode with barge-in
→ RAG over your uploaded files (drop a PDF, ask)
→ Cost preview before you submit

[GIF: AI agent trace showing 3-step chain]

---

## Tweet 5 — feature drop 3 (records)

Every list is inline-editable.

Double-click any cell → edit. Live border shows when a teammate is editing. Saves optimistically, reverts on failure.

CRM, contacts, invoicing, ops products, expenses — all one motion.

[GIF: cell editing with collab border]

---

## Tweet 6 — feature drop 4 (Cmd+K)

Cmd+K is the operating system.

Search every deal, contact, task, invoice, doc, message, channel.
No match? "Ask Vyne AI: '...'" appears as the bottom row.
Fuzzy search + chip syntax (type:deal from:sarah).

This single feature replaces 4 SaaS tools.

---

## Tweet 7 — receipts (production)

Production-grade, not a demo:

→ Postgres-backed (Vercel Postgres + Prisma)
→ Real-time over Pusher (or Supabase, your choice)
→ Stripe billing with 14-day trial
→ SOC 2 path: audit log, field permissions, RBAC, GDPR endpoints
→ E2E tests + Lighthouse CI on every PR

---

## Tweet 8 — receipts (scope)

Numbers from this build:

→ 33 dashboard pages
→ 11 modules persisted to Postgres
→ 6 modules with inline editing
→ 28 phases of UI shipped
→ ~1900 lines on the landing page alone
→ Full Cmd+K + 50+ commands
→ 8+ AI agents

Solo build. ~3 months. Yes really.

---

## Tweet 9 — pricing

Pricing:

Free — 1 user, AI included. No credit card.

Starter $12/seat — 10 users, real AI budget, real-time, RAG.

Business $24/seat — 50 users, Opus, priority support, full audit retention.

Enterprise — SSO, BYOK, on-prem.

vyne.vercel.app/pricing

---

## Tweet 10 — origin story

Why I built it:

Every team I've worked at runs on 12+ tools. Status updates, weekly reviews, sales reviews — every meeting starts with someone copy-pasting from 4 tabs into a 5th tab.

That's not a software problem. It's a software-architecture problem.

VYNE is the fix.

---

## Tweet 11 — call-to-action

Try it now:

1. Demo (no signup): vyne.vercel.app/login → "Try the demo"
2. Real signup (14d trial, no card): vyne.vercel.app/signup
3. Pricing + FAQ: vyne.vercel.app/pricing

Reply with what you build with it. I read every reply.

---

## Tweet 12 — gratitude / boost

Last one — I built this with [Anthropic Claude / your AI dev tool]. Shipping at this scope solo wouldn't be possible without it.

If you like what I'm doing, retweet the first tweet so more builders see this.

🙏

---

## Reply prep — top 5 expected questions

**Q: "How is this different from Notion / ClickUp / Linear?"**
Notion is docs + DB. Linear is project management. ClickUp is the "everything app" promise without the AI integration. VYNE is the only one where one AI agent can read + write across CRM + ops + finance + chat, with approval gates and an audit trail. Try the AI chat at /ai — it's not bolted-on.

**Q: "Who is the team?"**
Solo-built today. Hiring. DM if you want to join.

**Q: "Is the data really mine?"**
Yes. GDPR export + erasure endpoints exist. Daily Postgres backups to Vercel Blob. Demo workspace stays demo; signup creates a fresh isolated workspace.

**Q: "What's the AI under the hood?"**
Multi-model: Claude (default), GPT-4o-mini, Groq Llama, Gemini. Bring-your-own-key on Enterprise. Cost-meter shows spend live.

**Q: "Will you raise?"**
[Customize: yes / no / not yet / DM me]
