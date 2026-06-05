import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Data Processing Agreement — VYNE",
  description:
    "DPA + Standard Contractual Clauses for VYNE customers processing EU/UK personal data.",
};

// PH-H — DPA. Required when a B2B customer processes EU/UK personal
// data through VYNE. We act as Processor; the customer is Controller.
// This page embeds the operative terms; an executed copy is available
// on request for procurement.

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Agreement"
      subtitle="This DPA forms part of the Terms of Service between you (the Controller) and VYNE (the Processor) when you process personal data of EU/UK data subjects through the Service. It incorporates the European Commission Standard Contractual Clauses (Module 2) and the UK International Data Transfer Addendum."
      lastUpdated="June 5, 2026"
    >
      <Section heading="1. Definitions">
        Terms not defined here have the meaning given in the GDPR. In
        particular: &quot;Controller&quot;, &quot;Processor&quot;,
        &quot;Personal Data&quot;, &quot;Process&quot;, &quot;Data
        Subject&quot;, &quot;Sub-processor&quot;, and &quot;Personal Data
        Breach&quot; all bear their GDPR meaning.
      </Section>

      <Section heading="2. Roles + scope">
        You are the Controller of any Personal Data you upload, import, or
        otherwise process through VYNE. VYNE is the Processor and will only
        Process the Personal Data on documented instructions from you. These
        instructions are: (a) the Terms of Service; (b) the operations the
        Service performs by default; and (c) any additional written instructions
        you provide.
      </Section>

      <Section heading="3. Categories + subjects">
        Categories of Personal Data: contact data (name, email, phone),
        employment data (HR module), financial data (Invoicing / Finance
        modules), CRM activity. Categories of Data Subjects: your employees,
        contractors, customers, suppliers, and any third parties you choose to
        import into your workspace.
      </Section>

      <Section heading="4. VYNE's obligations as Processor">
        We will: (a) Process Personal Data only on your documented instructions;
        (b) ensure persons authorised to Process Personal Data are bound to
        confidentiality; (c) implement appropriate technical + organisational
        measures (Annex II below); (d) assist you in fulfilling Data Subject
        requests; (e) assist with breach notification + Data Protection Impact
        Assessments on reasonable request; (f) delete or return Personal Data at
        the end of the Service per your election; (g) make available all
        information necessary to demonstrate compliance and submit to audits.
      </Section>

      <Section heading="5. Sub-processors">
        You authorise the sub-processors listed in our{" "}
        <Link href="/privacy">Privacy Policy → Subprocessors</Link>. We will:
        (a) enter a written agreement with each sub-processor imposing the same
        data-protection obligations; (b) remain liable to you for each
        sub-processor&apos;s acts and omissions; (c) give you at least 30
        days&apos; notice of any new sub-processor via email to your account
        contact. If you object on reasonable grounds, we will work in good faith
        to resolve; if resolution isn&apos;t reached you may terminate the
        affected Services without penalty.
      </Section>

      <Section heading="6. International transfers — SCCs">
        Where VYNE transfers Personal Data of EU/UK Data Subjects outside the
        EEA/UK, the European Commission&apos;s Standard Contractual Clauses
        (Implementing Decision (EU) 2021/914,{" "}
        <strong>Module 2: Controller to Processor</strong>) apply and are deemed
        entered into between the parties. For onward transfers to
        sub-processors, Module 3 (Processor to Sub-processor) applies. The
        optional docking clause is in effect. Governing law: Republic of
        Ireland. Forum: courts of Ireland. For UK Data Subjects, the{" "}
        <strong>UK International Data Transfer Addendum</strong> (Issue B1.0,
        ICO, 2 February 2022) applies with VYNE as the Importer. We have
        completed and signed both the SCCs and the UK Addendum — executed copies
        available on request to{" "}
        <a href="mailto:legal@vyne.app">legal@vyne.app</a>.
      </Section>

      <Section heading="7. Personal Data Breach">
        We will notify you without undue delay (and in any event within 72
        hours) of becoming aware of a Personal Data Breach affecting your data.
        The notification will describe (so far as known): nature of the breach,
        categories + approximate number of Data Subjects affected, likely
        consequences, and the measures taken or proposed to address it. See{" "}
        <Link href="/security">/security</Link> for our incident-response
        runbook.
      </Section>

      <Section heading="8. Data Subject requests">
        If we receive a Data Subject request relating to your workspace, we
        will: (a) not respond directly except to confirm receipt + refer to you;
        (b) forward the request to your account contact within 5 business days;
        (c) assist you in fulfilling the request — typically by surfacing the
        relevant export / deletion / rectification path in-app within the
        statutory timeline.
      </Section>

      <Section heading="9. Audit + information">
        On reasonable notice and not more than once per 12-month period, you may
        request: (a) a copy of our most recent SOC 2 report (when available —
        Type I in progress; ETA Q4 2026); (b) completion of a written security
        questionnaire (e.g. CAIQ / SIG); (c) at your cost, an on-site audit
        limited to the VYNE-controlled environment, subject to confidentiality +
        safe operating practices.
      </Section>

      <Section heading="10. Deletion or return">
        On termination of the Services, we will, at your election, delete or
        return all Personal Data within 30 days, and delete all backup copies
        within 60 days of termination (subject to Vercel Blob backup retention
        TTL). Where applicable law requires us to retain certain Personal Data
        (e.g. for tax records), we will continue to protect it under the
        obligations of this DPA for the duration of that retention.
      </Section>

      <Section heading="11. Liability">
        Our liability under this DPA is subject to the liability cap in the
        Terms of Service (Section 9). This DPA does not expand any party&apos;s
        liability above what the Terms permit, except where the law forbids such
        a cap (e.g. for personal-data breaches under GDPR Art. 82).
      </Section>

      <Section heading="Annex I — Processing details">
        <ul style={{ marginTop: 12, paddingLeft: 22 }}>
          <li>
            <strong>Subject matter</strong>: Provision of the VYNE collaboration
            + ERP platform under the Terms of Service.
          </li>
          <li>
            <strong>Duration</strong>: For the term of the agreement + the
            wind-down period described in §10.
          </li>
          <li>
            <strong>Nature + purpose</strong>: Hosting, storing, transmitting,
            displaying, and AI-processing Customer data on Customer&apos;s
            instructions.
          </li>
          <li>
            <strong>Types of Personal Data</strong>: Contact info, employment
            data, financial data, CRM activity, message content, AI prompts.
          </li>
          <li>
            <strong>Categories of Data Subjects</strong>: Customer employees,
            contractors, customers, suppliers, prospects.
          </li>
        </ul>
      </Section>

      <Section heading="Annex II — Technical + organisational measures">
        Full posture at <Link href="/security">/security</Link>. Summary: TLS
        1.3 in transit, AES-256 at rest, per-tenant orgId scoping enforced at
        every API route (factory-tested), MFA available, rate-limited APIs,
        audit log of every state-changing action, Sentry error monitoring with
        PII redaction, daily backups + weekly restore verification, 30-day grace
        period for account deletion. Access to production is restricted to
        engineering operators with MFA; access reviews quarterly.
      </Section>

      <Section heading="Executed copy">
        Procurement teams that require a counter-signed copy: email{" "}
        <a href="mailto:legal@vyne.app">legal@vyne.app</a> with your
        legal-entity details and we will return a PDF within 5 business days.
        For most customers, click-through acceptance at signup constitutes
        execution of this DPA.
      </Section>
    </LegalPage>
  );
}
