import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import StatCard from '@/components/StatCard'

const ACTIVITY = [
  {
    id: '1',
    initials: 'SK',
    name: 'Sarah Kim',
    action: 'resolved ENG-43 · Secrets Manager IAM',
    time: '2m ago',
    color: '#6C47FF',
  },
  {
    id: '2',
    initials: 'TM',
    name: 'Tony Mack',
    action: 'opened PR #218 · LangGraph streaming fix',
    time: '14m ago',
    color: '#00C9A7',
  },
  {
    id: '3',
    initials: 'AR',
    name: 'Alex Rao',
    action: 'commented on ENG-45 · review notes added',
    time: '41m ago',
    color: '#FF6B6B',
  },
  {
    id: '4',
    initials: 'PR',
    name: 'Preet Raval',
    action: 'updated milestone · Q1 infra complete',
    time: '1h ago',
    color: '#F59E0B',
  },
]

const FOCUS_ITEMS = [
  { id: '1', text: 'Review LangGraph PR #218', done: true },
  { id: '2', text: 'Merge TimescaleDB migration script', done: false },
  { id: '3', text: 'Sync with Sarah on incident post-mortem', done: false },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function HomeScreen() {
  const [focusItems, setFocusItems] = useState(FOCUS_ITEMS)

  const toggleFocus = (id: string) => {
    setFocusItems(prev =>
      prev.map(item => (item.id === id ? { ...item, done: !item.done } : item))
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, Preet 👋</Text>
            <Text style={styles.dateText}>{getTodayDate()}</Text>
          </View>
          <View style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            <View style={styles.notifDot} />
          </View>
        </View>

        {/* AI Alert Card */}
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View style={styles.alertBadge}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.alertBadgeText}>AI ALERT</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.alertTitle}>Secrets Manager IAM — Resolved</Text>
          <Text style={styles.alertBody}>
            ENG-43 was auto-triaged and resolved by AI in 4m 22s. Root cause: missing IAM policy
            binding in staging. Production unaffected.
          </Text>
          <View style={styles.alertFooter}>
            <TouchableOpacity style={styles.alertButton}>
              <Text style={styles.alertButtonText}>View incident</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.alertTime}>Resolved 2m ago</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Active Issues"
            value="42"
            icon="warning"
            trend="+3"
            trendUp={false}
            color="#6C47FF"
          />
          <StatCard
            label="Messages"
            value="284"
            icon="chatbubbles"
            trend="+18"
            trendUp={true}
            color="#00C9A7"
          />
          <StatCard
            label="Open Orders"
            value="156"
            icon="cube"
            trend="-5"
            trendUp={true}
            color="#F59E0B"
          />
          <StatCard
            label="System Health"
            value="4/5"
            icon="pulse"
            trend="99.8%"
            trendUp={true}
            color="#10B981"
          />
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          {ACTIVITY.map((item, index) => (
            <View key={item.id}>
              <View style={styles.activityRow}>
                <View style={[styles.activityAvatar, { backgroundColor: item.color }]}>
                  <Text style={styles.activityAvatarText}>{item.initials}</Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>{item.name}</Text>
                  <Text style={styles.activityAction} numberOfLines={1}>
                    {item.action}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
              {index < ACTIVITY.length - 1 && <View style={styles.activityDivider} />}
            </View>
          ))}
        </View>

        {/* My Focus Today */}
        <Text style={styles.sectionTitle}>My Focus Today</Text>
        <View style={styles.focusCard}>
          {focusItems.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.focusRow}
                onPress={() => toggleFocus(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                  {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.focusText, item.done && styles.focusTextDone]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
              {index < focusItems.length - 1 && <View style={styles.focusDivider} />}
            </View>
          ))}
          <TouchableOpacity style={styles.addFocusButton}>
            <Ionicons name="add" size={16} color="#6C47FF" />
            <Text style={styles.addFocusText}>Add item</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  topBar: {
    backgroundColor: '#1C1C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  dateText: {
    fontSize: 13,
    color: '#8888AA',
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    borderWidth: 1.5,
    borderColor: '#1C1C2E',
  },
  alertCard: {
    marginHorizontal: 16,
    marginTop: -2,
    marginBottom: 20,
    backgroundColor: '#6C47FF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ADE80',
    letterSpacing: 0.6,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  alertBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    marginBottom: 14,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  alertButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  alertTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C2E',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 4,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    marginBottom: 2,
  },
  activityAction: {
    fontSize: 12,
    color: '#6B6B8A',
  },
  activityTime: {
    fontSize: 11,
    color: '#9B9BB4',
    marginLeft: 8,
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  focusCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 4,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#D0D0E8',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  focusText: {
    fontSize: 14,
    color: '#1C1C2E',
    flex: 1,
  },
  focusTextDone: {
    color: '#9B9BB4',
    textDecorationLine: 'line-through',
  },
  focusDivider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  addFocusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  addFocusText: {
    fontSize: 13,
    color: '#6C47FF',
    fontWeight: '600',
  },
})
