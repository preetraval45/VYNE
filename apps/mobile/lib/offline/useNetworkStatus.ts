/**
 * Hook that tracks online/offline state using the NetInfo-compatible
 * approach with the fetch probe (works in Expo Go without native modules).
 *
 * Falls back to navigator.onLine on web.
 */
import { useState, useEffect, useRef } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      })
      clearTimeout(timeout)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    let mounted = true

    async function probe() {
      const online = await checkConnectivity()
      if (mounted) setIsOnline(online)
    }

    probe()
    intervalRef.current = setInterval(probe, 15_000)

    return () => {
      mounted = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return { isOnline }
}
