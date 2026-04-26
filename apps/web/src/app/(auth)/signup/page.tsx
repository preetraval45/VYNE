"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Check, ArrowRight, Lock, Sparkles } from "lucide-react";
import { VyneLogo } from "@/components/brand/VyneLogo";

// VYNE is in closed beta — backend signup is not yet provisioned.
// Until the api-gateway lands, this route surfaces a waitlist + demo
// path so real visitors get a useful destination instead of a form
// that 404s. Re-enable the full signup form by checking out the
// previous git revision when the gateway is live.

export default function SignupPage() {
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
        body: JSON.stringify({ email, source: "signup-page" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || "Could not save your email — please try again",
        );
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #07061A 0%, #0D0B24 50%, #07061A 100%)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        aria-hidden="true"
        className="aurora-halo aurora-drift"
        style={{
          width: 640,
          height: 640,
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 grid-bg pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <VyneLogo
            variant="stacked"
            markSize={44}
            className="auth-logo text-white mb-3"
          />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(34,211,238,0.1)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#67E8F9",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Lock size={11} /> Closed beta
          </span>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-3 text-center">
            Join the VYNE waitlist
          </h1>
          <p
            className="text-sm mt-1.5 text-center"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            New workspaces are opening in waves. Drop your email — we’ll invite
            you the moment your slot is ready.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 28 }}>
          {status === "success" ? (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#86EFAC",
                fontSize: 13.5,
              }}
            >
              <Check size={16} />
              You’re on the list. We’ll email <strong>
                {email || "you"}
              </strong>{" "}
              from <code>noreply@vyne.dev</code>.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <label
                className="block text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className="auth-input w-full px-3.5 py-2.5 rounded-lg text-sm text-white"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={status === "loading" || !email}
                className="btn-aurora w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ padding: "11px 18px", fontSize: 14, marginTop: 6 }}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    Join waitlist <ArrowRight size={15} />
                  </>
                )}
              </button>
              {status === "error" && (
                <p style={{ fontSize: 12, color: "#F87171", marginTop: 6 }}>
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </div>

        <div
          className="mt-5 rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(108,71,255,0.08)",
            border: "1px solid rgba(108,71,255,0.25)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(108,71,255,0.15)",
              border: "1px solid rgba(108,71,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={15} color="#A48BFF" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              Don’t want to wait? Try the full demo now.
            </div>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              The demo is the same product — every module loaded with realistic
              data. No card, no signup, just click through.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                padding: "7px 14px",
                borderRadius: 8,
                background: "#A48BFF",
                color: "#0E0826",
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Try the live demo <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <ul
          className="mt-6 space-y-2"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {[
            "Real-time chat, projects, docs, ERP, finance — one workspace",
            "AI correlates business and infra events automatically",
            "Your data, your tenant — SOC 2 in progress",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs">
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "rgba(6,182,212,0.15)",
                  border: "1px solid rgba(6,182,212,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={11} color="#22D3EE" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p
          className="text-center text-sm mt-6"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Already have a workspace?{" "}
          <Link
            href="/login"
            className="font-medium"
            style={{ color: "#67E8F9" }}
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
