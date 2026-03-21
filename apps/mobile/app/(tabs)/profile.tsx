import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

type SettingRowProps = {
  icon: string
  iconBg: string
  label: string
  value?: string
  onPress?: () => void
  destructive?: boolean
  showToggle?: boolean
  toggleValue?: boolean
  onToggle?: (val: boolean) => void
}

function SettingRow({
  icon,
  iconBg,
  label,
  value,
  onPress,
  destructive = false,
  showToggle = false,
  toggleValue = false,
  onToggle,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !showToggle}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={16} color="#fff" />
      </View>
      <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
        {label}
      </Text>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#E8E8F0', true: '#6C47FF' }}
          thumbColor="#fff"
          ios_backgroundColor="#E8E8F0"
        />
      ) : (
        <View style={styles.settingRight}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {!destructive && <Ionicons name="chevron-forward" size={16} color="#C4C4D4" />}
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [aiAlerts, setAiAlerts] = useState(true)

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Vyne?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>PR</Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.userName}>Preet Raval</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#6C47FF" />
            <Text style={styles.roleText}>Admin</Text>
          </View>
          <Text style={styles.userEmail}>preet@vyne.ai</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>47</Text>
              <Text style={styles.statLabel}>Issues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>284</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        </View>

        {/* Workspace */}
        <View style={styles.workspaceCard}>
          <View style={styles.workspaceIcon}>
            <View style={styles.wsLogo}>
              <View style={styles.wsLogoInner} />
            </View>
          </View>
          <View style={styles.workspaceInfo}>
            <Text style={styles.workspaceName}>Vyne HQ</Text>
            <Text style={styles.workspacePlan}>Pro Plan · 8 members</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn}>
            <Text style={styles.switchBtnText}>Switch</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon="person-outline"
            iconBg="#6C47FF"
            label="Edit profile"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="mail-outline"
            iconBg="#3B82F6"
            label="Email address"
            value="preet@vyne.ai"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="lock-closed-outline"
            iconBg="#8B5CF6"
            label="Change password"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="key-outline"
            iconBg="#F59E0B"
            label="Two-factor auth"
            value="Enabled"
            onPress={() => {}}
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon="notifications-outline"
            iconBg="#10B981"
            label="Push notifications"
            showToggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="flash-outline"
            iconBg="#EF4444"
            label="AI alerts"
            showToggle
            toggleValue={aiAlerts}
            onToggle={setAiAlerts}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="mail-unread-outline"
            iconBg="#6C47FF"
            label="Email digest"
            value="Weekly"
            onPress={() => {}}
          />
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon="moon-outline"
            iconBg="#3D3D5C"
            label="Dark mode"
            showToggle
            toggleValue={darkMode}
            onToggle={setDarkMode}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="text-outline"
            iconBg="#6B6B8A"
            label="Text size"
            value="Medium"
            onPress={() => {}}
          />
        </View>

        {/* Help */}
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon="help-circle-outline"
            iconBg="#00C9A7"
            label="Help center"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            iconBg="#6C47FF"
            label="Contact support"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="star-outline"
            iconBg="#F59E0B"
            label="Rate Vyne"
            onPress={() => {}}
          />
          <View style={styles.settingDivider} />
          <SettingRow
            icon="information-circle-outline"
            iconBg="#6B6B8A"
            label="App version"
            value="0.1.0"
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Vyne · v0.1.0 · Made with care by Preet</Text>

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
  header: {
    backgroundColor: '#1C1C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -2,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ADE80',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C47FF',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B6B8A',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F8',
    paddingTop: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#9B9BB4',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E8E8F0',
  },
  workspaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  workspaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wsLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsLogoInner: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
  workspaceInfo: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C2E',
    marginBottom: 2,
  },
  workspacePlan: {
    fontSize: 12,
    color: '#6B6B8A',
  },
  switchBtn: {
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C47FF',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6B8A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C2E',
    fontWeight: '500',
  },
  settingLabelDestructive: {
    color: '#EF4444',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13,
    color: '#9B9BB4',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    height: 54,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  footer: {
    fontSize: 12,
    color: '#C4C4D4',
    textAlign: 'center',
    marginTop: 20,
  },
})
