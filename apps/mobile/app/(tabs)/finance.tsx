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

// ─── Types ───────────────────────────────────────────────────────────────────

type Transaction = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

type Customer = {
  id: string
  name: string
  initials: string
  color: string
  revenue: number
  invoices: number
}

type Invoice = {
  id: string
  client: string
  initials: string
  color: string
  amount: number
  dueDate: string
  daysOverdue: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const TOP_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Acme Corp',       initials: 'AC', color: '#6C47FF', revenue: 64200, invoices: 8 },
  { id: '2', name: 'Nexus Solutions', initials: 'NS', color: '#00C9A7', revenue: 51800, invoices: 6 },
  { id: '3', name: 'Peak Digital',    initials: 'PD', color: '#F59E0B', revenue: 43500, invoices: 5 },
  { id: '4', name: 'Orbit Labs',      initials: 'OL', color: '#FF6B6B', revenue: 38100, invoices: 4 },
  { id: '5', name: 'Bright Ventures', initials: 'BV', color: '#10B981', revenue: 31400, invoices: 3 },
]

const TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Acme Corp — SaaS licence',    amount: 12400, type: 'income',  category: 'SaaS',       date: 'Mar 18' },
  { id: '2', description: 'AWS infrastructure bill',      amount:  8210, type: 'expense', category: 'Cloud',      date: 'Mar 17' },
  { id: '3', description: 'Nexus Solutions — consulting', amount:  9800, type: 'income',  category: 'Services',   date: 'Mar 15' },
  { id: '4', description: 'Payroll — March cycle',        amount: 42000, type: 'expense', category: 'Payroll',    date: 'Mar 14' },
  { id: '5', description: 'Peak Digital — retainer',      amount:  7500, type: 'income',  category: 'Retainer',   date: 'Mar 12' },
  { id: '6', description: 'Office supplies & equipment',  amount:  1340, type: 'expense', category: 'Operations', date: 'Mar 10' },
]

const OVERDUE_INVOICES: Invoice[] = [
  { id: 'INV-084', client: 'Bright Ventures', initials: 'BV', color: '#10B981', amount: 14200, dueDate: 'Mar 1',  daysOverdue: 20 },
  { id: 'INV-079', client: 'Orbit Labs',      initials: 'OL', color: '#FF6B6B', amount:  8750, dueDate: 'Feb 22', daysOverdue: 27 },
  { id: 'INV-071', client: 'Delta Forge',     initials: 'DF', color: '#F59E0B', amount:  5900, dueDate: 'Feb 10', daysOverdue: 39 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}

function fmtFull(n: number) {
  return '$' + n.toLocaleString('en-US')
}

// ─── Chart bar ───────────────────────────────────────────────────────────────

const MAX_BAR = 284 // revenue max (used as reference)
const CHART_DATA = [
  { month: 'Nov', revenue: 210, expenses: 130 },
  { month: 'Dec', revenue: 248, expenses: 145 },
  { month: 'Jan', revenue: 225, expenses: 138 },
  { month: 'Feb', revenue: 262, expenses: 151 },
  { month: 'Mar', revenue: 284, expenses: 156 },
]
const BAR_TRACK = 160 // max pixel width for bars

// ─── Component ───────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const now = new Date()
  const [monthIndex, setMonthIndex] = useState(now.getMonth())

  const prevMonth = () => setMonthIndex(i => (i === 0 ? 11 : i - 1))
  const nextMonth = () => setMonthIndex(i => (i === 11 ? 0 : i + 1))

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Finance</Text>
          <Text style={styles.headerSub}>March 2026</Text>
        </View>
        {/* Month picker */}
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[monthIndex]}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── KPI Cards ── */}
        <View style={styles.kpiRow}>
          <KpiCard label="Revenue"    value="$284K" change="+12.4%" up={true}  color="#6C47FF" icon="trending-up" />
          <KpiCard label="Expenses"   value="$156K" change="+4.1%"  up={false} color="#FF6B6B" icon="trending-down" />
          <KpiCard label="Net Profit" value="$128K" change="+22.1%" up={true}  color="#10B981" icon="cash" />
        </View>

        {/* ── Revenue vs Expenses Chart ── */}
        <Text style={styles.sectionTitle}>Revenue vs Expenses</Text>
        <View style={styles.card}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6C47FF' }]} />
              <Text style={styles.legendText}>Revenue</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
          </View>
          {CHART_DATA.map((row, i) => (
            <View key={i} style={styles.chartRow}>
              <Text style={styles.chartMonth}>{row.month}</Text>
              <View style={styles.chartBars}>
                {/* Revenue bar */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: (row.revenue / MAX_BAR) * BAR_TRACK,
                        backgroundColor: '#6C47FF',
                      },
                    ]}
                  />
                </View>
                {/* Expense bar */}
                <View style={[styles.barTrack, { marginTop: 4 }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: (row.expenses / MAX_BAR) * BAR_TRACK,
                        backgroundColor: '#FF6B6B',
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.chartValues}>
                <Text style={styles.chartVal}>${row.revenue}K</Text>
                <Text style={[styles.chartVal, { color: '#FF6B6B', marginTop: 4 }]}>${row.expenses}K</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Top Customers ── */}
        <Text style={styles.sectionTitle}>Top Customers</Text>
        <View style={styles.card}>
          {TOP_CUSTOMERS.map((c, i) => (
            <View key={c.id}>
              <View style={styles.customerRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: c.color }]}>
                  <Text style={styles.avatarText}>{c.initials}</Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{c.name}</Text>
                  <Text style={styles.customerSub}>{c.invoices} invoices</Text>
                </View>
                <Text style={styles.customerRevenue}>{fmt(c.revenue)}</Text>
              </View>
              {i < TOP_CUSTOMERS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── Recent Transactions ── */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.card}>
          {TRANSACTIONS.map((tx, i) => (
            <View key={tx.id}>
              <View style={styles.txRow}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: tx.type === 'income' ? '#ECFDF5' : '#FFF1F1' },
                  ]}
                >
                  <Ionicons
                    name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                    size={14}
                    color={tx.type === 'income' ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <View style={styles.txMeta}>
                    <View style={styles.txCatBadge}>
                      <Text style={styles.txCatText}>{tx.category}</Text>
                    </View>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.type === 'income' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {tx.type === 'income' ? '+' : '-'}{fmtFull(tx.amount)}
                </Text>
              </View>
              {i < TRANSACTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── Outstanding Invoices ── */}
        <Text style={styles.sectionTitle}>Outstanding Invoices</Text>
        <View style={styles.card}>
          {OVERDUE_INVOICES.map((inv, i) => (
            <View key={inv.id}>
              <View style={styles.invoiceRow}>
                <View style={styles.overdueIndicator} />
                <View style={[styles.avatar, { backgroundColor: inv.color }]}>
                  <Text style={styles.avatarText}>{inv.initials}</Text>
                </View>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceId}>{inv.id}</Text>
                  <Text style={styles.invoiceClient}>{inv.client}</Text>
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueBadgeText}>{inv.daysOverdue}d overdue</Text>
                  </View>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{fmtFull(inv.amount)}</Text>
                  <Text style={styles.invoiceDue}>Due {inv.dueDate}</Text>
                  <TouchableOpacity style={styles.remindBtn} activeOpacity={0.75}>
                    <Text style={styles.remindBtnText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {i < OVERDUE_INVOICES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction icon="document-text-outline" label="New Invoice"      color="#6C47FF" />
          <QuickAction icon="card-outline"          label="Record Payment"   color="#10B981" />
          <QuickAction icon="bar-chart-outline"     label="View P&L"         color="#F59E0B" />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, change, up, color, icon,
}: {
  label: string; value: string; change: string; up: boolean; color: string; icon: any
}) {
  return (
    <View style={[kpiStyles.card, { borderTopColor: color }]}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={kpiStyles.value}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
      <View style={kpiStyles.changeRow}>
        <Ionicons
          name={up ? 'arrow-up' : 'arrow-down'}
          size={10}
          color={up ? '#10B981' : '#EF4444'}
        />
        <Text style={[kpiStyles.change, { color: up ? '#10B981' : '#EF4444' }]}>{change}</Text>
      </View>
    </View>
  )
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C2E',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: '#6B6B8A',
    fontWeight: '500',
    marginBottom: 6,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  change: {
    fontSize: 11,
    fontWeight: '700',
  },
})

function QuickAction({ icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <TouchableOpacity style={[qaStyles.btn, { borderColor: color + '30' }]} activeOpacity={0.75}>
      <View style={[qaStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const qaStyles = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C2E',
    textAlign: 'center',
  },
})

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    paddingBottom: 16,
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
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    minWidth: 36,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C2E',
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 24,
    paddingVertical: 4,
    shadowColor: '#1C1C2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F8',
    marginHorizontal: 16,
  },
  // Chart
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B6B8A',
    fontWeight: '500',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chartMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9B9BB4',
    width: 32,
  },
  chartBars: {
    flex: 1,
    marginHorizontal: 10,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F0F0F8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  chartValues: {
    width: 56,
    alignItems: 'flex-end',
  },
  chartVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C47FF',
  },
  // Customers
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rankBadge: {
    width: 20,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4C4D4',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    marginBottom: 2,
  },
  customerSub: {
    fontSize: 12,
    color: '#9B9BB4',
  },
  customerRevenue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C2E',
  },
  // Transactions
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    marginBottom: 5,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txCatBadge: {
    backgroundColor: '#F0F0F8',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  txCatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B6B8A',
  },
  txDate: {
    fontSize: 11,
    color: '#9B9BB4',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Invoices
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  overdueIndicator: {
    width: 4,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B9BB4',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  invoiceClient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C2E',
    marginBottom: 4,
  },
  overdueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F1',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C2E',
  },
  invoiceDue: {
    fontSize: 11,
    color: '#9B9BB4',
    marginBottom: 6,
  },
  remindBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remindBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
})
