'use client'

import { useEffect } from 'react'
import { useTheme } from '@/lib/stores/ui'

export function ThemeApplier() {
  const theme = useTheme()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return null
}
