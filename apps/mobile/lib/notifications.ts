/**
 * Push notification setup for Vyne mobile.
 *
 * Flow:
 *  1. Request permissions on app launch (once per install)
 *  2. Get Expo push token
 *  3. Register token with Vyne backend → POST /api/notifications/register-device
 *  4. Set up foreground notification handler (badge / in-app toast)
 *
 * Backend routes this token to SNS → FCM (Android) / APNs (iOS).
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PUSH_TOKEN_KEY = '@vyne_push_token'

// Configure how notifications appear while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export type VyneNotificationPayload = {
  type: 'mention' | 'assignment' | 'alert' | 'incident' | 'daily_digest'
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Request permission and register the push token with the backend.
 * Safe to call on every app launch — it debounces using AsyncStorage.
 */
export async function registerForPushNotifications(
  apiToken: string | null,
  apiBaseUrl: string,
): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators don't support push tokens
    console.log('[Notifications] Skipping — not a physical device')
    return null
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission denied')
    return null
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Vyne Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C47FF',
    })
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Business Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#EF4444',
    })
  }

  // Get Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  )
  const pushToken = tokenData.data

  // Check if token changed since last registration
  const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
  if (stored === pushToken) {
    return pushToken // already registered
  }

  // Register with backend
  if (apiToken) {
    try {
      await fetch(`${apiBaseUrl}/api/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          token: pushToken,
          platform: Platform.OS,
          deviceName: Device.deviceName ?? 'Unknown Device',
        }),
      })
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken)
      console.log('[Notifications] Token registered:', pushToken.slice(0, 20) + '…')
    } catch (err) {
      console.warn('[Notifications] Failed to register token:', err)
    }
  }

  return pushToken
}

/**
 * Listen for notifications received while the app is in the foreground.
 * Returns an unsubscribe function.
 */
export function addForegroundListener(
  onNotification: (notification: Notifications.Notification) => void,
): () => void {
  const sub = Notifications.addNotificationReceivedListener(onNotification)
  return () => sub.remove()
}

/**
 * Listen for user tapping a notification (background or killed state).
 * Returns an unsubscribe function.
 */
export function addResponseListener(
  onResponse: (response: Notifications.NotificationResponse) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(onResponse)
  return () => sub.remove()
}

/** Clear all delivered notifications and reset badge count */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0)
  await Notifications.dismissAllNotificationsAsync()
}
