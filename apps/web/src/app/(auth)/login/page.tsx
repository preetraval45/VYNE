"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  FolderKanban,
  FileText,
  Package,
  BarChart3,
  Bot,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";
import { VyneLogo } from "@/components/brand/VyneLogo";

const PREVIEW_MODULES = [
  { icon: MessageSquare, label: "Messaging", color: "#6C47FF" },
  { icon: FolderKanban, label: "Projects", color: "#3B82F6" },
  { icon: FileText, label: "Docs", color: "#22C55E" },
  { icon: Package, label: "ERP", color: "#F59E0B" },
  { icon: BarChart3, label: "Finance", color: "#EF4444" },
  { icon: Bot, label: "AI Agents", color: "#8B6BFF" },
];

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

  function enterDemo() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push("/home");
    } catch {
      enterDemo();
    }
  }

  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        background:
          "linear-gradient(135deg, #0A0A1A 0%, #15152A 50%, #0A0A1A 100%)",
      }}
    >
      {/* ─── Left: Login Form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #6C47FF 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Logo + Heading */}
          <div className="flex flex-col items-center mb-10">
            <Link href="/" className="mb-5">
              <VyneLogo variant="stacked" markSize={52} className="text-white" />
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p
              className="text-sm mt-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
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
              WebkitBackdropFilter: "blur(20px)",
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
                  style={{ color: "rgba(255,255,255,0.7)" }}
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
                    "w-full px-4 py-3 rounded-lg text-sm text-white",
                    "placeholder:text-[#4A4A6A]",
                    "focus:outline-none transition-all duration-150",
                  )}
                  style={{
                    background: "rgba(255,255,255,0.05)",
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs transition-colors hover:underline"
                    style={{ color: "#8B6BFF" }}
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
                      "w-full px-4 py-3 pr-11 rounded-lg text-sm text-white",
                      "placeholder:text-[#4A4A6A]",
                      "focus:outline-none transition-all duration-150",
                    )}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid #6C47FF";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(108,71,255,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border =
                        "1px solid rgba(255,255,255,0.1)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                    style={{ color: "#6B6B8A" }}
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
                  "w-full py-3 rounded-lg text-sm font-semibold text-white",
                  "flex items-center justify-center gap-2",
                  "transition-all duration-150 mt-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "hover:scale-[1.01] active:scale-[0.99]",
                )}
                style={{
                  background: isLoading
                    ? "#5235CC"
                    : "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                  boxShadow: isLoading
                    ? "none"
                    : "0 8px 24px rgba(108,71,255,0.4)",
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div
                className="h-px flex-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                OR
              </span>
              <div
                className="h-px flex-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            </div>

            {/* Demo button */}
            <button
              type="button"
              onClick={enterDemo}
              className={cn(
                "w-full py-3 rounded-lg text-sm font-semibold",
                "flex items-center justify-center gap-2",
                "transition-all duration-150",
                "hover:scale-[1.01] active:scale-[0.99]",
              )}
              style={{
                background: "rgba(108,71,255,0.08)",
                border: "1px solid rgba(108,71,255,0.3)",
                color: "#B8A3FF",
              }}
            >
              <Sparkles size={15} />
              Try Instant Demo
            </button>
          </div>

          {/* Sign up link */}
          <p
            className="text-center text-sm mt-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium transition-colors hover:underline"
              style={{ color: "#B8A3FF" }}
            >
              Create workspace
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ─── Right: Feature Preview Panel (desktop only) ────────────── */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(108,71,255,0.2) 0%, transparent 50%), linear-gradient(135deg, #15152A 0%, #0F0F20 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(108,71,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(108,71,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 80%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="relative z-10 max-w-md"
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{
              background: "rgba(108,71,255,0.1)",
              border: "1px solid rgba(108,71,255,0.25)",
            }}
          >
            <Zap size={12} style={{ color: "#8B6BFF" }} />
            <span
              className="text-xs font-semibold tracking-wide"
              style={{ color: "#B8A3FF" }}
            >
              AI-Native Company OS
            </span>
          </div>

          <h2
            className="text-4xl font-bold text-white leading-tight tracking-tight mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            One workspace.
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #6C47FF, #8B6BFF, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Every tool replaced.
            </span>
          </h2>

          <p
            className="text-base leading-relaxed mb-8"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            VYNE replaces Slack, Jira, Notion, QuickBooks, and Salesforce with
            one AI-powered platform. Chat, projects, docs, ERP, and finance —
            all connected by intelligence.
          </p>

          {/* Module tiles */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {PREVIEW_MODULES.map((mod) => (
              <motion.div
                key={mod.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.2 + PREVIEW_MODULES.indexOf(mod) * 0.05,
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${mod.color}20` }}
                >
                  <mod.icon size={18} style={{ color: mod.color }} />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {mod.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Stat strip */}
          <div
            className="flex items-center gap-6 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { value: "200+", label: "On waitlist" },
              { value: "15+", label: "Modules" },
              { value: "6", label: "Tools replaced" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {stat.value}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
