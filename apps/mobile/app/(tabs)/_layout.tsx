import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import {
  registerForPushNotifications,
  addForegroundListener,
  addResponseListener,
} from '@/lib/notifications'
import { parseDeepLink } from '@/lib/deepLinks'
import { env } from '@/lib/env'

const TAB_ROUTE_MAP: Record<string, string> = {
  chat: '/(tabs)/chat',
  projects: '/(tabs)/projects',
  finance: '/(tabs)/finance',
  erp: '/(tabs)/erp',
  index: '/(tabs)/',
}

// ─── Tab icon components (defined outside to avoid S6478) ────────

function IconHome({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="home" size={22} color={color} />
}
function IconChat({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="chatbubbles" size={22} color={color} />
}
function IconProjects({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="layers" size={22} color={color} />
}
function IconFinance({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="bar-chart" size={22} color={color} />
}
function IconInventory({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="cube" size={22} color={color} />
}
function IconProfile({ color }: Readonly<{ color: string }>) {
  return <Ionicons name="person" size={22} color={color} />
}

// ─── Layout ──────────────────────────────────────────────────────

export default function TabsLayout() {
  const { token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    registerForPushNotifications(token, env.API_URL ?? 'http://localhost:1040')

    const unsubForeground = addForegroundListener((notification) => {
      console.log('[Push] Foreground:', notification.request.content.title)
    })

    const unsubResponse = addResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined
      const deepLink = data?.deepLink
      if (deepLink) {
        const parsed = parseDeepLink(deepLink)
        if (parsed?.tab) {
          const route = TAB_ROUTE_MAP[parsed.tab]
          if (route) router.push(route as never)
        }
      }
    })

    return () => {
      unsubForeground()
      unsubResponse()
    }
  }, [token, router])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#6B6B8A',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E8E8F0',
          height: 84,
          paddingBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: '#1C1C2E' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',      tabBarIcon: IconHome      }} />
      <Tabs.Screen name="chat"     options={{ title: 'Chat',      tabBarIcon: IconChat      }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects',  tabBarIcon: IconProjects  }} />
      <Tabs.Screen name="finance"  options={{ title: 'Finance',   tabBarIcon: IconFinance   }} />
      <Tabs.Screen name="erp"      options={{ title: 'Inventory', tabBarIcon: IconInventory }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',   tabBarIcon: IconProfile   }} />
    </Tabs>
  )
}
