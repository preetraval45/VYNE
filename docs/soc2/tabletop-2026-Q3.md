# Tabletop Exercise — 2026 Q3 (Sample / Pre-launch)

**Date:** 2026-06-05 · **Facilitator:** Preet Raval · **Scenario:** B
(Neon outage during peak traffic) · **Duration:** 45 min · **Status:** dry-run

This is a written walk-through of the incident-response runbook
without touching production. The point is to surface gaps in the
runbook BEFORE we need to use it in anger. Quarterly cadence; next
scheduled 2026-09-01.

## Scenario

> 2026-06-04 14:32 ET. Sentry alert: `Database is unreachable` firing
> across every route handler. Vercel function logs show
> `PrismaClientInitializationError: Can't reach database server at
ep-shiny-scene-anii5yhz.c-6.us-east-1.aws.neon.tech:5432`. Neon
> status page shows "Investigating elevated error rates in us-east-2".
> Customer traffic at peak. Five customer emails received in the
> first 10 minutes asking if VYNE is down.

## Walk-through

### T+0 — Detection

| Time | Step                                | Pass/Fail | Notes                                                 |
| ---- | ----------------------------------- | --------- | ----------------------------------------------------- |
| T+0  | Sentry alert fires to on-call email | ✓         | Alert rule confirmed in Sentry org settings           |
| T+2  | On-call acknowledges in 5-min SLA   | ✓         | Single-operator path; would auto-page via SMS in prod |
| T+5  | Cross-check Neon status page        | ✓         | Bookmarked in operator&apos;s ops dashboard           |

### T+5 — Triage

| Time | Step                   | Pass/Fail | Notes                                                                                                                                                                         |
| ---- | ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T+5  | Classify severity      | ✓         | SEV1 — full prod outage. Aligned with runbook table.                                                                                                                          |
| T+10 | Open /status incident  | ⚠ Gap     | /status incidents are currently static (in source). Need an admin-UI affordance to open + edit incidents live. **Backlog item for PH-J or PH-I+1.**                           |
| T+10 | Notify legal           | ✓         | No PII exposure for an availability incident; legal not paged.                                                                                                                |
| T+15 | Decide mitigation path | ✓         | Wait vs failover. Decision: wait 15 min for Neon; if not recovered, failover via Neon PITR to a us-east-1 branch per [db-restore.md → Scenario C](../runbooks/db-restore.md). |

### T+15–30 — Communication

| Time | Step                                   | Pass/Fail | Notes                                                                                  |
| ---- | -------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| T+15 | Post first /status update              | ⚠ Gap     | Manual edit + git push; deploy takes 4 min on a non-DB-backed update. Not fast enough. |
| T+15 | Send proactive email to all customers? | ✓         | Decision: yes, for full outages. Template in `docs/email-templates/sev1.md` (TBD).     |
| T+30 | Post second /status update             | ✓         | Plan: 30-min cadence per runbook.                                                      |

### T+30 — Recovery

Assumed: Neon recovers at T+38. Recovery path:

| Time | Step                                         | Pass/Fail | Notes                                                   |
| ---- | -------------------------------------------- | --------- | ------------------------------------------------------- |
| T+38 | Neon green                                   | ✓         |                                                         |
| T+40 | Verify Prisma reconnects without app restart | ✓         | Verified locally: Prisma reuses pool. No deploy needed. |
| T+42 | Spot-check critical paths                    | ✓         | /api/auth/login, /api/deals, /home all return 200.      |
| T+45 | Mark /status incident resolved               | ✓         |                                                         |
| T+90 | Send postmortem-style summary email          | ✓         | Within 72h commitment.                                  |

### T+next-business-day — Postmortem

Postmortem document outline (real one would live in
`docs/postmortems/2026-06-04-neon-outage.md`):

1. Timeline (T+0 → resolved)
2. Customer impact (X req errored, ~Y customers affected)
3. Root cause (Neon-side; our docs cite their RCA when published)
4. What worked: Sentry detection, single-operator response was fast
5. What didn&apos;t: /status incident creation took 4 min (deploy
   bottleneck)
6. Action items (next):
   - [ ] Build admin-UI affordance to open + edit /status incidents
         without a deploy (Owner: operator; Due: 2026-07-15)
   - [ ] Add `docs/email-templates/sev1.md` (Owner: operator; Due: 2026-06-30)
   - [ ] Add a "cached database degraded" mode to /status that an
         operator can flip in <60s

## Gaps surfaced by this exercise

| #   | Gap                                                              | Severity | Owner                    | Due        |
| --- | ---------------------------------------------------------------- | -------- | ------------------------ | ---------- |
| 1   | /status incidents are static — need admin-UI live editing        | medium   | operator                 | 2026-07-15 |
| 2   | No `docs/email-templates/sev1.md` ready to send                  | medium   | operator                 | 2026-06-30 |
| 3   | No automated "DB unreachable for >5 min" pager beyond Sentry     | low      | operator                 | 2026-09-01 |
| 4   | Single-operator: no automated escalation if first page is missed | known    | (n/a until 2nd operator) | (n/a)      |

## What worked

- Sentry detection within 30s of first failed request
- The DB restore runbook ([docs/runbooks/db-restore.md](../runbooks/db-restore.md))
  was followable end-to-end without needing to look anything up
- Neon PITR shortcut (Scenario A in the runbook) was the right
  primary plan; failover (Scenario C) was correctly held as plan B
- 30-min update cadence felt right — not so often it&apos;s
  performative, not so rare customers wonder if we&apos;ve given up

## Sign-off

| Role                    | Name        | Date       |
| ----------------------- | ----------- | ---------- |
| Facilitator             | Preet Raval | 2026-06-05 |
| On-call (this exercise) | Preet Raval | 2026-06-05 |

Next tabletop: **2026-09-01** — Scenario A (stolen session cookie /
auth bypass).
