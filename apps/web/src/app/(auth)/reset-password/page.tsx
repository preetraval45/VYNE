"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Password must contain a number";
    if (!/[^A-Za-z0-9]/.test(pw))
      return "Password must contain a special character";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setValidationError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    // Validate password strength
    const pwError = validatePassword(password);
    if (pwError) {
      setValidationError(pwError);
      return;
    }

    if (!token) {
      setValidationError(
        "Reset token is missing. Please use the link from your email.",
      );
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      // error is set in the store
    }
  }

  const displayError = validationError || error;

  // No token in URL
  if (!token) {
    return (
      <div className="flex flex-col items-center py-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <AlertCircle size={28} style={{ color: "#F87171" }} />
        </div>
        <p
          className="text-sm text-center mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          Invalid or missing reset link. Please request a new password reset.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--vyne-accent-light, #22D3EE)" }}
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center py-4"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          <CheckCircle size={28} style={{ color: "#22C55E" }} />
        </div>
        <p className="text-base font-medium text-white mb-2">Password reset!</p>
        <p
          className="text-sm text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          Redirecting to login...
        </p>
        <div className="mt-4">
          <Loader2
            size={18}
            className="animate-spin"
            style={{ color: "var(--vyne-accent, #06B6D4)" }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {displayError && (
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
          {displayError}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
                setValidationError(null);
              }}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              autoFocus
              required
              minLength={8}
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
                e.target.style.border = "1px solid #06B6D4";
                e.target.style.boxShadow = "0 0 0 3px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)";
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
          {/* Password requirements */}
          <div className="mt-2 space-y-1">
            {[
              { label: "At least 8 characters", valid: password.length >= 8 },
              { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
              { label: "Lowercase letter", valid: /[a-z]/.test(password) },
              { label: "Number", valid: /[0-9]/.test(password) },
              {
                label: "Special character",
                valid: /[^A-Za-z0-9]/.test(password),
              },
            ].map((req) => (
              <p
                key={req.label}
                className="text-xs flex items-center gap-1.5"
                style={{
                  color: password
                    ? req.valid
                      ? "#22C55E"
                      : "var(--text-secondary)"
                    : "#4A4A6A",
                }}
              >
                <span
                  className="w-1 h-1 rounded-full inline-block"
                  style={{
                    background: password
                      ? req.valid
                        ? "#22C55E"
                        : "var(--text-secondary)"
                      : "#4A4A6A",
                  }}
                />
                {req.label}
              </p>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError();
                setValidationError(null);
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              className={cn(
                "w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white",
                "placeholder:text-[#4A4A6A]",
                "focus:outline-none transition-all duration-150",
              )}
              style={{
                background: "rgba(255,255,255,0.06)",
                border:
                  confirmPassword && password !== confirmPassword
                    ? "1px solid rgba(239, 68, 68, 0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid #06B6D4";
                e.target.style.boxShadow = "0 0 0 3px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.border =
                  confirmPassword && password !== confirmPassword
                    ? "1px solid rgba(239, 68, 68, 0.5)"
                    : "1px solid rgba(255,255,255,0.1)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#4A4A6A" }}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs mt-1.5" style={{ color: "#F87171" }}>
              Passwords do not match
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword}
          className={cn(
            "w-full py-2.5 rounded-lg text-sm font-semibold text-white",
            "flex items-center justify-center gap-2",
            "transition-all duration-150 mt-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{
            background: isLoading
              ? "#5235CC"
              : "linear-gradient(135deg, var(--vyne-accent, #06B6D4) 0%, var(--vyne-accent-light, #22D3EE) 100%)",
            boxShadow: isLoading ? "none" : "0 4px 14px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.35)",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #0F0F1E 0%, var(--text-primary) 50%, #0F0F1E 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
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
              background: "linear-gradient(135deg, var(--vyne-accent, #06B6D4) 0%, var(--vyne-accent-light, #22D3EE) 100%)",
            }}
          >
            <span className="text-white font-bold text-xl tracking-tight">
              V
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Set new password
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Choose a strong password for your account
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
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{ color: "var(--vyne-accent, #06B6D4)" }}
                />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Back to login */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium transition-colors"
            style={{ color: "var(--vyne-accent-light, #22D3EE)" }}
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
