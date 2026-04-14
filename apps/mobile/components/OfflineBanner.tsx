import React from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNetworkStatus } from '@/lib/offline/useNetworkStatus'

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>You're offline · Changes will sync when reconnected</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1C1C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 7,
  },
  text: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
})
