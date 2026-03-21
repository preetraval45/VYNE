import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  label: string
  value: string
  icon: string
  trend?: string
  trendUp?: boolean
  color?: string
}

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp = true,
  color = '#6C47FF',
}: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Ionicons
            name={trendUp ? 'trending-up' : 'trending-down'}
            size={12}
            color={trendUp ? '#10B981' : '#EF4444'}
          />
          <Text style={[styles.trendText, { color: trendUp ? '#10B981' : '#EF4444' }]}>
            {trend}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    width: '47%',
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 3,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: '#6B6B8A',
    fontWeight: '500',
    marginBottom: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
})
