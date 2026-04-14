import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { OfflineBanner } from '@/components/OfflineBanner'
import { parseDeepLink } from '@/lib/deepLinks'

const TAB_ROUTE_MAP: Record<string, string> = {
  chat: '/(tabs)/chat',
  projects: '/(tabs)/projects',
  finance: '/(tabs)/finance',
  erp: '/(tabs)/erp',
  index: '/(tabs)/',
}

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    // Handle links when app is already open
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDeepLink(url)
      if (!parsed?.tab) return
      const route = TAB_ROUTE_MAP[parsed.tab]
      if (route) {
        const query = new URLSearchParams(parsed.params).toString()
        router.push((query ? `${route}?${query}` : route) as never)
      }
    })

    // Handle initial URL (app opened via link while closed)
    Linking.getInitialURL().then((url) => {
      if (!url) return
      const parsed = parseDeepLink(url)
      if (!parsed?.tab) return
      const route = TAB_ROUTE_MAP[parsed.tab]
      if (route) {
        const query = new URLSearchParams(parsed.params).toString()
        router.push((query ? `${route}?${query}` : route) as never)
      }
    })

    return () => sub.remove()
  }, [router])

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  )
}
