'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import LandingPage from './(marketing)/landing/page'

export default function RootPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) {
      router.replace('/home')
    }
  }, [user, router])

  if (user) return null

  return <LandingPage />
}
