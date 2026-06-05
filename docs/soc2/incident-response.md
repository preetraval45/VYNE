# Incident Response

**Owner:** Preet Raval · **Last reviewed:** 2026-06-05 · **Tabletop cadence:** quarterly (next: [tabletop-2026-Q3.md](./tabletop-2026-Q3.md))

## Severity definitions

| SEV      | Meaning                                                                                            | Response time                | Customer notice                                                                        | Resolution target               |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| **SEV1** | Confirmed data exposure OR full prod outage OR auth bypass OR billing-affecting bug                | Page on-call immediately     | /status incident within 30 min; affected customers via email within 72h (GDPR Art. 33) | Mitigate within 4h              |
| **SEV2** | Partial outage OR feature broken for >50% of users OR security vulnerability with no known exploit | Page on-call within 15 min   | /status incident within 60 min                                                         | Mitigate within 24h             |
| **SEV3** | Degraded performance OR feature broken for <50% of users OR cosmetic security issue                | Notify on-call within 60 min | Optional /status update                                                                | Mitigate within 5 business days |
| **SEV4** | Single-user issue, non-blocking                                                                    | Ticket                       | None                                                                                   | Next sprint                     |

## On-call

**Current rotation:** single operator (Preet Raval). 24/7 PagerDuty
(or Sentry → SMS) escalation. When a second operator joins, the
rotation becomes 1-week-on / 1-week-off with handover at Monday 09:00 ET.

**Sources of pages:**

- Sentry alerts (rules at https://sentry.io/organizations/vyne)
- /status page outage (manual or scripted incident)
- Vercel deployment failure (auto-routed via Vercel Slack integration)
- backup-verify GitHub Actions workflow failure → Sentry `backup-verify-failed` SEV2

## SEV1 runbook

When you become aware of a SEV1:

1. **Acknowledge** the page within 5 minutes. Reply with "ack" in the
   incident channel so others know it's being worked.
2. **Open a /status incident** within 30 minutes via the admin UI
   (or hand-edit the static incident list if the admin UI is itself
   down). Use the SEV1 template:
   > _Investigating an issue affecting [X]. We are working to
   > restore service. Next update by [now+30min]._
3. **Notify legal** (`legal@vyne.app`) if customer data may be
   affected — the 72h GDPR clock starts from "becoming aware".
4. **Mitigate, don't perfect.** Cut to a maintenance page if needed
   (`vercel env add NEXT_PUBLIC_MAINTENANCE production` → `true`,
   then redeploy). The goal is to stop bleeding; root-cause analysis
   comes after.
5. **Post updates every 30 minutes** until resolved.
6. **Mark resolved** on /status. Send an email summary to affected
   customers within 72h.
7. **Postmortem within 5 business days** using
   [docs/postmortems/template.md](../postmortems/template.md) (TBD).

## SEV2 runbook

1. Acknowledge within 15 minutes.
2. Open a /status incident within 60 minutes.
3. Mitigate within 24h.
4. Postmortem within 10 business days.

## SEV3+ runbook

Ticket-tracked; resolve in normal sprint cadence.

## Breach notification (GDPR Art. 33 + state laws)

If a Personal Data Breach is reasonably likely to result in risk to
data subjects&apos; rights and freedoms:

1. **72-hour clock** starts from when an operator becomes aware of
   the breach (not the customer-facing detection time, but the
   internal "we have enough signal to call it" time).
2. **Notify the supervisory authority** within 72h. For EU data
   subjects, that&apos;s the lead supervisory authority where you have
   your main establishment; absent EU establishment, notify the
   authority in the affected country. For California, CPPA. For UK,
   ICO.
3. **Notify affected data subjects** without undue delay if the
   breach is high risk.
4. **Document** the breach + the assessment in a "Personal Data
   Breach Register" entry (this repo, `docs/breaches/`), even if no
   notification is required.

What the notification must include:

- Nature of the breach + categories + approximate number of subjects
- Likely consequences
- Measures taken or proposed
- Name + contact of DPO or equivalent (`privacy@vyne.app`)

## Tooling

| Tool                     | Role                   | Setup                                                   |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| Sentry                   | Detection + paging     | Alert rules at https://sentry.io/organizations/vyne     |
| /status page             | Customer communication | Hand-curated for now; auto-incident creation backlogged |
| Vercel Deployment alerts | Build/deploy failure   | Auto-email to operator                                  |
| GitHub Actions           | backup-verify cron     | Sentry SEV2 on failure                                  |

## Quarterly tabletop

The on-call rotation runs a tabletop exercise every quarter. Each
exercise:

1. Pick a scenario from the catalog below (rotate; don&apos;t repeat
   within 12 months).
2. Walk through the response without touching production. Time each
   step.
3. Document gaps in the runbook.

**Scenario catalog:**

- **A**: An attacker exfiltrates a customer&apos;s deals via a stolen
  session cookie that wasn&apos;t flagged HttpOnly. (Test: cookie
  flags, audit-trail, breach notification timing.)
- **B**: Neon Postgres becomes unreachable for 90 minutes during
  peak traffic. (Test: PITR + failover; comms to customers.)
- **C**: Stripe webhook signature verification quietly fails for 6
  hours, mis-marking customers as past_due. (Test: detection cadence,
  dunning rollback, refunds.)
- **D**: A new deploy ships an SSRF in /api/ai/ingest-file allowing
  internal-network access. (Test: vulnerability triage, hot-patch
  process, post-incident audit log review.)

Latest run: [tabletop-2026-Q3.md](./tabletop-2026-Q3.md) (sample).

## Contact tree

| Role                     | Person        | Primary                    | Backup                                       |
| ------------------------ | ------------- | -------------------------- | -------------------------------------------- |
| On-call engineer         | Preet Raval   | preet@americancircuits.com | n/a (single operator)                        |
| Legal                    | (counsel TBD) | legal@vyne.app             | privacy@vyne.app                             |
| Comms / customer email   | Preet Raval   | hello@vyne.app             | n/a                                          |
| Stripe billing emergency | Preet Raval   | preet@americancircuits.com | Stripe support: dashboard.stripe.com/support |
