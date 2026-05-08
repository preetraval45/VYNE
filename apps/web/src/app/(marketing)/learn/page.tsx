import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Rocket,
  Bot,
  KeyRound,
  Webhook,
  Code,
  Database,
  Zap,
  ShieldCheck,
  Headphones,
  ArrowRight,
} from "lucide-react";

// Public documentation index at /learn (UI_UPGRADE_PLAN.md 9.5).
// Lives at /learn instead of /docs because the in-app /docs is the
// docs editor (dashboard route group).
// Hand-curated section grid linking to internal anchors + the live
// OpenAPI spec at /api/openapi (already shipped). Each section is a
// short H3 + paragraph + code snippet so visitors can scan the surface
// without a heavyweight docs site (Mintlify / Docusaurus). When the
// repo grows enough to need that, swap this page for an external
// portal — the slug paths stay stable.

export const metadata: Metadata = {
  title: "Learn VYNE — Quickstart, API, Webhooks",
  description:
    "Everything you need to integrate, automate, and extend VYNE. Quickstart, API reference, webhooks, AI tools, and more.",
};

const SECTIONS = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started",
    body: "Sign up, set up your workspace, and ship your first AI-driven workflow in 5 minutes.",
    href: "#getting-started",
  },
  {
    id: "ai",
    icon: Bot,
    title: "AI features",
    body: "Persona, memory, RAG, Skills (multi-step chains), agent traces, and the cost-meter pre-flight.",
    href: "#ai",
  },
  {
    id: "api",
    icon: Code,
    title: "REST API",
    body: "OpenAPI spec at /api/openapi covers every CRUD route + auth + webhooks. SDK examples in 8 languages.",
    href: "/api/openapi",
  },
  {
    id: "webhooks",
    icon: Webhook,
    title: "Webhooks",
    body: "HMAC-signed event delivery for deal/task/invoice/customer changes. Configure in Settings → Developer.",
    href: "#webhooks",
  },
  {
    id: "auth",
    icon: KeyRound,
    title: "Auth & API keys",
    body: "Per-key scopes (deals:read, tasks:write, …) + per-key rate limits. SCIM v2 for SSO provisioning.",
    href: "#auth",
  },
  {
    id: "data",
    icon: Database,
    title: "Data & backups",
    body: "GDPR export + erasure endpoints, daily Postgres dumps to Vercel Blob, workspace snapshots.",
    href: "#data",
  },
  {
    id: "automations",
    icon: Zap,
    title: "Automations & Skills",
    body: "Visual chat workflow builder, message-action blocks, AI Skills via /skill <slug>.",
    href: "#automations",
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Security",
    body: "2FA, SSO, BYOK, field-level permissions, anomaly detection, SOC 2 + HIPAA-ready audit log.",
    href: "#security",
  },
  {
    id: "support",
    icon: Headphones,
    title: "Support",
    body: "Status page · changelog · email support@vyne.dev · 24h SLA on Business, 1h on Enterprise.",
    href: "/status",
  },
];

const QUICKSTART_CODE = `# 1. Install the SDK
npm install @vyne/client   # or pip install vyne-client

# 2. Authenticate
import { Vyne } from "@vyne/client";
const vyne = new Vyne({ apiKey: process.env.VYNE_API_KEY });

# 3. Create your first deal
const deal = await vyne.deals.create({
  company: "Acme Corp",
  stage: "Qualified",
  value: 48000,
});

# 4. Ask the AI agent (RAG-enabled)
const reply = await vyne.ai.ask("What stalled deals should I follow up on this week?");
console.log(reply.answer, reply.citations);`;

const WEBHOOK_CODE = `// Verify the HMAC signature on every webhook
import { createHmac, timingSafeEqual } from "node:crypto";

function isValid(req: Request, secret: string) {
  const sig = req.headers.get("x-vyne-signature") ?? "";
  const ts = req.headers.get("x-vyne-timestamp") ?? "";
  const body = await req.text();
  const expected = createHmac("sha256", secret)
    .update(\`\${ts}.\${body}\`)
    .digest("hex");
  return timingSafeEqual(
    Buffer.from(sig.replace("v1=", "")),
    Buffer.from(expected),
  );
}`;

export default function DocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #0A1820)",
        color: "var(--text-primary, #F0F4F8)",
        fontFamily: "var(--font-app, 'Geist', system-ui)",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "inherit",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          VYNE
        </Link>
        <Link
          href="/pricing"
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "var(--text-secondary, #94a3b8)",
            textDecoration: "none",
          }}
        >
          Pricing
        </Link>
        <Link
          href="/changelog"
          style={{
            fontSize: 13,
            color: "var(--text-secondary, #94a3b8)",
            textDecoration: "none",
          }}
        >
          Changelog
        </Link>
        <Link
          href="/login"
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 8,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </nav>

      <header
        style={{
          textAlign: "center",
          maxWidth: 760,
          margin: "40px auto 32px",
          padding: "0 24px",
        }}
      >
        <h1 style={{ fontSize: 44, margin: "0 0 12px", lineHeight: 1.1 }}>
          Documentation
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--text-secondary, #94a3b8)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Quickstart, API, webhooks, AI tools, security. Everything you need
          to integrate VYNE into your stack.
        </p>
      </header>

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.id}
              href={s.href}
              style={{
                padding: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "inherit",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                transition: "background 0.15s",
              }}
            >
              <Icon
                size={20}
                aria-hidden="true"
                color="rgb(108, 71, 255)"
              />
              <h3 style={{ margin: 0, fontSize: 17 }}>{s.title}</h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-secondary, #94a3b8)",
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {s.body}
              </p>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "rgb(108, 71, 255)",
                  marginTop: 4,
                }}
              >
                Read <ArrowRight size={11} />
              </span>
            </Link>
          );
        })}
      </section>

      {/* Quickstart anchor */}
      <section
        id="getting-started"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "40px 24px",
          scrollMarginTop: 80,
        }}
      >
        <h2 style={{ fontSize: 28, margin: "0 0 12px" }}>Quickstart</h2>
        <p
          style={{
            margin: "0 0 16px",
            color: "var(--text-secondary, #94a3b8)",
            lineHeight: 1.6,
          }}
        >
          Four lines of code, ten seconds to your first AI-grounded answer.
        </p>
        <pre
          style={{
            margin: 0,
            padding: 20,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            overflowX: "auto",
            lineHeight: 1.6,
          }}
        >
          <code>{QUICKSTART_CODE}</code>
        </pre>
      </section>

      {/* API anchor */}
      <section
        id="api"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "20px 24px",
          scrollMarginTop: 80,
        }}
      >
        <h2 style={{ fontSize: 28, margin: "0 0 12px" }}>REST API</h2>
        <p
          style={{
            margin: "0 0 12px",
            color: "var(--text-secondary, #94a3b8)",
            lineHeight: 1.6,
          }}
        >
          Live OpenAPI spec covers every endpoint:{" "}
          <Link
            href="/api/openapi"
            style={{ color: "rgb(108, 71, 255)" }}
          >
            /api/openapi
          </Link>
          . Drop it into Postman, Stoplight, or auto-generate a client.
        </p>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          {[
            "GET /api/{module}",
            "POST /api/{module}",
            "PATCH /api/{module}/[id]",
            "DELETE /api/{module}/[id]",
            "POST /api/ai/ingest",
            "POST /api/ai/retrieve",
            "POST /api/ai/search",
            "POST /api/stripe/checkout",
            "POST /api/audit",
            "GET  /api/openapi",
          ].map((endpoint) => (
            <li
              key={endpoint}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
              }}
            >
              {endpoint}
            </li>
          ))}
        </ul>
      </section>

      {/* Webhooks anchor */}
      <section
        id="webhooks"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "20px 24px",
          scrollMarginTop: 80,
        }}
      >
        <h2 style={{ fontSize: 28, margin: "0 0 12px" }}>Webhooks</h2>
        <p
          style={{
            margin: "0 0 16px",
            color: "var(--text-secondary, #94a3b8)",
            lineHeight: 1.6,
          }}
        >
          VYNE delivers signed POSTs for every state-changing event. Configure
          subscriptions in Settings → Developer; verify the{" "}
          <code>x-vyne-signature</code> header against your shared secret on
          every request.
        </p>
        <pre
          style={{
            margin: 0,
            padding: 20,
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            overflowX: "auto",
            lineHeight: 1.6,
          }}
        >
          <code>{WEBHOOK_CODE}</code>
        </pre>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 60,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-tertiary, #64748b)",
        }}
      >
        © {new Date().getFullYear()} VYNE. ·{" "}
        <Link
          href="/pricing"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Pricing
        </Link>{" "}
        ·{" "}
        <Link
          href="/changelog"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Changelog
        </Link>{" "}
        ·{" "}
        <Link
          href="/status"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Status
        </Link>
      </footer>
    </div>
  );
}
