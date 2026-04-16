"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { VyneLogo } from "@/components/brand/VyneLogo";

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      // error is set in the store
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #0F0F1E 0%, #1A1A2E 50%, #0F0F1E 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #6C47FF 0%, transparent 70%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <VyneLogo variant="stacked" markSize={48} className="text-white mb-1" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {sent ? "Check your email" : "Reset your password"}
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "#A0A0B8" }}>
            {sent
              ? "We sent a password reset link to your email"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center py-4"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{
                  background: "rgba(108, 71, 255, 0.15)",
                  border: "1px solid rgba(108, 71, 255, 0.3)",
                }}
              >
                <Mail size={28} style={{ color: "#8B6BFF" }} />
              </div>
              <p
                className="text-sm text-center mb-1"
                style={{ color: "#A0A0B8" }}
              >
                We sent a reset link to
              </p>
              <p className="text-sm font-medium text-white mb-6">{email}</p>
              <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => {
                    setSent(false);
                    clearError();
                  }}
                  className="font-medium underline transition-colors"
                  style={{ color: "#8B6BFF" }}
                >
                  try again
                </button>
              </p>
            </motion.div>
          ) : (
            <>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 px-4 py-3 rounded-lg text-sm"
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#F87171",
                  }}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#A0A0B8" }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                    required
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-lg text-sm text-white",
                      "placeholder:text-[#4A4A6A]",
                      "focus:outline-none transition-all duration-150",
                    )}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid #6C47FF";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(108,71,255,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className={cn(
                    "w-full py-2.5 rounded-lg text-sm font-semibold text-white",
                    "flex items-center justify-center gap-2",
                    "transition-all duration-150 mt-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  style={{
                    background: isLoading
                      ? "#5235CC"
                      : "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                    boxShadow: isLoading
                      ? "none"
                      : "0 4px 14px rgba(108,71,255,0.35)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm mt-6 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
