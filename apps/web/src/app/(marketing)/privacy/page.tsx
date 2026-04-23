import Link from "next/link";
import { VyneLogo } from "@/components/brand/VyneLogo";

export const metadata = {
  title: "Privacy Policy — VYNE",
  description: "How VYNE collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div style={{ background: "var(--content-bg)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "var(--font-display)" }}>
      <nav style={{ padding: "16px 24px", borderBottom: "1px solid var(--content-border)" }}>
        <Link href="/"><VyneLogo variant="horizontal" markSize={26} /></Link>
      </nav>
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 96px", lineHeight: 1.7 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12 }}>
          Last updated · April 23, 2026
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 32 }}>
          VYNE respects your privacy. This policy explains what data we collect, why, and how we protect it.
        </p>

        <Section heading="Data we collect">
          Account info (email, name), workspace content you create (projects, tasks, documents, chat messages),
          device metadata for security, and product analytics to improve the Service.
        </Section>
        <Section heading="How we use data">
          To operate the Service, authenticate you, send transactional email, and analyze aggregate usage.
          We never sell your personal data.
        </Section>
        <Section heading="AI features">
          When you use AI features, prompts are processed on AWS Bedrock in your chosen region. Your prompts
          and embeddings are never used to train third-party models. Enterprise customers may bring their own
          model keys or request on-prem inference.
        </Section>
        <Section heading="Storage &amp; encryption">
          Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Postgres row-level security isolates
          each tenant&apos;s data. SOC 2 Type II is in progress.
        </Section>
        <Section heading="Your rights">
          You can export your data in CSV or JSON from Settings at any time. To request deletion of your
          account, email <a href="mailto:privacy@vyne.app" style={{ color: "var(--vyne-teal)" }}>privacy@vyne.app</a>.
          GDPR and CCPA requests are honored within 30 days.
        </Section>
        <Section heading="Cookies">
          We use first-party cookies for authentication and preferences. No third-party advertising cookies.
        </Section>
        <Section heading="Data retention">
          Active accounts: indefinite. Deleted accounts: permanently erased within 90 days. Backups are
          rotated every 30 days.
        </Section>
        <Section heading="Children">
          VYNE is not intended for users under 16. We do not knowingly collect data from children.
        </Section>
        <Section heading="Changes">
          We will notify you in-app and by email of any material changes to this policy.
        </Section>
        <Section heading="Contact">
          Privacy questions? <a href="mailto:privacy@vyne.app" style={{ color: "var(--vyne-teal)" }}>privacy@vyne.app</a>.
        </Section>
      </article>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em", margin: "0 0 10px" }}>
        {heading}
      </h2>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: 0 }}>{children}</p>
    </section>
  );
}
