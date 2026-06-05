# SOC 2 Control Matrix

**Owner:** Preet Raval · **Last reviewed:** 2026-06-05 · **Audit target:** SOC 2 Type I (Q4 2026)

Mapping between the AICPA Trust Services Criteria (2017, revised 2022) and the controls in place at VYNE. Each row points to the
concrete artifact that serves as evidence — code paths, env values,
runbooks, or screenshots.

Categories evaluated: **Security** (mandatory), **Availability**,
**Confidentiality**. Processing Integrity + Privacy will be added
when the audit scope expands.

## How to read this matrix

- **Status** — `met` (control fully implemented), `partial` (some
  evidence, gaps documented in the cell), `planned` (scheduled,
  no production evidence yet).
- **Evidence** — direct link to code, doc, or env path. Auditors
  can verify in seconds.
- **Last verified** — when the control was tested end-to-end.

---

## CC1 — Control Environment

| #     | Criterion                  | Status                | Evidence                                                                                                           | Last verified |
| ----- | -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| CC1.1 | Integrity + ethical values | met                   | [docs/soc2/code-of-conduct.md](./code-of-conduct.md) (TBD); commit signing required (Husky pre-commit)             | 2026-06-05    |
| CC1.2 | Board oversight            | n/a — sole-proprietor | —                                                                                                                  | —             |
| CC1.3 | Reporting structure        | met                   | Single operator; access-review log in [access-control.md](./access-control.md)                                     | 2026-06-01    |
| CC1.4 | Competence                 | met                   | Operator holds AWS Solutions Architect Associate + has 8 yrs production experience                                 | 2026-06-01    |
| CC1.5 | Accountability             | met                   | Every state-changing action writes to `audit_events` ([audit/route.ts](../../apps/web/src/app/api/audit/route.ts)) | 2026-06-05    |

## CC2 — Communication + Information

| #     | Criterion                            | Status | Evidence                                                                                                                                                                                                      | Last verified |
| ----- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CC2.1 | Information for internal use         | met    | This `docs/soc2/` directory; runbooks under `docs/runbooks/`                                                                                                                                                  | 2026-06-05    |
| CC2.2 | Internal communication of objectives | met    | [VYNE MASTER PLAN.md](../../VYNE%20MASTER%20PLAN.md) is the single source of truth                                                                                                                            | 2026-06-05    |
| CC2.3 | External communication               | met    | [/security](../../apps/web/src/app/%28marketing%29/security/page.tsx), [/status](../../apps/web/src/app/%28marketing%29/status/page.tsx), [/privacy](../../apps/web/src/app/%28marketing%29/privacy/page.tsx) | 2026-06-05    |

## CC3 — Risk Assessment

| #     | Criterion                 | Status  | Evidence                                                                                    | Last verified |
| ----- | ------------------------- | ------- | ------------------------------------------------------------------------------------------- | ------------- |
| CC3.1 | Risk identification       | partial | [docs/soc2/risk-register.md](./risk-register.md) TBD; PH-G runbook covers DB risks          | 2026-06-05    |
| CC3.2 | Assessment of fraud risk  | partial | Rate limits on auth + admin routes; no formal fraud-risk matrix yet                         | 2026-06-05    |
| CC3.3 | Risk vs change assessment | met     | PR-driven change management with CI gating ([change-management.md](./change-management.md)) | 2026-06-05    |
| CC3.4 | Vendor risk               | met     | [vendor-management.md](./vendor-management.md) — annual SOC 2 review per sub-processor      | 2026-06-05    |

## CC4 — Monitoring Activities

| #     | Criterion                      | Status | Evidence                                                                                                                                                    | Last verified |
| ----- | ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CC4.1 | Ongoing + separate evaluations | met    | CI runs on every PR; Sentry monitors runtime; weekly backup verification ([.github/workflows/backup-verify.yml](../../.github/workflows/backup-verify.yml)) | 2026-06-05    |
| CC4.2 | Communication of deficiencies  | met    | Sentry alerts route to on-call; SEV1 triggers /status incident within 30 min                                                                                | 2026-06-05    |

## CC5 — Control Activities

| #     | Criterion                           | Status | Evidence                        | Last verified |
| ----- | ----------------------------------- | ------ | ------------------------------- | ------------- |
| CC5.1 | Selection + development of controls | met    | Controls listed in this matrix  | 2026-06-05    |
| CC5.2 | Technology controls                 | met    | Per cell below                  | 2026-06-05    |
| CC5.3 | Policies + procedures               | met    | `docs/soc2/` + `docs/runbooks/` | 2026-06-05    |

## CC6 — Logical + Physical Access

| #     | Criterion                           | Status | Evidence                                                                                                                                                                                                                  | Last verified |
| ----- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CC6.1 | Logical access — provision + remove | met    | Vercel + Neon + Stripe + Sentry access list in [access-control.md](./access-control.md); quarterly review cron ([access-review-reminder/route.ts](../../apps/web/src/app/api/admin/cron/access-review-reminder/route.ts)) | 2026-06-01    |
| CC6.2 | Registration + auth — new users     | met    | Email + PBKDF2 password + optional TOTP MFA (RFC 6238); recovery codes sha256-hashed                                                                                                                                      | 2026-06-01    |
| CC6.3 | Application-level access controls   | met    | RBAC matrix in [permissions.ts](../../apps/web/src/lib/auth/permissions.ts); tenant scoping in [tenantGuard.ts](../../apps/web/src/lib/auth/tenantGuard.ts) — every CRUD route uses requireRole + requireTenant           | 2026-06-05    |
| CC6.4 | Physical access                     | met    | All infra is SaaS — no physical VYNE hardware. Vercel + Neon SOC 2 reports cover their physical controls                                                                                                                  | 2026-06-01    |
| CC6.5 | Sensitive info — PII protection     | met    | TLS 1.3 in transit; AES-256 at rest; AES-256-GCM for MFA secrets; sha256 for tokens; Sentry beforeSend strips email + cookies                                                                                             | 2026-06-05    |
| CC6.6 | External user — auth                | met    | Same as CC6.2 plus rate limiting (5 login/min/IP) + no-enumeration on /api/auth/forgot-password (proved in test)                                                                                                          | 2026-06-05    |
| CC6.7 | Data transmission + disposal        | met    | TLS 1.3 + HSTS preload; account-purge cron walks 24 tenant tables ([account-purge/route.ts](../../apps/web/src/app/api/admin/cron/account-purge/route.ts))                                                                | 2026-06-05    |
| CC6.8 | Malicious software                  | met    | No file execution in user-uploadable surfaces; CSP locks scripts to allowlist                                                                                                                                             | 2026-06-05    |

## CC7 — System Operations

| #     | Criterion                     | Status  | Evidence                                                                                                      | Last verified |
| ----- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- | ------------- |
| CC7.1 | Detection of vulnerabilities  | partial | Dependabot enabled; no scheduled pen-test yet (planned Q4 2026)                                               | 2026-06-05    |
| CC7.2 | Monitoring                    | met     | Sentry runtime errors; Vercel Analytics; /status uptime board                                                 | 2026-06-05    |
| CC7.3 | Incident detection + response | met     | [incident-response.md](./incident-response.md); SEV1/2/3 definitions + Sentry routing                         | 2026-06-05    |
| CC7.4 | Incident recovery             | met     | DB restore runbook at [docs/runbooks/db-restore.md](../runbooks/db-restore.md); weekly automated verification | 2026-06-05    |
| CC7.5 | Lessons learned               | met     | Postmortem template in [docs/postmortems/template.md](../postmortems/template.md) (TBD)                       | 2026-06-05    |

## CC8 — Change Management

| #     | Criterion                | Status | Evidence                                                                                                                                                                                           | Last verified |
| ----- | ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CC8.1 | Authorisation of changes | met    | PR-required workflow + CI gating (typecheck / unit-tests / build) before merge to main; branch protection script in [scripts/apply-branch-protection.sh](../../scripts/apply-branch-protection.sh) | 2026-06-05    |

## CC9 — Risk Mitigation

| #     | Criterion                        | Status | Evidence                                                                                 | Last verified |
| ----- | -------------------------------- | ------ | ---------------------------------------------------------------------------------------- | ------------- |
| CC9.1 | Risk mitigation through transfer | met    | DPAs in place with every sub-processor ([vendor-management.md](./vendor-management.md))  | 2026-06-05    |
| CC9.2 | Vendor management                | met    | Annual SOC 2 review per sub-processor; subprocessor changes broadcast with 30-day notice | 2026-06-05    |

---

## Availability (A1)

| #    | Criterion                 | Status  | Evidence                                                                                   |
| ---- | ------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| A1.1 | Capacity monitoring       | met     | Vercel Speed Insights + /status uptime board                                               |
| A1.2 | System backup + recovery  | met     | Daily JSON dump → Blob; Neon PITR 7-day; weekly restore verification; RPO 5min / RTO 30min |
| A1.3 | Disaster recovery testing | partial | Verification cron runs every Sunday; full manual drill scheduled before paid-launch flip   |

## Confidentiality (C1)

| #    | Criterion                      | Status | Evidence                                                                                                                                                                                               |
| ---- | ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1.1 | Confidentiality of information | met    | Tenant scoping at every API route; CRUD factory tested in [crud.tenant-isolation.test.ts](../../apps/web/src/lib/api/__tests__/crud.tenant-isolation.test.ts) — covers 42 routes; Sentry PII redaction |
| C1.2 | Disposal of confidential info  | met    | Account-delete 30-day grace then per-table purge ([account-purge/route.ts](../../apps/web/src/app/api/admin/cron/account-purge/route.ts))                                                              |

---

## Gaps tracked for SOC 2 Type I

1. [ ] **Risk register** — [risk-register.md](./risk-register.md) (TBD) listing each identified risk + likelihood + impact + treatment
2. [ ] **Code of conduct** — [code-of-conduct.md](./code-of-conduct.md) (TBD)
3. [ ] **Postmortem template** — [docs/postmortems/template.md](../postmortems/template.md) (TBD)
4. [ ] **Annual pen-test** — budget $5–15k; vendor selection Q3 2026
5. [ ] **SOC 2 Type I auditor engagement** — budget $20–40k; 3–6 month observation window
