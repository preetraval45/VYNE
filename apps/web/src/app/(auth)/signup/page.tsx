'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth'
import { cn } from '@/lib/utils'
import { VyneLogo } from '@/components/brand/VyneLogo'

export default function SignupPage() {
  const router = useRouter()
  const { signup, isLoading, error, clearError } = useAuthStore()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearError()
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await signup(form)
      router.push('/onboarding')
    } catch {
      // error is set in the store
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    outline: 'none',
  }

  const baseInputClass = cn(
    'auth-input w-full px-3.5 py-2.5 rounded-lg text-sm text-white',
    'placeholder:text-[#4A4A6A] transition-all duration-150'
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #07061A 0%, #0D0B24 50%, #07061A 100%)',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        aria-hidden="true"
        className="aurora-halo aurora-drift"
        style={{ width: 640, height: 640, top: '15%', left: '50%', transform: 'translateX(-50%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 grid-bg pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <VyneLogo variant="stacked" markSize={44} className="auth-logo text-white mb-1" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Create your workspace</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A0B8' }}>
            Get started with VYNE in seconds
          </p>
        </div>

        {/* Card — glass */}
        <div className="glass-panel" style={{ padding: 32 }}>
          {error && (
            <motion.div
              key={error}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="shake-on-error mb-5 px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#F87171',
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A0A0B8' }}>
                Full name
              </label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Alex Johnson"
                required
                autoFocus
                className={baseInputClass}
                style={inputStyle}
              />
            </div>

            {/* Workspace name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A0A0B8' }}>
                Workspace name
              </label>
              <input
                name="orgName"
                type="text"
                value={form.orgName}
                onChange={handleChange}
                placeholder="Acme Inc."
                required
                className={baseInputClass}
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A0A0B8' }}>
                Work email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className={baseInputClass}
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#A0A0B8' }}>
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={cn(baseInputClass, 'pr-10')}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#4A4A6A' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !form.email || !form.password || !form.name || !form.orgName}
              className={cn(
                'btn-aurora w-full mt-2',
                'flex items-center justify-center gap-2',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
              style={{ padding: '11px 18px', fontSize: 14 }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating workspace…
                </>
              ) : (
                'Create workspace'
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: '#6B6B8A' }}>
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline" style={{ color: '#8B6BFF' }}>
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline" style={{ color: '#8B6BFF' }}>
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Trust bullets — teal accent */}
        <ul className="mt-6 space-y-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {[
            'Free forever — no credit card required',
            'All 15+ modules included from day one',
            'Your data, your tenant — SOC 2 in progress',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs">
              <span style={{
                width: 18, height: 18, borderRadius: 999,
                background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Check size={11} color="#22D3EE" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Sign in link */}
        <p className="text-center text-sm mt-6" style={{ color: '#6B6B8A' }}>
          Already have a workspace?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#67E8F9' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
