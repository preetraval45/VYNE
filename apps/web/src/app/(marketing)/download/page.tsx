"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Apple,
  Smartphone,
  Monitor,
  Globe,
  Download,
  Check,
  ArrowRight,
  Loader2,
  Bell,
  Sparkles,
} from "lucide-react";
import { VyneLogo } from "@/components/brand/VyneLogo";
import { usePWAInstall } from "@/hooks/usePWAInstall";

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
  cyan: "var(--vyne-accent-light, #22D3EE)",
  teal: "var(--vyne-accent, #06B6D4)",
  success: "#22C55E",
  aurora: "linear-gradient(135deg, var(--vyne-accent-light, #22D3EE) 0%, var(--vyne-accent, #06B6D4) 45%, var(--vyne-accent-deep, #0E7490) 100%)",
  auroraText: "linear-gradient(135deg, #67E8F9 0%, var(--vyne-accent-light, #22D3EE) 50%, var(--vyne-accent, #06B6D4) 100%)",
} as const;

type Platform = {
  id: string;
  name: string;
  blurb: string;
  Icon: typeof Apple;
  status: "pwa" | "soon";
  cta: string;
  href?: string;
};

const desktop: Platform[] = [
  {
    id: "macos",
    name: "macOS",
    blurb: "Native menu bar app · Apple silicon + Intel",
    Icon: Apple,
    status: "soon",
    cta: "Notify me",
  },
  {
    id: "windows",
    name: "Windows",
    blurb: "Windows 10 and 11 · System tray + global ⌘K",
    Icon: Monitor,
    status: "soon",
    cta: "Notify me",
  },
  {
    id: "linux",
    name: "Linux",
    blurb: "AppImage · Debian and RPM packages",
    Icon: Monitor,
    status: "soon",
    cta: "Notify me",
  },
];

const mobile: Platform[] = [
  {
    id: "ios",
    name: "iOS",
    blurb: "iPhone and iPad · iOS 16+",
    Icon: Apple,
    status: "soon",
    cta: "Join TestFlight",
  },
  {
    id: "android",
    name: "Android",
    blurb: "Android 11+ · Material You theming",
    Icon: Smartphone,
    status: "soon",
    cta: "Join Play beta",
  },
];

function detectPlatform(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";
  return null;
}

function NotifyForm({ platformId }: { platformId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `download:${platformId}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong");
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  if (status === "success") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: C.success,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <Check size={14} /> We&apos;ll email you when {platformId} is ready.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        style={{
          flex: 1,
          minWidth: 0,
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          background: C.bgDeep,
          color: C.text,
          fontSize: 13,
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = C.borderHi)}
        onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "9px 14px",
          borderRadius: 8,
          border: "none",
          background: C.aurora,
          color: "#022",
          fontSize: 13,
          fontWeight: 600,
          cursor: status === "loading" ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {status === "loading" ? (
          <Loader2 size={14} className="spin" />
        ) : (
          <Bell size={14} />
        )}
        Notify
      </button>
      {status === "error" && (
        <span style={{ fontSize: 12, color: "#ef4444" }}>{errorMessage}</span>
      )}
    </form>
  );
}

function PlatformCard({
  platform,
  highlighted,
}: {
  platform: Platform;
  highlighted: boolean;
}) {
  const { Icon } = platform;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      style={{
        position: "relative",
        padding: 24,
        borderRadius: 14,
        border: `1px solid ${highlighted ? C.borderHi : C.border}`,
        background: highlighted ? C.surfaceHi : C.surface,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {highlighted && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(var(--vyne-accent-rgb, 34, 211, 238), 0.12)",
            color: C.cyan,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Detected
        </span>
      )}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(var(--vyne-accent-rgb, 34, 211, 238), 0.08)",
          border: `1px solid ${C.border}`,
          color: C.cyan,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: C.text,
            letterSpacing: "-0.015em",
            margin: 0,
          }}
        >
          {platform.name}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: C.textSub,
            marginTop: 4,
            marginBottom: 0,
            letterSpacing: "-0.005em",
          }}
        >
          {platform.blurb}
        </p>
      </div>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            color: C.textMuted,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {platform.cta}
        </div>
        <NotifyForm platformId={platform.id} />
      </div>
    </motion.div>
  );
}

function PWACard() {
  const { status, install } = usePWAInstall();
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(status === "installed");

  useEffect(() => {
    if (status === "installed") setInstalled(true);
  }, [status]);

  async function onInstall() {
    setBusy(true);
    try {
      const outcome = await install();
      if (outcome === "accepted") setInstalled(true);
    } finally {
      setBusy(false);
    }
  }

  const installCtaLabel = installed
    ? "Installed — open the app"
    : status === "available"
      ? "Install desktop app"
      : status === "unsupported"
        ? "How to install"
        : "Preparing install…";

  const showInstallButton = status === "available" || installed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      style={{
        padding: 28,
        borderRadius: 16,
        border: `1px solid ${C.borderHi}`,
        background: C.aurora,
        color: "#022",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,34,34,0.12)",
          }}
        >
          {installed ? <Sparkles size={22} /> : <Globe size={22} />}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {installed ? "Installed on this device" : "Available now"}
          </div>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.015em",
            }}
          >
            {installed
              ? "You’re running VYNE as an app"
              : "Install VYNE as a desktop app"}
          </h3>
        </div>
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          margin: 0,
          opacity: 0.85,
          letterSpacing: "-0.005em",
        }}
      >
        {installed
          ? "VYNE is installed as a Progressive Web App on this device. Native macOS, Windows, Linux, iOS and Android builds are coming next."
          : status === "unsupported"
            ? "Your browser doesn’t expose a one-click installer. On iOS Safari, tap Share → Add to Home Screen. On Firefox/desktop Safari, use the address bar’s install icon. On Chrome/Edge, click ⋮ → Install VYNE."
            : "One click installs VYNE in its own window with a dock/taskbar icon, global ⌘K, push notifications, and the same dashboard you see in your browser today — no separate app to download."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {showInstallButton &&
          (installed ? (
            <Link
              href="/home"
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "#022",
                color: C.text,
                fontSize: 13.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "-0.005em",
              }}
            >
              {installCtaLabel} <ArrowRight size={15} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onInstall}
              disabled={busy} aria-busy={busy}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "#022",
                color: C.text,
                fontSize: 13.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "-0.005em",
                border: "none",
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Download size={15} />
              )}
              {busy ? "Opening installer…" : installCtaLabel}
            </button>
          ))}
        <Link
          href="/login"
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "rgba(2,34,34,0.12)",
            color: "#022",
            fontSize: 13.5,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.005em",
          }}
        >
          Open in browser <ArrowRight size={15} />
        </Link>
      </div>
      <p
        style={{
          fontSize: 11.5,
          margin: 0,
          opacity: 0.6,
          letterSpacing: "-0.005em",
        }}
      >
        {status === "pending" && "Checking install support…"}
        {status === "available" &&
          "Installs in 2 seconds. No App Store required."}
        {status === "unsupported" &&
          "Native installers are coming — see below to get notified."}
      </p>
    </motion.div>
  );
}

export default function DownloadPage() {
  const [detected, setDetected] = useState<string | null>(null);
  useEffect(() => {
    setDetected(detectPlatform());
  }, []);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "var(--font-display)",
      }}
    >
      <style>{`.spin { animation: vyne-spin 1s linear infinite; } @keyframes vyne-spin { to { transform: rotate(360deg); } }`}</style>

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
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
        <Link href="/landing">
          <VyneLogo variant="horizontal" markSize={28} />
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
          }}
        >
          Sign in
        </Link>
      </nav>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "88px 28px 48px",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 999,
              background: "rgba(var(--vyne-accent-rgb, 34, 211, 238), 0.08)",
              border: `1px solid ${C.border}`,
              color: C.cyan,
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Download size={12} /> Get VYNE
          </span>
          <h1
            style={{
              fontSize: "clamp(40px, 6vw, 64px)",
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "20px 0 16px",
              background: C.auroraText,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Download VYNE for desktop and mobile
          </h1>
          <p
            style={{
              fontSize: 17,
              color: C.textSub,
              maxWidth: 620,
              margin: "0 auto",
              lineHeight: 1.55,
              letterSpacing: "-0.005em",
            }}
          >
            Native desktop and mobile apps are in active build. Use VYNE in your
            browser today, or get an email the moment your platform&apos;s app
            ships.
          </p>
        </motion.div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 28px 48px",
        }}
      >
        <PWACard />
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "32px 28px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Desktop apps
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: C.textSub,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            One-click install with offline cache and global hotkeys. Coming soon
            — get notified.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {desktop.map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              highlighted={detected === p.id}
            />
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "32px 28px 96px",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Mobile apps
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: C.textSub,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Push notifications, biometric unlock, native chat and approvals.
            Beta access at launch.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {mobile.map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              highlighted={detected === p.id}
            />
          ))}
        </div>
      </section>

      <footer
        style={{
          padding: "32px 28px",
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0 }}>
          Looking for the API or self-host docs?{" "}
          <Link href="/developers" style={{ color: C.cyan }}>
            Visit Developers
          </Link>
        </p>
      </footer>
    </div>
  );
}
