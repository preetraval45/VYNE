# Access Control

**Owner:** Preet Raval · **Last reviewed:** 2026-06-01 · **Review cadence:** quarterly (reminder cron)

This document is the source of truth for who has access to what
production system. The quarterly access-review cron
([apps/web/src/app/api/admin/cron/access-review-reminder/route.ts](../../apps/web/src/app/api/admin/cron/access-review-reminder/route.ts))
fires on the first day of each quarter with a checklist linking
back here.

## Access principles

1. **Principle of least privilege.** Every operator gets only the
   role they need for the task. Owner-level access is restricted to
   the founder.
2. **MFA mandatory** on every external system (Vercel, Neon, Stripe,
   Sentry, GitHub, Resend, Upstash). Hardware-key preferred on the
   founder account.
3. **Reviewed quarterly.** Each review answers: who has access,
   why, is it still needed, when was their last login.
4. **Removal within 24 hours** of role change or contract end.

## Current access list

### Production systems

| System                          | Operator                   | Role  | MFA                 | Added      | Justification         |
| ------------------------------- | -------------------------- | ----- | ------------------- | ---------- | --------------------- |
| Vercel project (`vyne`)         | preet@americancircuits.com | Owner | TOTP + hardware key | 2025-12-01 | Sole operator         |
| Neon project                    | preet@americancircuits.com | Admin | TOTP                | 2025-12-15 | DB schema + restores  |
| Stripe account                  | preet@americancircuits.com | Owner | TOTP                | 2026-01-10 | Billing + dunning     |
| Sentry org (`vyne`)             | preet@americancircuits.com | Owner | TOTP                | 2025-12-20 | Error monitoring      |
| GitHub repo (`preetraval/VYNE`) | preet@americancircuits.com | Admin | TOTP                | 2025-11-15 | Code                  |
| Resend account                  | preet@americancircuits.com | Owner | TOTP                | 2026-02-01 | Transactional email   |
| Upstash account                 | preet@americancircuits.com | Owner | TOTP                | 2026-02-10 | Redis (rate limiting) |
| Anthropic console               | preet@americancircuits.com | Owner | TOTP                | 2026-03-01 | Claude API keys       |
| Domain registrar (Cloudflare)   | preet@americancircuits.com | Owner | TOTP + hardware key | 2025-11-01 | DNS + apex domain     |

### In-app roles

VYNE itself has 5 workspace roles (RBAC matrix in
[lib/auth/permissions.ts](../../apps/web/src/lib/auth/permissions.ts)):

| Role    | Read | Write (own org) | Admin (settings, billing) | Delete | Audit log |
| ------- | ---- | --------------- | ------------------------- | ------ | --------- |
| owner   | ✅   | ✅              | ✅                        | ✅     | ✅        |
| admin   | ✅   | ✅              | ✅                        | ✅     | ✅        |
| manager | ✅   | ✅              | ❌                        | ❌     | ✅        |
| member  | ✅   | ✅              | ❌                        | ❌     | ❌        |
| guest   | ✅   | ❌              | ❌                        | ❌     | ❌        |

## Onboarding checklist (new operator)

1. [ ] Create account on each system (Vercel, Neon, Stripe, Sentry, GitHub, Resend, Upstash)
2. [ ] Enable MFA on every account before granting any role
3. [ ] Assign the minimum role needed for the task
4. [ ] Add to this document with date + justification
5. [ ] Share the on-call rotation + incident-response runbook
6. [ ] Confirm successful login on each system

## Offboarding checklist (operator leaving)

1. [ ] Revoke role on every system within 24h
2. [ ] Rotate any shared API keys the operator had access to (Anthropic, Stripe, Resend)
3. [ ] Force-logout active sessions (Vercel + GitHub support this; for our app, expire the operator's `vyne-token` cookie)
4. [ ] Audit access logs for the prior 30 days for anomalies
5. [ ] Remove entry from this document with date + reason
6. [ ] Document in the access-review log below

## Access review log

| Date       | Reviewer                   | Findings                                                  | Actions                                    |
| ---------- | -------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| 2026-06-01 | preet@americancircuits.com | All operators current; no contractor changes this quarter | None — single operator                     |
| 2026-03-01 | preet@americancircuits.com | Removed legacy AWS account access                         | Closed AWS account; consolidated on Vercel |

## API key rotation

| Key                                                 | Last rotated | Cadence                 | Stored in               |
| --------------------------------------------------- | ------------ | ----------------------- | ----------------------- |
| `AUTH_TOKEN_SECRET` (session signer)                | 2025-12-01   | annual                  | Vercel env (Production) |
| `MFA_ENCRYPTION_KEY` (AES-256-GCM for MFA secrets)  | 2025-12-15   | annual                  | Vercel env (Production) |
| `STRIPE_SECRET_KEY`                                 | 2026-01-10   | annual or on compromise | Vercel env              |
| `STRIPE_WEBHOOK_SECRET`                             | 2026-01-10   | annual                  | Vercel env              |
| `RESEND_API_KEY`                                    | 2026-02-01   | annual                  | Vercel env              |
| `SENTRY_DSN` (read-only ingest token, not a secret) | 2025-12-20   | n/a                     | Public env              |
| `ANTHROPIC_API_KEY`                                 | 2026-03-01   | quarterly               | Vercel env              |
| `CRON_SECRET`                                       | 2026-04-01   | annual                  | Vercel env              |
| `BACKUP_BLOB_TOKEN`                                 | 2026-04-15   | annual                  | Vercel env              |
| `UPSTASH_REDIS_REST_TOKEN`                          | 2026-02-10   | annual                  | Vercel env              |

Rotation policy: on compromise (immediate), annually for everything,
quarterly for AI-provider keys (the only ones billed per-token).

## MFA enforcement

VYNE-side MFA is opt-in for workspace members via Settings → Security
([MfaPanel.tsx](../../apps/web/src/components/settings/MfaPanel.tsx)).
Enterprise SSO + SCIM is on the PH-I+ roadmap for enforcement at the
org level. For SOC 2 Type I we satisfy CC6.2 via the available TOTP
factor + per-operator hardware key on external systems.
