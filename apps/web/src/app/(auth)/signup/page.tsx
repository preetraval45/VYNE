'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0F0F1E 0%, #1A1A2E 50%, #0F0F1E 100%)' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6C47FF 0%, transparent 70%)' }}
        />
      </div>

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

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
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
                'w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2',
                'flex items-center justify-center gap-2',
                'transition-all duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{
                background: isLoading
                  ? '#5235CC'
                  : 'linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)',
                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(108,71,255,0.35)',
              }}
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

        {/* Sign in link */}
        <p className="text-center text-sm mt-6" style={{ color: '#6B6B8A' }}>
          Already have a workspace?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#8B6BFF' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
