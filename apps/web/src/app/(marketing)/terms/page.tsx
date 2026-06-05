import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Service — VYNE",
  description:
    "The terms under which you may use VYNE — honest SLA, liability cap, termination + data export.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle={`These Terms of Service ("Terms") govern your use of VYNE. By creating an account or using the Service you agree to be bound by them. If you don't agree, don't use VYNE.`}
      lastUpdated="June 5, 2026"
    >
      <Section heading="1. Eligibility + account">
        You must be at least 18 years old + legally able to enter a contract.
        You are responsible for safeguarding your credentials (we recommend MFA;
        available in Settings). One account per person; you may not share login
        credentials. We may suspend an account that shows signs of credential
        sharing or automated abuse with notice.
      </Section>

      <Section heading="2. Your content + license to operate">
        You retain ownership of everything you upload, write, or generate inside
        VYNE (&quot;Content&quot;). You grant VYNE a worldwide, non-exclusive,
        royalty-free license to host, process, transmit, display, and create
        derivative copies of your Content solely to operate, secure, and improve
        the Service for you. The license terminates when you delete the Content
        (or your account) per <Link href="/privacy">Privacy §Your rights</Link>,
        subject to backups expiring naturally on a 30-day retention.
      </Section>

      <Section heading="3. Acceptable use">
        You agree NOT to: (a) reverse-engineer or attempt to derive the source
        of any non-open-source part of the Service; (b) probe, scan, or test the
        vulnerability of the Service without prior written authorisation
        (responsible disclosure is welcome — see{" "}
        <Link href="/security">/security</Link>); (c) interfere with another
        customer&apos;s use of the Service; (d) upload malware, ransomware
        payloads, or knowingly illegal material; (e) use VYNE to send
        unsolicited bulk email or otherwise violate the CAN-SPAM Act, GDPR
        direct-marketing rules, or any equivalent law in your jurisdiction; (f)
        misrepresent your identity or affiliation; (g) use the Service to build
        a competing product through scraping or reverse-engineering. Violations
        may result in immediate suspension.
      </Section>

      <Section heading="4. AI features + outputs">
        AI features pass your prompts + relevant context to third-party model
        providers (currently Anthropic). We do not allow providers to train on
        your data — verified via zero-retention SLA. AI outputs are statistical
        and may contain inaccuracies; you are responsible for verifying anything
        you act on. You may not use AI outputs to mislead users about authorship
        in violation of applicable disclosure laws.
      </Section>

      <Section heading="5. Subscriptions + billing">
        Paid plans are billed via Stripe monthly or annually in advance. All
        fees are non-refundable except where required by law (e.g. EU 14-day
        right of withdrawal for consumers — request within 14 days for full
        refund). We may change pricing with at least 30 days&apos; notice;
        existing committed terms run their course at the price you signed up
        for. Sales tax may be added based on your billing region.
      </Section>

      <Section heading="6. Service Level — honest version">
        We target <strong>99.9% monthly uptime</strong> for the production Web
        app + API gateway, measured over a calendar month. Excluded from that
        calculation: scheduled maintenance (announced at least 24h in advance
        via /status); third-party outages outside our control (Vercel, Neon,
        Stripe); force majeure. If we miss the 99.9% target in a given month,
        paid customers get a 10% prorated credit for that month, applied
        automatically. Status + history at <Link href="/status">/status</Link>.
      </Section>

      <Section heading="7. Termination">
        You may cancel at any time from Settings → Billing. Cancellation stops
        future billing; you keep access until the end of the current period. We
        may suspend or terminate for material breach of these Terms (e.g.
        acceptable-use violations) with notice + reasonable opportunity to cure
        where the breach is curable. On termination you may export your data via{" "}
        <code>POST /api/gdpr/export</code> for 30 days; after that the data is
        purged per <Link href="/privacy">Privacy</Link>.
      </Section>

      <Section heading="8. Disclaimers">
        The Service is provided &quot;as is&quot;. To the maximum extent
        permitted by law, we disclaim all warranties, express or implied,
        including merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the Service will be
        uninterrupted or error-free, or that AI-generated content will be
        accurate. This section does not limit any consumer rights that cannot be
        excluded by law.
      </Section>

      <Section heading="9. Limitation of liability">
        To the maximum extent permitted by law, neither party will be liable for
        any indirect, incidental, special, consequential, or punitive damages,
        or any loss of profits or revenues, even if advised of the possibility.
        Our aggregate liability arising out of or related to these Terms or the
        Service is capped at the greater of (a) the fees you paid us in the 12
        months prior to the event giving rise to liability, or (b) USD $100. The
        cap does not limit liability for: fraud, wilful misconduct, death or
        personal injury caused by negligence, or any other liability that cannot
        be excluded by law.
      </Section>

      <Section heading="10. Indemnification">
        You will defend, indemnify, and hold us harmless from any third-party
        claims arising out of: your Content; your breach of these Terms; or your
        violation of any law or third-party right. We will defend, indemnify,
        and hold you harmless from third-party claims that the Service, as
        provided by us and used within these Terms, infringes that third
        party&apos;s intellectual-property rights.
      </Section>

      <Section heading="11. Governing law + disputes">
        These Terms are governed by the laws of the State of North Carolina,
        USA, without regard to conflict-of-law rules. Any dispute will be
        brought exclusively in the state or federal courts of Mecklenburg
        County, North Carolina, and both parties consent to personal
        jurisdiction there. If you are a consumer in the EU/UK, this paragraph
        does not deprive you of mandatory consumer-protection rights in your
        country.
      </Section>

      <Section heading="12. Changes to these Terms">
        Material changes are announced by email at least 14 days before they
        take effect. Continued use after the effective date is acceptance. Past
        versions are archived at <code>docs/legal/changelog.md</code>.
      </Section>

      <Section heading="13. Contact">
        Legal: <a href="mailto:legal@vyne.app">legal@vyne.app</a>. General:{" "}
        <a href="mailto:hello@vyne.app">hello@vyne.app</a>.
      </Section>
    </LegalPage>
  );
}
