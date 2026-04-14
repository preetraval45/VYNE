"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Zap, Shield, Bug, Rocket } from "lucide-react";

type ReleaseTag = "feature" | "improvement" | "fix" | "security" | "launch";

interface Release {
  version: string;
  date: string;
  title: string;
  items: Array<{ tag: ReleaseTag; text: string }>;
}

const TAG_STYLE: Record<
  ReleaseTag,
  { label: string; bg: string; color: string; icon: React.ElementType }
> = {
  launch: {
    label: "Launch",
    bg: "rgba(108,71,255,0.15)",
    color: "#A78BFA",
    icon: Rocket,
  },
  feature: {
    label: "New",
    bg: "rgba(34,197,94,0.15)",
    color: "#4ADE80",
    icon: Sparkles,
  },
  improvement: {
    label: "Improved",
    bg: "rgba(59,130,246,0.15)",
    color: "#93C5FD",
    icon: Zap,
  },
  security: {
    label: "Security",
    bg: "rgba(245,158,11,0.15)",
    color: "#FCD34D",
    icon: Shield,
  },
  fix: {
    label: "Fix",
    bg: "rgba(239,68,68,0.15)",
    color: "#F87171",
    icon: Bug,
  },
};

const RELEASES: Release[] = [
  {
    version: "0.9.0",
    date: "2026-04-14",
    title: "Public Launch — waitlist open",
    items: [
      {
        tag: "launch",
        text: "VYNE is live at vyne.vercel.app — free tier available, waitlist for paid plans.",
      },
      {
        tag: "feature",
        text: "Full dashboard redesign — two-column login page with animated preview panel.",
      },
      {
        tag: "feature",
        text: "Keyboard shortcuts cheat sheet (press `?`) + focus mode (press `F`).",
      },
      {
        tag: "feature",
        text: "New `/api/waitlist`, `/api/upload-image`, and `/api/notifications/send` edge routes.",
      },
      {
        tag: "feature",
        text: "S3 image uploads in the Docs editor with inline base64 fallback.",
      },
      {
        tag: "feature",
        text: "Email notification preferences — daily/weekly digests + test-send button.",
      },
      {
        tag: "improvement",
        text: "Full light/dark theme parity — 500+ components migrated to CSS variables.",
      },
      {
        tag: "security",
        text: "Next.js upgraded to 15.5.15 (patches CVE-2025-66478).",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-04-07",
    title: "Multi-tenant + billing + onboarding",
    items: [
      {
        tag: "feature",
        text: "Onboarding wizard — company setup → module picker → invite team → confetti.",
      },
      {
        tag: "feature",
        text: "Stripe billing integration — Free / Starter / Business tiers + usage tracking.",
      },
      {
        tag: "feature",
        text: "Per-tenant branding (logo, accent colour, custom domain).",
      },
      {
        tag: "feature",
        text: "Module enable/disable per org — 16 modules, sidebar filters automatically.",
      },
      {
        tag: "improvement",
        text: "Argo Rollouts canary config for api-gateway and core-service.",
      },
      {
        tag: "security",
        text: "HSTS, CSP, Permissions-Policy, and rate-limit tuning shipped to vercel.json.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-03-24",
    title: "Mobile V2 + AI intelligence",
    items: [
      {
        tag: "feature",
        text: "Mobile app: QR scanner, offline queue, deep links, biometric auth, push notifications.",
      },
      {
        tag: "feature",
        text: "AI BI Dashboard query bar — ask anything about your business.",
      },
      {
        tag: "feature",
        text: "Finance + Infra AI agents with expandable reasoning trace viewer.",
      },
      {
        tag: "feature",
        text: "Slash commands (`/order`, `/approve`, `/stock`) now execute real ERP actions.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-03-10",
    title: "Docs editor + ERP full CRUD",
    items: [
      {
        tag: "feature",
        text: "Tiptap docs editor — headings, lists, code blocks, tables, images, slash menu.",
      },
      {
        tag: "feature",
        text: "Version history with 20-snapshot ring buffer and restore.",
      },
      {
        tag: "feature",
        text: "Contacts, Sales, Purchase, Manufacturing, Marketing, Reporting modules.",
      },
      {
        tag: "improvement",
        text: "Real CRUD across Projects, Invoicing, Contacts, and Sales.",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A0A1A 0%, #0F0F20 100%)",
        color: "#E8E8F0",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,26,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #6C47FF, #8B6BFF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>VYNE</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "80px 24px 40px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(108,71,255,0.1)",
              border: "1px solid rgba(108,71,255,0.25)",
              color: "#B8A3FF",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <Sparkles size={12} />
            Changelog
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: 14,
            }}
          >
            What&apos;s new in VYNE
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Every ship, every fix, every week. Subscribe on the waitlist to get
            the digest in your inbox.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: "20px 24px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {RELEASES.map((release, idx) => (
            <article
              key={release.version}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 32,
                paddingBottom: idx < RELEASES.length - 1 ? 40 : 0,
                marginBottom: idx < RELEASES.length - 1 ? 40 : 0,
                borderBottom:
                  idx < RELEASES.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: 4,
                  }}
                >
                  {new Date(release.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  v{release.version}
                </div>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.01em",
                    marginBottom: 18,
                  }}
                >
                  {release.title}
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {release.items.map((item) => {
                    const style = TAG_STYLE[item.tag];
                    const Icon = style.icon;
                    return (
                      <li
                        key={item.text}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: style.bg,
                            color: style.color,
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Icon size={11} />
                          {style.label}
                        </div>
                        <p
                          style={{
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: "rgba(255,255,255,0.85)",
                            margin: 0,
                          }}
                        >
                          {item.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
