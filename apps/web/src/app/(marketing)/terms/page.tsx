import Link from "next/link";
import { VyneLogo } from "@/components/brand/VyneLogo";

export const metadata = {
  title: "Terms of Service — VYNE",
  description: "The terms under which you may use VYNE.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 32 }}>
          These Terms of Service (&quot;Terms&quot;) govern your use of VYNE. By accessing or using the platform,
          you agree to be bound by these Terms.
        </p>

        <Section heading="1. Acceptance">
          You must be at least 18 years old to use VYNE. By creating an account or using the Service, you
          represent that you have the legal capacity to enter into a binding contract.
        </Section>
        <Section heading="2. Your account">
          You are responsible for safeguarding your account credentials and for any activity that occurs
          under your account. Notify us immediately of any unauthorized use.
        </Section>
        <Section heading="3. Acceptable use">
          You agree not to misuse the Service, including reverse-engineering, attempting unauthorized access,
          uploading malware, or using the Service to violate any law or third-party right.
        </Section>
        <Section heading="4. Your content">
          You retain ownership of any data, files, or information you upload (&quot;Content&quot;). You grant VYNE
          a non-exclusive license to host, process, and display your Content solely to operate the Service.
        </Section>
        <Section heading="5. Subscriptions &amp; billing">
          Paid plans are billed monthly or annually in advance. Fees are non-refundable except as required
          by law. We may change pricing with 30 days&apos; notice.
        </Section>
        <Section heading="6. Service availability">
          We target 99.9% uptime but do not guarantee uninterrupted service. Planned maintenance will be
          announced in advance when possible.
        </Section>
        <Section heading="7. Termination">
          You may cancel at any time from Settings. We may suspend or terminate accounts that violate these
          Terms. Upon termination, you may export your data within 30 days.
        </Section>
        <Section heading="8. Limitation of liability">
          To the maximum extent permitted by law, VYNE is not liable for indirect, incidental, or
          consequential damages. Our total liability is capped at the fees you paid in the preceding 12 months.
        </Section>
        <Section heading="9. Changes to these Terms">
          We may update these Terms occasionally. Material changes will be announced by email or in-app
          notice at least 14 days before taking effect.
        </Section>
        <Section heading="10. Contact">
          Questions? Email <a href="mailto:hello@vyne.app" style={{ color: "var(--vyne-teal)" }}>hello@vyne.app</a>.
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
