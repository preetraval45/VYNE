"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// PH-H — Cookie banner with 4 tiers (strictly necessary always on,
// functional / analytics / marketing opt-in). Persists decisions to
// localStorage + POSTs to /api/consent so we have a tamper-evident
// audit trail per GDPR Art. 7(1).
//
// Defaults to "reject non-essential" when the browser sends DNT: 1.
//
// Reopen anytime by calling window.openCookieBanner() (set up by this
// component on mount), or by clicking "Cookie preferences" in the
// footer.

type Category = "strictly_necessary" | "functional" | "analytics" | "marketing";

interface Decisions {
  strictly_necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "vyne-consent-v1";
const VISITOR_ID_KEY = "vyne-visitor-id";

function makeVisitorId(): string {
  // 16 random bytes → hex. Long-lived first-party; not joined to any
  // tracker. Used to stitch pre-signup consents to a post-signup user.
  const buf = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = makeVisitorId();
    try {
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    } catch {
      /* localStorage blocked — fall back to per-session id */
    }
  }
  return id;
}

function readSavedDecisions(): Decisions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Decisions>;
    return {
      strictly_necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

function persist(
  decisions: Decisions,
  source: "banner" | "settings" = "banner",
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    /* private mode / quota — skip silently */
  }
  // POST to the audit endpoint. Best-effort; banner still works offline.
  void fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      decisions,
      visitorId: getOrCreateVisitorId(),
      source,
    }),
  }).catch(() => undefined);
}

function dntOn(): boolean {
  if (typeof navigator === "undefined") return false;
  const navAny = navigator as unknown as {
    doNotTrack?: string;
    msDoNotTrack?: string;
  };
  return (
    navAny.doNotTrack === "1" ||
    navAny.msDoNotTrack === "1" ||
    (typeof window !== "undefined" &&
      (window as unknown as { doNotTrack?: string }).doNotTrack === "1")
  );
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [decisions, setDecisions] = useState<Decisions>({
    strictly_necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Don't render server-side; let the client decide on mount.
    const saved = readSavedDecisions();
    if (saved) {
      setDecisions(saved);
      setOpen(false);
    } else {
      // Default to "reject non-essential" when DNT is on.
      if (dntOn()) {
        setDecisions((d) => ({ ...d, analytics: false, marketing: false }));
      }
      setOpen(true);
    }

    // Expose a global handle so the footer "Cookie preferences" link
    // can reopen the banner.
    (window as unknown as { openCookieBanner?: () => void }).openCookieBanner =
      () => {
        setOpen(true);
        setExpanded(true);
      };
    return () => {
      delete (window as unknown as { openCookieBanner?: () => void })
        .openCookieBanner;
    };
  }, []);

  const toggle = (key: Category) => {
    if (key === "strictly_necessary") return; // always on
    setDecisions((d) => ({ ...d, [key]: !d[key] }));
  };

  const acceptAll = () => {
    const all: Decisions = {
      strictly_necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setDecisions(all);
    persist(all, expanded ? "settings" : "banner");
    setOpen(false);
  };

  const rejectNonEssential = () => {
    const min: Decisions = {
      strictly_necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setDecisions(min);
    persist(min, "banner");
    setOpen(false);
  };

  const save = () => {
    persist(decisions, expanded ? "settings" : "banner");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 560,
        marginLeft: "auto",
        marginRight: "auto",
        background: "rgba(15,15,32,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "20px 22px",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        lineHeight: 1.6,
        zIndex: 9999,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      <h2
        id="cookie-banner-title"
        style={{
          margin: "0 0 6px",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        Cookies on VYNE
      </h2>
      <p
        id="cookie-banner-body"
        style={{
          margin: "0 0 14px",
          fontSize: 13,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        Strictly necessary cookies keep you signed in. Choose what else we may
        set. See our{" "}
        <Link
          href="/cookie-policy"
          style={{ color: "var(--vyne-accent-light, #67E8F9)" }}
        >
          Cookie Policy
        </Link>{" "}
        for the full list.
      </p>

      {expanded ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {(
            [
              [
                "strictly_necessary",
                "Strictly necessary",
                "Sign-in, CSRF, your consent preference.",
              ],
              ["functional", "Functional", "Theme, sidebar state, language."],
              [
                "analytics",
                "Analytics",
                "Anonymous product analytics. No cross-site tracking.",
              ],
              [
                "marketing",
                "Marketing",
                "Not used today; reserved for the future.",
              ],
            ] as [Category, string, string][]
          ).map(([key, label, hint]) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                cursor:
                  key === "strictly_necessary" ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={decisions[key]}
                onChange={() => toggle(key)}
                disabled={key === "strictly_necessary"}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {hint}
                </div>
              </div>
            </label>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Manage preferences
          </button>
        ) : (
          <button
            type="button"
            onClick={save}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save preferences
          </button>
        )}
        <button
          type="button"
          onClick={rejectNonEssential}
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={acceptAll}
          style={{
            background:
              "linear-gradient(135deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
