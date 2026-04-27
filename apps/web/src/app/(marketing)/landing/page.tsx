"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FolderKanban,
  FileText,
  Package,
  BarChart3,
  Bot,
  Check,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Star,
  X,
  Menu,
  Loader2,
  Github,
  Twitter,
  Linkedin,
  Sparkles,
  Plus,
  Minus,
} from "lucide-react";
import { VyneLogo } from "@/components/brand/VyneLogo";

// ── Unified teal palette — dark-first marketing surface ───────────
const C = {
  bg: "#05161A",
  bgDeep: "#020A0C",
  bgMid: "#07191E",
  surface: "rgba(255,255,255,0.03)",
  surfaceHi: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.06)",
  borderHi: "rgba(255,255,255,0.12)",
  text: "#EAFBFD",
  textSub: "#8FB2BA",
  textMuted: "#5A7880",
  purple: "#06B6D4",
  indigo: "#0891B2",
  cyan: "#22D3EE",
  success: "#22C55E",
  danger: "#EF4444",
  aurora: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 45%, #0E7490 100%)",
  auroraSoft:
    "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(6,182,212,0.08))",
  auroraText: "linear-gradient(135deg, #67E8F9 0%, #22D3EE 50%, #06B6D4 100%)",
} as const;

/* ─── Waitlist Form ──────────────────────────────────────────── */
function WaitlistForm({ variant = "hero" }: { variant?: "hero" | "footer" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: variant }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error — please try again");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderRadius: 12,
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
          color: C.success,
          fontWeight: 500,
          fontSize: 14,
        }}
      >
        <Check size={18} strokeWidth={2.5} />
        You&apos;re on the list — we&apos;ll be in touch.
      </motion.div>
    );
  }

  const isHero = variant === "hero";

  return (
    <div style={{ width: "100%", maxWidth: isHero ? 460 : 400 }}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 6, width: "100%" }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address for waitlist"
          required
          className="waitlist-input"
          style={{
            flex: 1,
            padding: "13px 18px",
            borderRadius: 12,
            border: `1px solid ${C.borderHi}`,
            background: C.surface,
            color: C.text,
            fontSize: 14,
            outline: "none",
            letterSpacing: "-0.01em",
            transition: "border 0.18s, background 0.18s",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-aurora"
          style={{
            padding: "13px 24px",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            opacity: status === "loading" ? 0.85 : 1,
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Joining...
            </>
          ) : (
            <>
              Join waitlist
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
      <AnimatePresence>
        {status === "error" && (
          <motion.p
            initial={{ opacity: 1, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: C.danger, fontSize: 13, marginTop: 10 }}
          >
            {errorMessage || "Something went wrong"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Navigation ─────────────────────────────────────────────── */
function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(7,6,26,0.72)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        backdropFilter: "blur(24px) saturate(1.4)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <VyneLogo variant="horizontal" markSize={28} />

      <div
        className="hide-mobile"
        style={{ display: "flex", alignItems: "center", gap: 36 }}
      >
        {(
          [
            ["#features", "Features"],
            ["#comparison", "Integrations"],
            ["#pricing", "Pricing"],
            ["#faq", "FAQ"],
          ] as const
        ).map(([href, label]) => (
          <a
            key={href}
            href={href}
            style={{
              color: C.textSub,
              fontSize: 13.5,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              transition: "color 0.18s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = C.text;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = C.textSub;
            }}
          >
            {label}
          </a>
        ))}
        <Link
          href="/download"
          style={{
            color: C.textSub,
            fontSize: 13.5,
            fontWeight: 500,
            letterSpacing: "-0.005em",
            transition: "color 0.18s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = C.text;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = C.textSub;
          }}
        >
          Download
        </Link>
        <Link
          href="/login"
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: `1px solid ${C.borderHi}`,
            background: C.surface,
            color: C.text,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            transition: "background 0.18s, border 0.18s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.surfaceHi;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.surface;
          }}
        >
          Sign in
        </Link>
      </div>

      <button
        type="button"
        className="hide-desktop"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          background: "none",
          border: "none",
          color: C.text,
          cursor: "pointer",
          padding: 4,
        }}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 1, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="hide-desktop"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "rgba(7,6,26,0.96)",
              WebkitBackdropFilter: "blur(24px)",
              backdropFilter: "blur(24px)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {[
              ["#features", "Features"],
              ["#comparison", "Integrations"],
              ["#pricing", "Pricing"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{ color: C.textSub, fontSize: 16 }}
              >
                {label}
              </a>
            ))}
            <Link
              href="/download"
              onClick={() => setMobileOpen(false)}
              style={{ color: C.textSub, fontSize: 16 }}
            >
              Download
            </Link>
            <Link
              href="/login"
              style={{ color: C.text, fontSize: 16, fontWeight: 600 }}
            >
              Sign in
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ─── Hero Section — aurora mesh + generous type ──────────────── */
function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "140px 24px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Aurora mesh — animated halos */}
      <div
        className="aurora-halo aurora-drift"
        style={{
          width: 700,
          height: 700,
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <div
        className="aurora-halo"
        style={{
          width: 420,
          height: 420,
          top: "55%",
          left: "15%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />
      <div
        className="aurora-halo"
        style={{
          width: 360,
          height: 360,
          top: "10%",
          right: "10%",
          background:
            "radial-gradient(circle, rgba(14,116,144,0.35) 0%, transparent 70%)",
          opacity: 0.35,
        }}
      />

      {/* Dotted grid floor */}
      <div
        className="grid-bg"
        style={{
          position: "absolute",
          inset: 0,
          maskImage:
            "radial-gradient(ellipse 75% 75% at 50% 50%, #000 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 75% at 50% 50%, #000 20%, transparent 75%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
        {/* Tag pill */}
        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 5px 5px 14px",
            borderRadius: 999,
            border: `1px solid ${C.borderHi}`,
            background: C.surface,
            fontSize: 12.5,
            fontWeight: 500,
            color: C.textSub,
            letterSpacing: "-0.005em",
            marginBottom: 28,
          }}
        >
          <Sparkles size={13} style={{ color: "#67E8F9" }} />
          The correlation layer for your business
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 999,
              background: "rgba(6,182,212,0.18)",
              color: "#A5F3FC",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            v1 · beta
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            fontSize: "clamp(40px, 6.8vw, 82px)",
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
            color: C.text,
            marginBottom: 24,
          }}
        >
          Connect what shipped to
          <br />
          <span className="aurora-text">what it changed.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          style={{
            fontSize: "clamp(16px, 1.9vw, 19px)",
            lineHeight: 1.55,
            color: C.textSub,
            maxWidth: 660,
            margin: "0 auto 44px",
            letterSpacing: "-0.005em",
          }}
        >
          VYNE sits on top of the tools you already use and ties business
          events to infra events. When a deploy fails, see which deals it
          blocks. When a customer churns, see what shipped that week. AI
          stitches the timeline together so you stop guessing what caused what.
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: "flex", justifyContent: "center" }}
        >
          <WaitlistForm variant="hero" />
        </motion.div>

        <motion.p
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{
            marginTop: 20,
            fontSize: 12.5,
            color: C.textMuted,
            letterSpacing: "0.01em",
            fontFeatureSettings: '"ss01"',
          }}
        >
          Early access · Free tier available · No credit card required
        </motion.p>

        {/* Replaced stack */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{ marginTop: 56 }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: C.textMuted,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Connects to
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {[
              "GitHub",
              "Sentry",
              "Datadog",
              "HubSpot",
              "Stripe",
              "Linear",
              "PagerDuty",
              "Slack",
            ].map((tool) => (
              <div
                key={tool}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  color: C.textSub,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {tool}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Features Grid ──────────────────────────────────────────── */
const features = [
  {
    icon: Sparkles,
    title: "One timeline for every event",
    desc: "Deploys, PR merges, customer messages, deals, alerts — all flow into a single chronological feed. Filter by team, customer, or service and you'll never have to ask 'what was happening when X broke?' again.",
    replaces: "",
    color: "#A78BFA",
  },
  {
    icon: Bot,
    title: "Causal AI: 'what changed before this?'",
    desc: "Point at any incident, churn event, or revenue dip. AI walks back through the timeline and surfaces the deploys, config changes, and customer signals that correlate with it.",
    replaces: "",
    color: "#EC4899",
  },
  {
    icon: MessageSquare,
    title: "Native chat with calls + AI notes",
    desc: "Voice, video, screen-share, and live transcription — all in the same workspace where the events live. Meetings get auto-recapped and linked to the relevant project, deal, or incident.",
    replaces: "",
    color: "#06B6D4",
  },
  {
    icon: FolderKanban,
    title: "Two-way sync with your stack",
    desc: "GitHub, Sentry, Datadog, HubSpot, Stripe, Linear — connect the systems you already run. VYNE doesn't replace them, it correlates them.",
    replaces: "",
    color: "#0891B2",
  },
  {
    icon: FileText,
    title: "Customer-aware ops",
    desc: "An alert isn't 'CPU at 95%' — it's 'the alert that just woke you up affects 3 enterprise customers totaling $480K ARR.' Every infra event is annotated with the business impact.",
    replaces: "",
    color: "#22C55E",
  },
  {
    icon: Package,
    title: "Built for the team that lives in 10 tools",
    desc: "If your team already runs Jira, Notion, Slack, GitHub, Datadog, HubSpot, and a spreadsheet — keep them. VYNE plugs in and gives you the cross-cutting view you've never had.",
    replaces: "",
    color: "#F59E0B",
  },
];

function Features() {
  return (
    <section
      id="features"
      style={{
        padding: "120px 24px",
        background: C.bgMid,
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <SectionHeader
          eyebrow="The correlation layer"
          title={
            <>
              Stop swivel-chairing across
              <br />
              <span className="aurora-text">six dashboards.</span>
            </>
          }
          subtitle="VYNE plugs into the systems you already run — chat, code, monitoring, CRM, billing — and pulls every event onto one timeline. Ask AI 'what changed before this customer churned?' and get a real answer."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginTop: 56,
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              style={{
                padding: 28,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: C.surface,
                WebkitBackdropFilter: "blur(10px)",
                backdropFilter: "blur(10px)",
                transition:
                  "border-color 0.25s, transform 0.25s, background 0.25s",
              }}
              whileHover={{
                y: -4,
                transition: { duration: 0.2 },
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${f.color}1F`,
                  border: `1px solid ${f.color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <f.icon size={20} color={f.color} strokeWidth={2} />
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: C.text,
                  marginBottom: 8,
                  letterSpacing: "-0.015em",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: C.textSub,
                  marginBottom: 18,
                  letterSpacing: "-0.005em",
                }}
              >
                {f.desc}
              </p>
              {f.replaces && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: f.color,
                    padding: "3px 9px",
                    borderRadius: 5,
                    background: `${f.color}14`,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {f.replaces}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section Header component (used across) ────────────────── */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.textMuted,
          marginBottom: 14,
        }}
      >
        {eyebrow}
      </p>
      <h2
        style={{
          fontSize: "clamp(30px, 4.5vw, 48px)",
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: C.text,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: C.textSub,
          letterSpacing: "-0.005em",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

/* ─── AI Differentiator Section ──────────────────────────────── */
function AIDifferentiator() {
  return (
    <section
      style={{
        padding: "120px 24px",
        background: `linear-gradient(180deg, ${C.bg}, ${C.bgMid})`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="aurora-halo"
        style={{
          width: 700,
          height: 700,
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.2,
        }}
      />
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <SectionHeader
          eyebrow="The AI advantage"
          title={
            <>
              Intelligence that{" "}
              <span className="aurora-text">connects everything</span>
            </>
          }
          subtitle="A deploy breaks. VYNE instantly calculates the business impact, alerts the right people, and suggests a fix — because your chat, code, orders, and finance all live in one system."
        />

        <div
          style={{
            marginTop: 56,
            display: "inline-block",
            maxWidth: "100%",
            padding: "18px 24px",
            borderRadius: 14,
            background: C.surface,
            border: `1px solid ${C.borderHi}`,
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: C.textSub,
            textAlign: "left",
            WebkitBackdropFilter: "blur(10px)",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ color: "#22C55E" }}>✓</span> Deployment failed
          <span style={{ color: C.textMuted, margin: "0 10px" }}>→</span>
          47 orders stuck
          <span style={{ color: C.textMuted, margin: "0 10px" }}>→</span>
          <span style={{ color: "#F87171", fontWeight: 600 }}>
            $12,400 at risk
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
            marginTop: 56,
            textAlign: "left",
          }}
        >
          {[
            {
              icon: Zap,
              label: "Cross-domain intelligence",
              desc: "AI connects data across every module",
            },
            {
              icon: Shield,
              label: "Real slash commands",
              desc: "/approve-order actually approves orders",
            },
            {
              icon: Globe,
              label: "Business-aware alerts",
              desc: "Revenue impact, not just error codes",
            },
            {
              icon: Star,
              label: "Agent reasoning",
              desc: "See how the AI reached its conclusion",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 1, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{
                padding: 22,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: C.surface,
              }}
            >
              <item.icon
                size={18}
                style={{ color: "#67E8F9", marginBottom: 12 }}
                strokeWidth={2}
              />
              <h4
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: C.text,
                  marginBottom: 5,
                  letterSpacing: "-0.01em",
                }}
              >
                {item.label}
              </h4>
              <p
                style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How VYNE fits in your stack ─────────────────────────────
 * Replaces the old "Why pay for 6 tools" comparison. VYNE doesn't
 * displace these systems — it plugs into them and pulls events
 * onto one correlated timeline. */
const integrationRows = [
  {
    tool: "GitHub",
    pulls: "Pushes, PRs, deploys, workflow runs",
    asks: "“Which deploy preceded the alert that paged me?”",
  },
  {
    tool: "Sentry",
    pulls: "Errors, alert firings, regressions",
    asks: "“Which customers were affected by this error spike?”",
  },
  {
    tool: "Datadog",
    pulls: "Metrics, anomalies, SLO breaches",
    asks: "“What shipped 30 min before this latency spike?”",
  },
  {
    tool: "HubSpot",
    pulls: "Deals, contacts, lifecycle events",
    asks: "“Did our new release affect deal velocity?”",
  },
  {
    tool: "Stripe",
    pulls: "Charges, subscriptions, churn signals",
    asks: "“Which incidents preceded this MRR drop?”",
  },
  {
    tool: "Linear",
    pulls: "Issues, cycles, blockers",
    asks: "“Which tickets are blocking which customers?”",
  },
  {
    tool: "PagerDuty",
    pulls: "Incidents, on-call schedules",
    asks: "“What was happening when this incident fired?”",
  },
  {
    tool: "Slack",
    pulls: "Channel + DM activity (read-only)",
    asks: "“Did anyone mention this customer in the last week?”",
  },
];

function Comparison() {
  return (
    <section
      id="comparison"
      style={{ padding: "120px 24px", background: C.bg }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <SectionHeader
          eyebrow="How VYNE fits in your stack"
          title={
            <>
              Keep what works.
              <br />
              <span className="aurora-text">Add the layer that makes it talk.</span>
            </>
          }
          subtitle="Customers don't rip out Jira on a deploy day. VYNE plugs into the systems you already run, pulls every event onto one timeline, and lets AI answer cross-system questions you couldn't even ask before."
        />

        <div
          style={{
            marginTop: 56,
            borderRadius: 16,
            border: `1px solid ${C.borderHi}`,
            overflow: "hidden",
            background: C.surface,
            WebkitBackdropFilter: "blur(10px)",
            backdropFilter: "blur(10px)",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(108, 71, 255, 0.08)",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <th style={thCell("left")}>Tool</th>
                <th style={thCell("left")}>What VYNE pulls in</th>
                <th style={thCell("left")}>Questions you can ask</th>
              </tr>
            </thead>
            <tbody>
              {integrationRows.map((row, i) => (
                <tr
                  key={row.tool}
                  style={{
                    borderBottom:
                      i < integrationRows.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td
                    style={{
                      ...tdCell("left", C.text),
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.tool}
                  </td>
                  <td style={tdCell("left")}>{row.pulls}</td>
                  <td
                    style={{
                      ...tdCell("left"),
                      color: "#C4B5FD",
                      fontStyle: "italic",
                    }}
                  >
                    {row.asks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: C.textMuted,
            textAlign: "center",
            letterSpacing: "-0.005em",
          }}
        >
          Two-way sync where it matters · read-only where you want
          observability without disruption · zero migration required.
        </p>
      </div>
    </section>
  );
}

const thCell = (align: "left" | "center"): React.CSSProperties => ({
  padding: "14px 20px",
  textAlign: align,
  color: C.textSub,
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
});
const tdCell = (
  align: "left" | "center",
  color?: string,
): React.CSSProperties => ({
  padding: "14px 20px",
  textAlign: align,
  color: color ?? C.textSub,
  fontWeight: color ? 500 : 400,
  letterSpacing: "-0.005em",
});

/* ─── Pricing ────────────────────────────────────────────────── */
type Plan = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  accent?: "purple" | "teal";
};
const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For individuals and hobby projects",
    features: [
      "1 user",
      "1 GB storage",
      "50 AI queries/day",
      "All core modules",
      "Community support",
    ],
    cta: "Get started",
  },
  {
    name: "Starter",
    price: "$12",
    period: "/user/mo",
    desc: "For growing teams that need real power",
    features: [
      "Unlimited users",
      "50 GB storage",
      "500 AI queries/day",
      "All modules + integrations",
      "Email support",
      "CSV import/export",
    ],
    cta: "Join waitlist",
    highlight: true,
    accent: "purple",
  },
  {
    name: "Business",
    price: "$24",
    period: "/user/mo",
    desc: "For companies that run on VYNE",
    features: [
      "Unlimited users",
      "200 GB storage",
      "Unlimited AI queries",
      "Custom AI agents",
      "Priority support",
      "SSO / SAML",
      "Audit log",
    ],
    cta: "Join waitlist",
    accent: "teal",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    desc: "For regulated + global organizations",
    features: [
      "Dedicated success manager",
      "Private cloud / on-prem",
      "SOC 2 Type II + HIPAA",
      "Custom data residency",
      "99.99% uptime SLA",
      "SAML + SCIM provisioning",
      "Advanced audit + eDiscovery",
    ],
    cta: "Contact sales",
  },
];

function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: "120px 24px",
        background: C.bgMid,
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <SectionHeader
          eyebrow="Pricing"
          title={
            <>
              Simple, transparent <span className="aurora-text">pricing</span>
            </>
          }
          subtitle="No per-module charges. One price, everything included."
        />

        <div
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          {plans.map((plan, i) => {
            const tealAccent = plan.accent === "teal";
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 1, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={plan.highlight ? "gradient-border" : undefined}
                style={{
                  padding: 28,
                  borderRadius: 18,
                  position: "relative",
                  border: plan.highlight
                    ? "none"
                    : `1px solid ${tealAccent ? "rgba(6,182,212,0.25)" : C.border}`,
                  background: plan.highlight
                    ? `linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.02) 100%), ${C.bg}`
                    : tealAccent
                      ? `linear-gradient(180deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.01) 100%), ${C.surface}`
                      : C.surface,
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "5px 14px",
                      borderRadius: 999,
                      background: "var(--aurora)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      boxShadow: "0 8px 20px rgba(6,182,212,0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles size={11} />
                    MOST POPULAR
                  </div>
                )}
                {tealAccent && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      right: 18,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "linear-gradient(135deg, #06B6D4, #0891B2)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      boxShadow: "0 6px 16px rgba(6,182,212,0.35)",
                    }}
                  >
                    SCALE
                  </div>
                )}

                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.text,
                    marginBottom: 4,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    marginBottom: 22,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {plan.desc}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 3,
                    marginBottom: 26,
                  }}
                >
                  <span
                    style={{
                      fontSize: 44,
                      fontWeight: 700,
                      color: C.text,
                      lineHeight: 1,
                      letterSpacing: "-0.035em",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{ fontSize: 13, color: C.textMuted, marginLeft: 4 }}
                  >
                    {plan.period}
                  </span>
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 11,
                  }}
                >
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13.5,
                        color: C.textSub,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      <Check size={14} color={C.success} strokeWidth={2.5} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <a
                  href="#waitlist"
                  aria-label={`${plan.cta} — ${plan.name} plan`}
                  className={
                    plan.highlight
                      ? "btn-aurora"
                      : tealAccent
                        ? "btn-teal"
                        : undefined
                  }
                  style={
                    plan.highlight
                      ? {
                          display: "block",
                          textAlign: "center",
                          padding: "11px 20px",
                          fontSize: 14,
                        }
                      : tealAccent
                        ? {
                            display: "block",
                            textAlign: "center",
                            padding: "11px 20px",
                            fontSize: 14,
                          }
                        : {
                            display: "block",
                            textAlign: "center",
                            padding: "11px 20px",
                            borderRadius: 10,
                            fontWeight: 600,
                            fontSize: 13.5,
                            background: C.surface,
                            color: C.text,
                            border: `1px solid ${C.borderHi}`,
                            transition: "all 0.2s",
                            letterSpacing: "-0.005em",
                          }
                  }
                >
                  {plan.cta}
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Trust bar ──────────────────────────────────────────────── */
function TrustBar() {
  const stats = [
    {
      label: "Modules",
      value: "15+",
      hint: "Chat · Projects · ERP · CRM · more",
    },
    { label: "Uptime SLA", value: "99.99%", hint: "Enterprise tier" },
    { label: "Response time", value: "< 150ms", hint: "p95 global edge" },
    {
      label: "Data residency",
      value: "US · EU · AP",
      hint: "Choose your region",
    },
  ];
  return (
    <section
      style={{
        padding: "48px 24px",
        background: C.bgDeep,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 18,
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#22D3EE",
                  marginBottom: 8,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: C.text,
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  letterSpacing: "-0.005em",
                }}
              >
                {s.hint}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────── */
const faqs = [
  {
    q: "Is VYNE actually ready for production?",
    a: "We are in beta. Core modules (chat, projects, docs, auth) are wired to real backends; ERP, finance, and CRM still render sample data in demo mode. Early-access customers are onboarded with a dedicated setup call.",
  },
  {
    q: "Do I have to migrate everything at once?",
    a: "No. VYNE imports from Slack, Notion, Jira, QuickBooks, Stripe, and Google Workspace — you can roll out one module at a time and keep your existing tools running in parallel.",
  },
  {
    q: "How is my data secured?",
    a: "Row-level tenant isolation in Postgres, encryption at rest (AES-256) and in transit (TLS 1.3), SOC 2 Type II in progress, and optional private-cloud deployment on Enterprise.",
  },
  {
    q: "What about the AI — where does my data go?",
    a: "Your prompts and embeddings are processed on AWS Bedrock in your chosen region. No training on your data, ever. Enterprise customers can bring their own model key or use on-prem inference.",
  },
  {
    q: "Can I export my data if I leave?",
    a: "Yes — one-click export to CSV/JSON for every module, plus a full Postgres dump for Business and Enterprise plans. No lock-in.",
  },
  {
    q: "How does pricing work at scale?",
    a: "Per-user pricing is transparent up to 500 seats. Above that, Enterprise pricing includes volume discounts, custom usage limits, and annual commits.",
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${open ? "rgba(6,182,212,0.35)" : C.border}`,
        background: open ? "rgba(6,182,212,0.04)" : C.surface,
        overflow: "hidden",
        transition: "border-color 0.25s, background 0.25s",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: C.text,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          textAlign: "left",
        }}
      >
        <span>{q}</span>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: open
              ? "rgba(6,182,212,0.15)"
              : "rgba(255,255,255,0.04)",
            color: open ? "#22D3EE" : C.textSub,
            flexShrink: 0,
            marginLeft: 16,
            transition: "background 0.2s, color 0.2s",
          }}
        >
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 22px 20px",
                fontSize: 14,
                lineHeight: 1.6,
                color: C.textSub,
                letterSpacing: "-0.005em",
              }}
            >
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  return (
    <section id="faq" style={{ padding: "120px 24px", background: C.bg }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <SectionHeader
          eyebrow="FAQ"
          title={
            <>
              Common <span className="aurora-text">questions</span>
            </>
          }
          subtitle="Everything you wanted to ask before signing up."
        />
        <div
          style={{
            marginTop: 56,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {faqs.map((f, i) => (
            <FAQItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Footer ──────────────────────────────────────────────── */
function CTAFooter() {
  return (
    <section
      id="waitlist"
      style={{
        padding: "120px 24px",
        background: `radial-gradient(ellipse 80% 60% at 50% 100%, rgba(6,182,212,0.22), transparent 70%), ${C.bg}`,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="aurora-halo"
        style={{
          width: 600,
          height: 600,
          bottom: -200,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.3,
        }}
      />
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontSize: "clamp(30px, 4.5vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: C.text,
            marginBottom: 16,
          }}
        >
          Ready to replace <span className="aurora-text">your stack?</span>
        </h2>
        <p
          style={{
            fontSize: 16,
            color: C.textSub,
            marginBottom: 40,
            letterSpacing: "-0.005em",
          }}
        >
          Join the waitlist and be among the first to run your company on VYNE.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <WaitlistForm variant="footer" />
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  const socials = [
    {
      href: "https://github.com/preetraval45/VYNE",
      label: "GitHub",
      Icon: Github,
    },
    { href: "https://twitter.com/vyneapp", label: "Twitter", Icon: Twitter },
    {
      href: "https://linkedin.com/company/vyne-app",
      label: "LinkedIn",
      Icon: Linkedin,
    },
  ];

  return (
    <footer
      style={{
        padding: "44px 24px 32px",
        background: C.bgDeep,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <VyneLogo variant="mark" markSize={24} />
          <span
            style={{
              fontSize: 13,
              color: C.textMuted,
              letterSpacing: "-0.005em",
            }}
          >
            Run your company, not your tools.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[
            { label: "Download", href: "/download" },
            { label: "Developers", href: "/developers" },
            { label: "Changelog", href: "/changelog" },
            { label: "Status", href: "/status" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 12.5,
                color: C.textSub,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.textMuted,
                border: `1px solid ${C.border}`,
                background: C.surface,
                transition: "color 0.18s, border 0.18s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = C.text;
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  C.borderHi;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color =
                  C.textMuted;
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  C.border;
              }}
            >
              <Icon size={14} />
            </a>
          ))}
        </div>

        <p
          style={{
            fontSize: 12,
            color: C.textMuted,
            letterSpacing: "-0.005em",
          }}
        >
          &copy; {new Date().getFullYear()} VYNE. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "var(--font-display)",
      }}
    >
      <Nav />
      <Hero />
      <TrustBar />
      <Features />
      <AIDifferentiator />
      <Comparison />
      <Pricing />
      <FAQ />
      <CTAFooter />
      <Footer />
    </div>
  );
}
