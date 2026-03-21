import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Priority = 'urgent' | 'high' | 'medium' | 'low'
type Status = 'todo' | 'in_progress' | 'in_review' | 'done'

type Issue = {
  id: string
  key: string
  title: string
  project: string
  projectColor: string
  priority: Priority
  status: Status
  assignee: string
  assigneeColor: string
  updatedAt: string
}

const ISSUES: Issue[] = [
  {
    id: '1',
    key: 'ENG-43',
    title: 'Fix Secrets Manager IAM policy binding in staging',
    project: 'Engineering',
    projectColor: '#6C47FF',
    priority: 'urgent',
    status: 'done',
    assignee: 'SK',
    assigneeColor: '#6C47FF',
    updatedAt: '2m ago',
  },
  {
    id: '2',
    key: 'ENG-45',
    title: 'LangGraph streaming review & performance audit',
    project: 'Engineering',
    projectColor: '#6C47FF',
    priority: 'high',
    status: 'in_review',
    assignee: 'TM',
    assigneeColor: '#00C9A7',
    updatedAt: '18m ago',
  },
  {
    id: '3',
    key: 'ENG-41',
    title: 'TimescaleDB migration script for telemetry data',
    project: 'Engineering',
    projectColor: '#6C47FF',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'AR',
    assigneeColor: '#FF6B6B',
    updatedAt: '1h ago',
  },
  {
    id: '4',
    key: 'PRD-12',
    title: 'Q2 roadmap: define AI features milestone',
    project: 'Product',
    projectColor: '#F59E0B',
    priority: 'high',
    status: 'in_progress',
    assignee: 'PR',
    assigneeColor: '#F59E0B',
    updatedAt: '3h ago',
  },
  {
    id: '5',
    key: 'ENG-38',
    title: 'Upgrade react-native to 0.76.3',
    project: 'Engineering',
    projectColor: '#6C47FF',
    priority: 'low',
    status: 'todo',
    assignee: 'TM',
    assigneeColor: '#00C9A7',
    updatedAt: '1d ago',
  },
  {
    id: '6',
    key: 'PRD-09',
    title: 'User onboarding flow redesign',
    project: 'Product',
    projectColor: '#F59E0B',
    priority: 'medium',
    status: 'todo',
    assignee: 'PR',
    assigneeColor: '#F59E0B',
    updatedAt: '2d ago',
  },
  {
    id: '7',
    key: 'ENG-40',
    title: 'CI/CD pipeline optimisation — reduce build time',
    project: 'Engineering',
    projectColor: '#6C47FF',
    priority: 'medium',
    status: 'done',
    assignee: 'SK',
    assigneeColor: '#6C47FF',
    updatedAt: '2d ago',
  },
]

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Done', value: 'done' },
] as const

type FilterValue = (typeof FILTERS)[number]['value']

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  urgent: { color: '#EF4444', label: 'Urgent' },
  high: { color: '#F97316', label: 'High' },
  medium: { color: '#EAB308', label: 'Medium' },
  low: { color: '#94A3B8', label: 'Low' },
}

const STATUS_CONFIG: Record<Status, { color: string; bg: string; label: string }> = {
  todo: { color: '#6B6B8A', bg: '#F0F0F8', label: 'Todo' },
  in_progress: { color: '#3B82F6', bg: '#EFF6FF', label: 'In Progress' },
  in_review: { color: '#8B5CF6', bg: '#F5F3FF', label: 'In Review' },
  done: { color: '#10B981', bg: '#ECFDF5', label: 'Done' },
}

export default function ProjectsScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')
  const [showCreateHint, setShowCreateHint] = useState(true)

  const filtered =
    activeFilter === 'all'
      ? ISSUES
      : ISSUES.filter(issue => issue.status === activeFilter)

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Issues</Text>
          <Text style={styles.headerSub}>{filtered.length} open</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={18} color="#fff" />
          <Text style={styles.filterBtnText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterTab, activeFilter === f.value && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === f.value && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
            {activeFilter === f.value && (
              <View style={styles.filterTabDot} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create hint banner */}
      {showCreateHint && (
        <TouchableOpacity
          style={styles.hintBanner}
          onPress={() => setShowCreateHint(false)}
          activeOpacity={0.85}
        >
          <View style={styles.hintLeft}>
            <Ionicons name="add-circle" size={18} color="#6C47FF" />
            <Text style={styles.hintText}>Tap the + button to create a new issue</Text>
          </View>
          <Ionicons name="close" size={16} color="#9B9BB4" />
        </TouchableOpacity>
      )}

      {/* Issues List */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#C4C4D4" />
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySubtitle}>No issues in this category</Text>
          </View>
        ) : (
          <View style={styles.issuesList}>
            {filtered.map((issue, index) => (
              <View key={issue.id}>
                <TouchableOpacity style={styles.issueRow} activeOpacity={0.7}>
                  {/* Priority dot */}
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: PRIORITY_CONFIG[issue.priority].color },
                    ]}
                  />

                  {/* Content */}
                  <View style={styles.issueContent}>
                    <View style={styles.issueTopRow}>
                      <Text style={styles.issueKey}>{issue.key}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_CONFIG[issue.status].bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: STATUS_CONFIG[issue.status].color },
                          ]}
                        >
                          {STATUS_CONFIG[issue.status].label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.issueTitle} numberOfLines={2}>
                      {issue.title}
                    </Text>

                    <View style={styles.issueBottomRow}>
                      <View
                        style={[
                          styles.projectTag,
                          { borderColor: issue.projectColor + '40' },
                        ]}
                      >
                        <View
                          style={[
                            styles.projectDot,
                            { backgroundColor: issue.projectColor },
                          ]}
                        />
                        <Text style={[styles.projectTagText, { color: issue.projectColor }]}>
                          {issue.project}
                        </Text>
                      </View>

                      <View style={styles.issueRight}>
                        <Text style={styles.issueTime}>{issue.updatedAt}</Text>
                        <View
                          style={[
                            styles.assigneeAvatar,
                            { backgroundColor: issue.assigneeColor },
                          ]}
                        >
                          <Text style={styles.assigneeText}>{issue.assignee}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                {index < filtered.length - 1 && <View style={styles.issueDivider} />}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    backgroundColor: '#1C1C2E',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: '#8888AA',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  filterScroll: {
    backgroundColor: '#1C1C2E',
    maxHeight: 52,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#6C47FF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8888AA',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0EEFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D8D0FF',
  },
  hintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#6C47FF',
    fontWeight: '500',
  },
  listScroll: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  issuesList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  issueContent: {
    flex: 1,
  },
  issueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  issueKey: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9B9BB4',
    letterSpacing: 0.3,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    lineHeight: 20,
    marginBottom: 8,
  },
  issueBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  issueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueTime: {
    fontSize: 11,
    color: '#9B9BB4',
  },
  assigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  issueDivider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D3D5C',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9B9BB4',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
})
