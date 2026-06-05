# Vendor / Sub-processor Management

**Owner:** Preet Raval · **Last reviewed:** 2026-06-05 · **Review cadence:** annual or on subprocessor change

Every external vendor that processes VYNE customer data is listed
here. The same list appears on the public [Privacy
page](../../apps/web/src/app/%28marketing%29/privacy/page.tsx) →
"Subprocessors" so customers can audit the chain.

## Vendor risk classification

| Tier        | Definition                                    | Review cadence                               |
| ----------- | --------------------------------------------- | -------------------------------------------- |
| Critical    | Stores or processes customer PII; loss = SEV1 | Annual SOC 2 review + quarterly status check |
| Important   | Operational dependency; outage = SEV2         | Annual contract review                       |
| Convenience | Easily swappable; no PII exposure             | Ad hoc                                       |

## Active sub-processors

| Vendor                       | Service                                 | Tier        | Region                   | SOC 2 Report                      | DPA executed                                            | Next review |
| ---------------------------- | --------------------------------------- | ----------- | ------------------------ | --------------------------------- | ------------------------------------------------------- | ----------- |
| Vercel Inc.                  | Hosting + Edge functions + Blob storage | Critical    | iad1 (US-East, Virginia) | Type 2 — annual                   | Yes — 2026-01-15                                        | 2027-01-15  |
| Neon Tech                    | PostgreSQL primary database             | Critical    | us-east-2 (Ohio)         | Type 2 — annual                   | Yes — 2025-12-15                                        | 2026-12-15  |
| Stripe Inc.                  | Payment processing + billing            | Critical    | Global                   | Type 2 — annual; PCI DSS Level 1  | Yes — 2026-01-10                                        | 2027-01-10  |
| Resend                       | Transactional email                     | Important   | us-east-1                | SOC 2 Type 1 (Type 2 in progress) | Yes — 2026-02-01                                        | 2027-02-01  |
| Sentry (Functional Software) | Error monitoring                        | Important   | us-east-1                | Type 2 — annual                   | Yes — 2025-12-20                                        | 2026-12-20  |
| Anthropic                    | Claude API (AI features)                | Important   | us-east-1                | Type 2 — annual; ISO 27001        | Yes — 2026-03-01; zero-retention SLA on enterprise tier | 2027-03-01  |
| Upstash                      | Redis (rate limiting)                   | Important   | us-east-1                | Type 2 — annual                   | Yes — 2026-02-10                                        | 2027-02-10  |
| Cloudflare                   | DNS + apex domain                       | Convenience | Global                   | Type 2 — annual                   | n/a (DNS only)                                          | 2027-11-01  |

## Onboarding a new sub-processor

1. [ ] Confirm the vendor has a SOC 2 Type 2 report (preferred) OR equivalent (ISO 27001 + on-the-record commitment to SOC 2)
2. [ ] Execute their DPA (or have ours counter-signed); file the executed PDF in `docs/legal/dpa-executed/<vendor>-<date>.pdf`
3. [ ] Read their security questionnaire / TPRM artefact; flag any findings to the operator
4. [ ] Add to this table + to the public Privacy page sub-processor list
5. [ ] Announce to existing customers with 30 days&apos; notice via email
6. [ ] Add their status page to the on-call watch list
7. [ ] Verify their data-residency setting matches the region in this table

## Off-boarding a sub-processor

1. [ ] Migrate the workload to the replacement vendor
2. [ ] Request data deletion from the off-boarded vendor (DPA Art. 10)
3. [ ] Retain deletion confirmation in `docs/legal/dpa-executed/<vendor>-deletion-<date>.pdf`
4. [ ] Remove from this table + the public Privacy page
5. [ ] Note in the change log below

## Annual review checklist

For each sub-processor each year:

- [ ] Pull the latest SOC 2 report from their trust portal
- [ ] Confirm no Type 2 exceptions affecting controls we rely on
- [ ] Confirm the DPA is current (not auto-expired)
- [ ] Confirm contact info on file is current
- [ ] Confirm pricing tier is still cost-effective
- [ ] Update the "Next review" date in the table above

## Change log

| Date       | Change                                                           | By          |
| ---------- | ---------------------------------------------------------------- | ----------- |
| 2026-06-05 | First documented version of this register                        | Preet Raval |
| 2026-04-15 | Added BACKUP_BLOB_TOKEN; Vercel Blob became active sub-processor | Preet Raval |
| 2026-03-01 | Onboarded Anthropic; replaced placeholder AWS Bedrock plan       | Preet Raval |
| 2026-02-10 | Onboarded Upstash for rate-limit Redis                           | Preet Raval |
| 2026-02-01 | Onboarded Resend for transactional email                         | Preet Raval |
| 2026-01-10 | Onboarded Stripe Billing for paid plans                          | Preet Raval |
| 2025-12-20 | Onboarded Sentry for error monitoring                            | Preet Raval |
| 2025-12-15 | Onboarded Neon Postgres for primary DB                           | Preet Raval |
| 2025-12-01 | Onboarded Vercel as hosting + deploy platform                    | Preet Raval |
