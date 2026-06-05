import Link from "next/link";
import { LegalPage, Section, Table } from "@/components/legal/LegalPage";

// PH-H — Production privacy policy. Built from the actual data
// collection in prisma/schema.prisma + the live subprocessor list
// (Vercel, Neon, Resend, Stripe, Sentry, Anthropic). When fields are
// added to schema.prisma, mirror them in the "What we collect" table.

export const metadata = {
  title: "Privacy Policy — VYNE",
  description:
    "How VYNE collects, uses, and protects your data — full inventory, processors, and your GDPR/CCPA rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="VYNE is built by American Circuits Inc. (Charlotte, NC, USA). This page tells you exactly what we collect, why, who we share it with, how long we keep it, and how to take it back."
      lastUpdated="June 5, 2026"
    >
      <Section heading="Who we are (data controller)">
        American Circuits Inc., DBA VYNE, 9100 Crump Rd, Charlotte, NC 28273,
        USA. For EU data subjects, we currently operate without an EU
        representative; complaints can be filed directly with the Information
        Commissioner&apos;s Office (UK) or your national supervisory authority.
        Contact for all privacy matters:{" "}
        <a href="mailto:privacy@vyne.app">privacy@vyne.app</a>.
      </Section>

      <Section heading="What we collect — full inventory">
        Every Postgres table in VYNE that holds personal data is listed below,
        with the lawful basis under GDPR Art. 6 and how long we retain it after
        you stop using us. Schema source of truth:{" "}
        <code>apps/web/prisma/schema.prisma</code>.
        <Table
          headers={[
            "Table",
            "Personal data fields",
            "Purpose",
            "Lawful basis (Art. 6)",
            "Retention",
          ]}
          rows={[
            [
              "users",
              "email, name, companyName, passwordHash, mfaSecret (encrypted)",
              "Account + authentication + tenant scoping",
              "Contract — necessary to provide the Service",
              "Account lifetime; 30-day grace, then hard delete",
            ],
            [
              "subscriptions",
              "stripeCustomerId, stripeSubscriptionId, plan, status",
              "Billing — mirror of Stripe for in-app rendering",
              "Contract + legal obligation (tax records)",
              "Subscription lifetime + 7 yrs (US tax retention)",
            ],
            [
              "password_reset_tokens",
              "userId, sha256(token), expiresAt, usedAt",
              "Password-reset flow (one-time)",
              "Contract",
              "1 hour from issue, hard-deleted thereafter",
            ],
            [
              "contacts / accounts / customers / sales_customers",
              "Names, emails, phone numbers, addresses you import",
              "CRM functionality (the data is yours — you control it)",
              "Contract — you choose what to upload",
              "Workspace lifetime; deleted with workspace",
            ],
            [
              "deals / sales_opportunities / sales_quotes / sales_orders / invoices / orders",
              "Customer names, totals, line items, your notes",
              "Sales pipeline + ERP",
              "Contract",
              "Workspace lifetime",
            ],
            [
              "expenses / employees / leave_requests / journal_entries",
              "Reimbursee names, salary, leave balances, posting entries",
              "HR + Finance modules",
              "Contract + legal obligation (employment records)",
              "Workspace lifetime + 7 yrs after deletion (US payroll retention)",
            ],
            [
              "embeddings",
              "Vector representations of your messages, docs, files",
              "Search + AI retrieval (RAG)",
              "Contract",
              "Workspace lifetime; deleted with workspace",
            ],
            [
              "push_subscriptions",
              "Browser push endpoint URL + p256dh / auth keys",
              "Web push notifications you opted into",
              "Consent — revocable from Settings",
              "Until you unsubscribe or 90d of inactivity",
            ],
            [
              "audit_events",
              "actorId, actorName, action, ip, userAgent",
              "Security audit trail (SOC2 / breach forensics)",
              "Legitimate interest (security)",
              "2 years; anonymised after 90 days post-deletion",
            ],
            [
              "consents",
              "userId, category, granted, ip, userAgent, source",
              "Proof of cookie/marketing consent (Art. 7)",
              "Legal obligation (consent record)",
              "5 years after consent withdrawn (audit evidence)",
            ],
            [
              "account_deletions",
              "userId, orgId, email, requestedAt, scheduledFor",
              "Grace-period queue for the 30d undo window",
              "Legitimate interest (deletion auditability)",
              "Deletion record kept indefinitely for audit",
            ],
          ]}
        />
      </Section>

      <Section heading="What we DO NOT collect">
        Browsing history outside VYNE. Location data. Biometric data. Health
        data. Children&apos;s data (the Service is not intended for users under
        16, see <Link href="/terms">Terms §1</Link>). Third-party cookies for
        advertising. Cross-site tracking pixels. We do not buy, sell, or rent
        personal data.
      </Section>

      <Section heading="Subprocessors">
        We use the following processors to deliver VYNE. Each is bound by a Data
        Processing Agreement that mirrors the obligations we owe you.
        <Table
          headers={["Subprocessor", "Purpose", "Region", "DPA / Cert"]}
          rows={[
            [
              "Vercel Inc. (USA)",
              "Web hosting + Edge functions + Blob storage",
              "iad1 (US-East, Virginia)",
              <a key="v" href="https://vercel.com/legal/dpa">
                DPA
              </a>,
            ],
            [
              "Neon Tech (USA)",
              "PostgreSQL primary database",
              "us-east-2 (Ohio)",
              <a key="n" href="https://neon.tech/dpa">
                DPA
              </a>,
            ],
            [
              "Stripe Inc. (USA)",
              "Payment processing + billing",
              "Global",
              <a key="s" href="https://stripe.com/legal/dpa">
                DPA
              </a>,
            ],
            [
              "Resend (USA)",
              "Transactional email (signup, password reset, invoices)",
              "us-east-1",
              <a key="r" href="https://resend.com/legal/dpa">
                DPA
              </a>,
            ],
            [
              "Sentry (USA)",
              "Error monitoring (PII redacted via beforeSend)",
              "us-east-1",
              <a key="se" href="https://sentry.io/legal/dpa/">
                DPA
              </a>,
            ],
            [
              "Anthropic (USA)",
              "Claude API — AI features (prompts not used for training per zero-retention SLA on enterprise tier)",
              "us-east-1",
              <a key="a" href="https://www.anthropic.com/legal/dpa">
                DPA
              </a>,
            ],
            [
              "Upstash (USA)",
              "Redis — rate limiting + ephemeral session storage",
              "us-east-1",
              <a key="u" href="https://upstash.com/trust/dpa">
                DPA
              </a>,
            ],
          ]}
        />
        We publish changes to this list at least 30 days before a new
        subprocessor goes live (subscribe via{" "}
        <a href="mailto:privacy@vyne.app?subject=Subprocessor%20updates">
          privacy@vyne.app
        </a>
        ).
      </Section>

      <Section heading="International transfers">
        VYNE is hosted in the United States. Where personal data of EU/UK data
        subjects is processed, transfers rely on the European Commission&apos;s
        Standard Contractual Clauses (Module 2: controller → processor; Module
        3: processor → sub-processor). The relevant clauses are embedded in our{" "}
        <Link href="/dpa">Data Processing Agreement</Link>. For UK data subjects
        we additionally rely on the UK International Data Transfer Addendum.
      </Section>

      <Section heading="Your rights (GDPR Art. 15–22 + CCPA)">
        You have the following rights, exercisable at any time + free of charge
        once per 12-month period:
        <ul style={{ marginTop: 12, marginBottom: 12, paddingLeft: 22 }}>
          <li>
            <strong>Access</strong> — request a copy of your data via{" "}
            <code>POST /api/gdpr/export</code> in-app or by email.
          </li>
          <li>
            <strong>Rectification</strong> — correct any field directly in
            Settings, or email{" "}
            <a href="mailto:privacy@vyne.app">privacy@vyne.app</a>.
          </li>
          <li>
            <strong>Erasure (&quot;right to be forgotten&quot;)</strong> —
            Settings → Danger Zone → Delete account schedules a hard delete in
            30 days (you can cancel during the grace period). Backed by{" "}
            <code>POST /api/account/delete</code>.
          </li>
          <li>
            <strong>Portability</strong> — your data is exportable as JSON via{" "}
            <code>POST /api/gdpr/export</code>; the file is standard JSON,
            suitable for import into any compatible tool.
          </li>
          <li>
            <strong>Restriction / Objection</strong> — pause processing of
            specific categories (e.g. AI features) via Settings → AI
            preferences.
          </li>
          <li>
            <strong>Withdraw consent</strong> — cookie banner → Manage
            preferences (link in footer), or revoke push notifications from
            Settings.
          </li>
          <li>
            <strong>Lodge a complaint</strong> — with your supervisory authority
            (ICO, CNIL, etc.) or in California, the CPPA.
          </li>
        </ul>
        Requests are answered within 30 days; complex requests within 60 days
        with notice.
      </Section>

      <Section heading="Security">
        See <Link href="/security">/security</Link> for the full posture
        (encryption at rest + in transit, backup cadence, RPO/RTO, vuln
        reporting). Short version: AES-256 at rest, TLS 1.3 in transit,
        per-tenant orgId scoping enforced at every API route, MFA available,
        daily backups + weekly restore verification.
      </Section>

      <Section heading="Children">
        VYNE is not intended for users under 16. We do not knowingly collect
        personal data from children. If you believe a child has provided us
        data, email <a href="mailto:privacy@vyne.app">privacy@vyne.app</a> and
        we will delete it within 14 days.
      </Section>

      <Section heading="Breach notification">
        If a personal-data breach is reasonably likely to result in risk to your
        rights and freedoms, we will notify you within 72 hours of becoming
        aware. Our supervisory-authority notification timeline is the same 72
        hours per GDPR Art. 33. Status updates are posted at{" "}
        <Link href="/status">/status</Link>.
      </Section>

      <Section heading="Changes to this policy">
        Material changes are announced by email at least 14 days before taking
        effect, with a versioned diff archived at{" "}
        <code>docs/legal/changelog.md</code>. Continued use after the effective
        date is acceptance.
      </Section>

      <Section heading="Contact">
        <a href="mailto:privacy@vyne.app">privacy@vyne.app</a> for all privacy +
        DSAR matters. <a href="mailto:security@vyne.app">security@vyne.app</a>{" "}
        for vulnerability reports.
      </Section>
    </LegalPage>
  );
}
