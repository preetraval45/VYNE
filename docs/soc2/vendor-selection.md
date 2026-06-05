# Pen-Test + SOC 2 Auditor — Vendor Selection Brief

**Owner:** Preet Raval · **Last reviewed:** 2026-06-05 · **Decision target:** before paid-launch flip (Q3 2026)

Two separate procurements that get conflated. They are NOT
interchangeable:

|                     | Pen-test                                      | SOC 2 Type 1 auditor                                                                                  |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Buying              | A timeboxed offensive security engagement     | A CPA firm to issue a formal SOC 2 attestation                                                        |
| Output              | Report with findings + severity + remediation | Audit report (Type 1: design as of a date; Type 2: design + operating effectiveness over 3–12 months) |
| Frequency           | Annual (sometimes pre-launch + annual)        | Annual (Type 1 once, then Type 2 ongoing)                                                             |
| Talks to            | Security firm                                 | CPA firm — must be AICPA-registered                                                                   |
| Budget              | $5k–$15k for VYNE's scope                     | $15k–$40k for Type 1; $25k–$60k for Type 2                                                            |
| Compliance platform | n/a                                           | Optional but recommended: Drata / Vanta / Secureframe ($7k–$20k/yr) automate evidence collection      |

---

## Pen-test — shortlist

### What to ask for

- **Scope**: public web app at vyne.vercel.app + the /api surface
  (~100 routes). NOT physical, NOT social-engineering, NOT mobile
  (no app yet).
- **Methodology**: OWASP ASVS L2 + OWASP API Top 10. Black-box
  with a test-account credential set we provision.
- **Style**: time-boxed (5–10 person-days) with manual probing,
  not pure scanner output.
- **Deliverable**: written report graded by CVSS v3.1, plus a
  one-week retest of remediated findings included in the engagement
  fee.
- **Disclosure**: 90-day responsible-disclosure window, no public
  reference customer until paid-launch (then case study OK).
- **Timing**: kick-off Q3 2026, report by Sept 30 2026.

### Vendors

| Vendor                    | Sweet spot             | Price band | Pros                                                                                                           | Cons                                                    |
| ------------------------- | ---------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Cobalt**                | SaaS app pen-tests     | $7k–$12k   | Pay-by-the-day pentester marketplace; portal makes retest + comms easy; SOC 2 auditors recognise their reports | The pool quality varies — ask for the named tester's CV |
| **HackerOne Pentest**     | Same lane              | $8k–$14k   | Brand recognition; well-known triage team; can convert into a bug-bounty if you want long-term coverage        | A bit pricier; longer kick-off (~3 weeks)               |
| **NetSPI**                | Enterprise-grade depth | $15k+      | Strong manual + tooling; great if a customer specifically demands a name they recognise                        | Above budget for first engagement                       |
| **Bishop Fox / Doyensec** | Boutique app-sec       | $12k–$25k  | Highest manual depth; senior researchers only                                                                  | Too expensive for a first engagement                    |
| **Bugcrowd Pen-Test**     | Mid-market             | $7k–$13k   | Similar to Cobalt; portal + retest workflow                                                                    | Less common among SaaS startups                         |

**Recommendation**: **Cobalt** for the first engagement.
Five-person-day "Light Pentest" (\$~7k) covers OWASP ASVS L2 on the
web app + API and includes a 30-day retest. They have a SOC 2
report you can cite as a sub-processor too.

### RFP-ready email template

```
Subject: Pen-test RFP — VYNE, AI-native Company OS (B2B SaaS)

Hi Cobalt team,

We're VYNE (https://vyne.vercel.app), a B2B SaaS Company OS
approaching paid launch. Looking to commission a 5–10 person-day
black-box web + API pen-test before flipping paid plans on.

Scope:
- Public web app at vyne.vercel.app
- ~100 REST routes under /api (full inventory available)
- Auth (email/password + TOTP MFA)
- Stripe-backed billing surface
- Multi-tenant data scoping (orgId-per-row)
- AI features routing through Anthropic API

Out of scope: physical, social-engineering, mobile (no app).

Methodology: OWASP ASVS L2 + OWASP API Security Top 10. Manual
probing preferred over scanner-only.

Timeline: kick-off in Q3 2026, report by Sept 30 2026.

Deliverable: written report graded by CVSS v3.1, plus a
post-remediation retest within 30 days of the initial report.

Disclosure: 90-day responsible disclosure; we'll patch
high-severity findings within 30 days.

Can you send your engagement options, lead time, and a CV of
the tester(s) you'd assign? Happy to set up a 30-min scoping
call.

Thanks,
Preet Raval
preet@americancircuits.com
```

---

## SOC 2 Type 1 — shortlist

### Compliance automation platform (optional but strongly recommended)

These platforms collect evidence continuously (Vercel access logs,
Neon backup confirmations, CI run history, MFA reports) and present
it to the auditor. Without one, you're hand-collecting screenshots

- CSVs every quarter. Pick one BEFORE engaging the auditor.

| Platform                     | Price band   | Pros                                                                                             | Cons                                              |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Drata**                    | $10k–$20k/yr | Best integrations (Vercel + GitHub + Stripe + Sentry); fastest ramp; auditor partnership network | Pricier                                           |
| **Vanta**                    | $8k–$15k/yr  | Most-recognised name; good Slack-bot ergonomics; broad auditor list                              | Some integrations are slightly thinner than Drata |
| **Secureframe**              | $7k–$15k/yr  | Cheaper end of the spectrum; growing fast                                                        | Auditor network smaller                           |
| **Tugboat Logic** (OneTrust) | $5k–$15k/yr  | Cheapest; can DIY without auditor                                                                | Less polished, more manual                        |

**Recommendation**: **Drata** for a single operator. Their Vercel +
GitHub + Stripe + Sentry integrations are deep, and they bundle an
auditor-introduction call as part of onboarding. Ramp ~4–6 weeks.

### Auditor (CPA firm)

The auditor must be AICPA-registered + experienced with SaaS. Most
compliance platforms will introduce you to 2–3 partner firms.

| Firm                                   | Type 1 price | Pros                                                          | Cons                               |
| -------------------------------------- | ------------ | ------------------------------------------------------------- | ---------------------------------- |
| **Insight Assurance**                  | $15k–$22k    | Drata + Vanta partner; SaaS-native; fast for first engagement | Sometimes booked out 6+ weeks      |
| **A-LIGN**                             | $20k–$35k    | Big-name; broad practice; good for enterprise deals           | Pricier; slower kick-off           |
| **Schellman**                          | $25k–$40k    | Premium brand; carries weight with enterprise procurement     | Premium price                      |
| **Sensiba San Filippo / Linford & Co** | $15k–$25k    | Niche SaaS auditors; great for first-timers                   | Less brand recognition than A-LIGN |
| **Prescient Assurance**                | $12k–$20k    | Cheapest tier of the SaaS-native firms                        | Less customer-facing brand value   |

**Recommendation**: **Insight Assurance** via Drata. Best price-to-
brand ratio for a first SOC 2; their report is recognised by all
the enterprise procurement portals.

### Sequencing

1. **Week 1–2**: subscribe to Drata, connect every integration
   (Vercel, GitHub, AWS-equivalent for Neon, Stripe, Sentry, Resend,
   Upstash, Anthropic). Drata's gap-analysis report comes out at
   the end of week 2.
2. **Week 3–4**: close the gaps Drata identifies. The engineering
   in PH-G + PH-H + PH-I closes ~70% — what's left is usually
   policies (HR-onboarding policy, BYOD policy, vendor-management
   policy, code-of-conduct).
3. **Week 5–6**: kick off the auditor engagement. Type 1 typically
   completes in 4–6 weeks from kick-off.
4. **Total**: report in hand by Q4 2026 if you start Drata in July.

### RFP-ready email template (auditor)

```
Subject: SOC 2 Type 1 audit — VYNE (B2B SaaS, single-operator, ~6mo old)

Hi Insight Assurance team,

Drata referred you for a SOC 2 Type 1 audit of VYNE
(https://vyne.vercel.app), a B2B SaaS Company OS.

Background:
- Single-operator startup, paid launch flipping in Q3 2026
- Production stack: Vercel + Neon Postgres + Stripe + Sentry +
  Resend + Anthropic + Upstash
- Multi-tenant by design; tenant scoping enforced at every API
  route + unit-tested
- Compliance posture documented at vyne.vercel.app/security
- Drata is wired up; gap analysis complete

Audit scope:
- Trust Services Criteria: Security (mandatory) + Availability +
  Confidentiality. Processing Integrity + Privacy out of scope for
  Type 1.
- Audit period: as-of a single date (Type 1)

Deliverable: SOC 2 Type 1 report we can share with prospects under
NDA.

Can you send your Type 1 SOW + lead time? Looking to kick off in
August 2026 with report by end of Q4 2026.

Thanks,
Preet Raval
preet@americancircuits.com
```

---

## Procurement checklist

- [ ] **Pen-test**: email Cobalt this week → kick off in Q3 2026
- [ ] Decide on a compliance platform (Drata recommended) → subscribe by end of Q3 2026
- [ ] **Auditor**: email Insight Assurance via Drata referral → kick off in Q4 2026
- [ ] Budget $7k (pen-test) + $12k (Drata first year) + $18k (Insight Type 1) = **~$37k**
- [ ] Tag each invoice under cost-centre "compliance" for SaaS-line-item visibility
- [ ] After Type 1 issued: add the report to the trust-portal / DPA
      attachments at /security
