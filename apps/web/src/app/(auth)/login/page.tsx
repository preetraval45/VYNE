"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const {
    login,
    setUser,
    setToken,
    setRefreshToken,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push("/home");
    } catch {
      // Demo mode — auto-login when backend is unavailable
      setUser({
        id: "demo",
        name: "Preet Raval",
        email: email || "preet@vyne.ai",
        role: "owner",
        orgId: "demo-org",
        createdAt: new Date().toISOString(),
      });
      setToken("demo-token");
      setRefreshToken("demo-refresh-token");
      router.push("/home");
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
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
            }}
          >
            <span className="text-white font-bold text-xl tracking-tight">
              V
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Sign in to your VYNE workspace
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
                style={{ color: "var(--text-tertiary)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
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
                  e.target.style.boxShadow = "0 0 0 3px rgba(108,71,255,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: "var(--vyne-purple)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    "w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white",
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#4A4A6A" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
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
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: "#4A4A6A" }}>
            No backend? Just click{" "}
            <strong style={{ color: "var(--vyne-purple)" }}>Sign in</strong> to
            enter demo mode.
          </p>
        </div>

        {/* Sign up link */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium transition-colors"
            style={{ color: "var(--vyne-purple-light)" }}
          >
            Create workspace
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
