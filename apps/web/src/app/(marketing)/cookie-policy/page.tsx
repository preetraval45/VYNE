import Link from "next/link";
import { LegalPage, Section, Table } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Cookie Policy — VYNE",
  description:
    "Every cookie VYNE sets, why, how long it lives, and how to opt in or out.",
};

// PH-H — Cookie policy. The categories mirror what CookieBanner
// presents at first visit; revoke + re-consent at any time via the
// footer link.

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="VYNE uses a small set of first-party cookies. We do not set third-party advertising cookies. This page lists each cookie + tells you how to manage them."
      lastUpdated="June 5, 2026"
    >
      <Section heading="Tiers + what you can control">
        Cookies fall into four tiers. Strictly necessary cookies are always set
        because the Service can&apos;t function without them. The other three
        you can opt into or out of via the cookie banner (shown on first visit)
        or any time via &quot;Cookie preferences&quot; in the footer.
      </Section>

      <Section heading="Cookies we set">
        <Table
          headers={["Cookie", "Tier", "Purpose", "Lifetime"]}
          rows={[
            [
              "vyne-token",
              "Strictly necessary",
              "Session authentication (HttpOnly, Secure, SameSite=Strict). Set by /api/auth/session.",
              "30 days; cleared on logout",
            ],
            [
              "vyne-demo",
              "Strictly necessary",
              "Marks a session as the read-only public demo workspace.",
              "Session-scoped",
            ],
            [
              "vyne-csrf",
              "Strictly necessary",
              "Double-submit token for state-changing API requests.",
              "Session-scoped",
            ],
            [
              "vyne-consent",
              "Strictly necessary",
              "Stores your cookie-banner choices so we don&apos;t re-prompt every visit.",
              "12 months",
            ],
            [
              "vyne-theme",
              "Functional (consent)",
              "Light / dark / system theme preference.",
              "12 months",
            ],
            [
              "vyne-sidebar-collapsed",
              "Functional (consent)",
              "Keeps your sidebar in the state you left it.",
              "12 months",
            ],
            [
              "vyne-analytics-id",
              "Analytics (consent)",
              "Anonymous, salted+rotated visitor id for product analytics. NO cross-site tracking.",
              "30 days, rotated",
            ],
            [
              "—",
              "Marketing",
              "Not used. We do not run marketing or advertising cookies.",
              "—",
            ],
          ]}
        />
      </Section>

      <Section heading="Browser controls">
        Most browsers let you block or delete cookies via settings. Blocking
        strictly necessary cookies will log you out and disable VYNE. Useful
        links:
        <ul style={{ marginTop: 12, paddingLeft: 22 }}>
          <li>
            <a href="https://support.google.com/chrome/answer/95647">Chrome</a>
          </li>
          <li>
            <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer">
              Firefox
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac">
              Safari
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09">
              Edge
            </a>
          </li>
        </ul>
      </Section>

      <Section heading="Do Not Track">
        We respect the DNT header on first visit — if your browser sends DNT: 1
        we default the cookie banner to &quot;reject non-essential&quot;. You
        can still opt in to functional or analytics from the banner.
      </Section>

      <Section heading="Children + targeting">
        We do not knowingly target users under 16, and we do not use cookies for
        behavioural advertising or to build cross-site profiles.
      </Section>

      <Section heading="Changes">
        We will update this list whenever a new cookie is introduced. Material
        changes (e.g. adding an analytics provider) are announced via the cookie
        banner + by email at least 14 days ahead. See also{" "}
        <Link href="/privacy">Privacy → Consents table</Link> for the
        server-side audit record we keep of each consent decision.
      </Section>

      <Section heading="Contact">
        Questions: <a href="mailto:privacy@vyne.app">privacy@vyne.app</a>.
      </Section>
    </LegalPage>
  );
}
