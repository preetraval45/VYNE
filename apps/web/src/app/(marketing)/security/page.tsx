import Link from "next/link";
import { LegalPage, Section, Table } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Security — VYNE",
  description:
    "Encryption, backups, vulnerability reporting, and the security posture behind VYNE.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      subtitle="An honest, current view of how VYNE is built + operated. We update this page when our posture changes; nothing here is aspirational."
      lastUpdated="June 5, 2026"
    >
      <Section heading="Encryption">
        <Table
          headers={["Layer", "Algorithm", "Detail"]}
          rows={[
            [
              "In transit",
              "TLS 1.3",
              "HSTS with max-age 2 yrs + includeSubDomains + preload. Enforced by Vercel edge.",
            ],
            [
              "At rest (DB)",
              "AES-256",
              "Neon Postgres — full-disk encryption + per-branch isolation.",
            ],
            ["At rest (Blob)", "AES-256", "Vercel Blob — backups + uploads."],
            [
              "Application (MFA secrets)",
              "AES-256-GCM",
              "Per-row encryption with MFA_ENCRYPTION_KEY env. Fresh IV per call.",
            ],
            [
              "Password hashing",
              "PBKDF2-SHA256",
              "Per-user salt + 100k iterations.",
            ],
            [
              "Password-reset tokens",
              "SHA-256",
              "Raw token never stored; only the hash. 1-hour TTL, single-use.",
            ],
          ]}
        />
      </Section>

      <Section heading="Tenancy + access control">
        Every Postgres row carries an orgId. Every API route is gated through{" "}
        <code>requireTenant()</code> which resolves the caller&apos;s session
        orgId from the HMAC-signed session cookie. Reads + writes filter on that
        orgId; cross-tenant probes return 404, never 403 (so we don&apos;t leak
        existence). The factory that serves 42 CRUD routes is unit-tested in{" "}
        <code>src/lib/api/__tests__/crud.tenant-isolation.test.ts</code>
        for: GET filters on orgId; POST stamps caller&apos;s orgId;
        body-provided orgId can never override; PATCH/DELETE on cross-tenant
        rows return 404 and never call .update / .delete.
      </Section>

      <Section heading="Authentication">
        Email + password (PBKDF2). Optional TOTP-based MFA (RFC 6238) with 10
        single-use recovery codes (sha256-hashed). Sessions are HttpOnly,
        Secure, SameSite=Strict cookies signed with HMAC. Password-reset flow
        uses a 1-hour single-use token; reset endpoint enforces rate limiting +
        no-enumeration (same response for valid + invalid emails).
      </Section>

      <Section heading="Rate limiting + abuse">
        Per-IP + per-route limits via Upstash Redis. Fail-open on Upstash outage
        to avoid taking down legitimate traffic; abusive behaviour during outage
        is still bounded by Vercel-edge global limits. /api/auth/login: 5 req /
        minute / IP. /api/account/delete: 3 req / hour / IP. /api/admin/backup +
        /restore: 6 req / minute / IP.
      </Section>

      <Section heading="Audit trail">
        Every state-changing action writes to <code>audit_events</code>: actor,
        target, action, ip, userAgent, severity, optional diff. Daily admin-only
        export endpoint with sha256-checksum manifest for tamper-evidence (in
        progress for SOC2 prep). Retention: 2 years; anonymised after 90 days
        post account-deletion.
      </Section>

      <Section heading="Backups + disaster recovery">
        Daily JSON dump at 06:00 UTC via Vercel Cron → Vercel Blob (when{" "}
        <code>BACKUP_BLOB_TOKEN</code> set). Weekly automated
        restore-verification at 04:00 UTC Sunday: pulls latest dump, dry-runs
        through /api/admin/restore, alerts Sentry on failure (SEV2). Neon
        point-in-time recovery: 7-day WAL window. Full DR runbook (3 scenarios
        incl. cross-region failover) at <code>docs/runbooks/db-restore.md</code>
        . Public DR metrics on <Link href="/status">/status</Link>. Targets:{" "}
        <strong>RPO 5 min</strong>, <strong>RTO 30 min</strong>.
      </Section>

      <Section heading="Application security">
        <Table
          headers={["Control", "How"]}
          rows={[
            [
              "Strict Content-Security-Policy",
              "Set on every response via vercel.json; allowlist for Stripe, Anthropic, Groq, LiveKit only.",
            ],
            ["HSTS preload", "Submitted to hstspreload.org; 2-year max-age."],
            [
              "Frame-deny + XSS protection",
              "X-Frame-Options: DENY; X-Content-Type-Options: nosniff.",
            ],
            [
              "CSRF",
              "Double-submit token on every state-changing fetch via csrfFetch().",
            ],
            [
              "Permissions-Policy",
              "Camera/microphone/screen-capture self-only; no geolocation.",
            ],
            [
              "Static + dep scanning",
              "ESLint + tsc --noEmit gated in CI; vitest unit + integration coverage.",
            ],
            [
              "Sentry PII redaction",
              "beforeSend strips Authorization headers, cookies, email-shaped strings before send.",
            ],
          ]}
        />
      </Section>

      <Section heading="Supply chain">
        Dependencies pinned by pnpm lockfile; Dependabot enabled for npm +
        GitHub Actions. Production builds use <code>--frozen-lockfile</code>{" "}
        equivalent on Vercel. We pull <code>@vercel/blob</code>,{" "}
        <code>stripe</code>, <code>@sentry/nextjs</code> from npm direct.
      </Section>

      <Section heading="Compliance + certifications">
        <ul style={{ marginTop: 12, paddingLeft: 22 }}>
          <li>
            <strong>GDPR + UK GDPR</strong> — SCCs + UK IDTA executed; DSAR
            endpoints live (<Link href="/privacy">Privacy</Link> §Your rights).
          </li>
          <li>
            <strong>CCPA / CPRA</strong> — &quot;Do not sell or share&quot;
            honoured by design (we don&apos;t).
          </li>
          <li>
            <strong>SOC 2 Type I</strong> — preparation in progress (PH-I); ETA
            Q4 2026.
          </li>
          <li>
            <strong>HIPAA / FedRAMP</strong> — not currently supported; roadmap
            dependent on enterprise demand.
          </li>
        </ul>
      </Section>

      <Section heading="Vulnerability reporting">
        Report security issues to{" "}
        <a href="mailto:security@vyne.app">security@vyne.app</a>. We aim to
        acknowledge within 24 hours, triage within 3 business days, and patch
        high-severity findings within 30 days. Please give us a reasonable
        window before public disclosure — typically 90 days. We do not currently
        run a paid bug-bounty program but will publicly credit responsible
        reporters with their consent.
      </Section>

      <Section heading="Incident response">
        SEV1 (data exposure or full outage) escalation: page on-call, post a
        /status incident within 30 minutes, customer notification within 72
        hours per GDPR Art. 33. SEV2 (partial outage, automated alert): Sentry →
        engineering chat → mitigated same-day. The full runbook lives in{" "}
        <code>docs/runbooks/</code>.
      </Section>
    </LegalPage>
  );
}
