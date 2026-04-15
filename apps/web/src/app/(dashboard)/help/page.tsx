"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Search,
  ExternalLink,
  ArrowRight,
  Zap,
  BookOpen,
  MessageCircle,
  Mail,
} from "lucide-react";

interface HelpArticle {
  slug: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  keywords: string[];
}

const ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    category: "Getting started",
    title: "Your first 5 minutes in VYNE",
    summary:
      "Sign in, switch workspaces, and navigate using the command palette.",
    body: "Hit ⌘K to open the palette. Type a page name to jump, type `?` to ask AI, type `>` for quick actions. Press ⌘⇧O to switch workspaces. Press ? anywhere for the full shortcut sheet.",
    keywords: ["onboarding", "basics", "shortcuts", "navigation"],
  },
  {
    slug: "invite-members",
    category: "Getting started",
    title: "Invite teammates",
    summary: "Settings → Members → Invite. Roles + permissions matrix.",
    body: "Go to Settings > Members, click Invite. Assign one of four built-in roles (Owner / Admin / Member / Viewer) or build a custom role in the permissions matrix.",
    keywords: ["members", "invite", "team", "roles"],
  },
  {
    slug: "slash-commands",
    category: "Chat",
    title: "Running slash commands",
    summary: "`/approve-order 1042` to approve an order from chat.",
    body: "Type `/` in any chat composer to open the command menu. The result renders inline as a card with follow-up actions. Requires write-scope API key.",
    keywords: ["chat", "commands", "slash", "automation"],
  },
  {
    slug: "api-keys",
    category: "Developers",
    title: "Creating an API key",
    summary: "Settings → Developer → New key. Choose scope + rate tier.",
    body: "Scopes: read / write / admin. Rate tiers: Free, Starter, Business, Enterprise. The plaintext key is shown once — copy it before dismissing.",
    keywords: ["api", "key", "developer", "scope"],
  },
  {
    slug: "webhooks",
    category: "Developers",
    title: "Subscribing to webhooks",
    summary: "Settings → Developer → Outbound webhooks. Event catalogue.",
    body: "POST endpoint receives JSON with `x-vyne-signature` HMAC-SHA256 header. Verify with your signing secret. Events auto-retry up to 5× over 24h.",
    keywords: ["webhooks", "events", "integration"],
  },
  {
    slug: "docs-collab",
    category: "Docs",
    title: "Real-time collaboration in Docs",
    summary: "Yjs peer-to-peer — see cursors, AI ghost-text, version diff.",
    body: "Open any doc. Other collaborators' cursors appear live. Press the ✨ button to ask AI to continue / rewrite / summarise. Version history is diffable from the History panel.",
    keywords: ["docs", "collaboration", "yjs", "ai"],
  },
  {
    slug: "2fa",
    category: "Security",
    title: "Enabling 2FA",
    summary: "Settings → Security → Enable 2FA. TOTP authenticator.",
    body: "Scan the QR with any authenticator (1Password, Authy, Google Authenticator), then enter the 6-digit code to confirm. Recovery codes are one-time-use; store them safely.",
    keywords: ["security", "2fa", "authenticator", "mfa"],
  },
  {
    slug: "billing",
    category: "Billing",
    title: "Changing your plan",
    summary: "Settings → Billing. Upgrade/downgrade any time.",
    body: "Downgrades take effect at the next billing cycle — your credit is prorated. Usage-based add-ons are invoiced end of cycle.",
    keywords: ["billing", "plan", "subscription", "stripe"],
  },
  {
    slug: "gdpr-export",
    category: "Compliance",
    title: "Exporting your data (GDPR)",
    summary: "Settings → Compliance → Download my data.",
    body: "Generates a JSON archive with your profile, messages, docs, issues, and audit log entries. Article 20 compliant. Deletion is a separate flow.",
    keywords: ["gdpr", "export", "privacy", "data"],
  },
  {
    slug: "focus-mode",
    category: "Productivity",
    title: "Focus mode + Pomodoro",
    summary: "Press F to hide everything non-essential. P toggles the timer.",
    body: "Focus mode removes the sidebar + top bar. The Pomodoro widget pins to the bottom-right — configure phase lengths in its gear menu.",
    keywords: ["focus", "pomodoro", "shortcuts"],
  },
  {
    slug: "ai-daily-digest",
    category: "AI",
    title: "Enabling the AI daily digest",
    summary: "Settings → Notifications → AI daily digest.",
    body: "Pick a channel (e.g. `#general`), click Preview to see what AI would post today, then Post-now or schedule for the next day.",
    keywords: ["ai", "digest", "summary"],
  },
  {
    slug: "dashboard-builder",
    category: "Productivity",
    title: "Customising My Dashboard",
    summary: "Drag widgets from the palette. Resize from the dropdown.",
    body: "The `/dashboard` page lets you build your own home. Layouts are saved per-user in localStorage. Press Reset to restore defaults.",
    keywords: ["dashboard", "widgets", "home", "customise"],
  },
];

export default function HelpCentrePage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HelpArticle | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ARTICLES;
    return ARTICLES.filter((a) =>
      [a.title, a.summary, a.body, a.category, ...a.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const a of filtered) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (selected) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          padding: "28px 32px",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => setSelected(null)}
          style={{
            alignSelf: "flex-start",
            marginBottom: 16,
            padding: "6px 10px",
            borderRadius: 7,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ← Back to help centre
        </button>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--vyne-purple)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {selected.category}
        </span>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            margin: "6px 0 10px",
            lineHeight: 1.2,
          }}
        >
          {selected.title}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 16px",
          }}
        >
          {selected.summary}
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
            lineHeight: 1.7,
            margin: "0 0 24px",
          }}
        >
          {selected.body}
        </p>
        <footer
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          Was this helpful?
          <button type="button" style={feedbackBtn}>👍 Yes</button>
          <button type="button" style={feedbackBtn}>👎 No</button>
          <div style={{ flex: 1 }} />
          <Link
            href="/chat"
            style={{
              color: "var(--vyne-purple)",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            Ask in #help <ArrowRight size={12} />
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: "28px 32px",
      }}
      className="content-scroll"
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <LifeBuoy size={22} style={{ color: "var(--vyne-purple)" }} />
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Help centre
          </h1>
        </header>
        <p
          style={{
            margin: "0 0 22px",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          Search articles or ask Vyne AI — we&apos;ll point you at the right one.
        </p>

        <div
          style={{
            position: "relative",
            marginBottom: 24,
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the help centre…"
            aria-label="Search help"
            style={{
              width: "100%",
              padding: "14px 14px 14px 40px",
              borderRadius: 12,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>

        {/* Quick links */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Ask AI", desc: "Type `?` in ⌘K", icon: Zap, href: "/ai", color: "#6C47FF" },
            { label: "Docs", desc: "Long-form guides", icon: BookOpen, href: "/docs", color: "#22C55E" },
            { label: "Community", desc: "#help in chat", icon: MessageCircle, href: "/chat", color: "#3B82F6" },
            { label: "Email us", desc: "support@vyne.dev", icon: Mail, href: "mailto:support@vyne.dev", color: "#F59E0B" },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              <q.icon size={16} style={{ color: q.color, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{q.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {q.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Articles */}
        {grouped.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 14,
            }}
          >
            No articles match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          grouped.map(([cat, items]) => (
            <section key={cat} style={{ marginBottom: 24 }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-tertiary)",
                }}
              >
                {cat}
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {items.map((a) => (
                  <li key={a.slug}>
                    <button
                      type="button"
                      onClick={() => setSelected(a)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 9,
                        border: "1px solid var(--content-border)",
                        background: "var(--content-bg)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {a.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            marginTop: 2,
                          }}
                        >
                          {a.summary}
                        </div>
                      </div>
                      <ExternalLink
                        size={13}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

const feedbackBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
