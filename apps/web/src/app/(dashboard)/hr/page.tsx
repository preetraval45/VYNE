'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────
type Department = 'Engineering' | 'Product' | 'Sales' | 'Finance' | 'Operations'
type EmployeeStatus = 'Active' | 'Remote' | 'On Leave'
type HRTab = 'employees' | 'leave' | 'payroll' | 'orgchart'
type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected'

interface Employee {
  id: string
  name: string
  initials: string
  title: string
  department: Department
  status: EmployeeStatus
  leaveNote?: string
  joined: string
  email: string
  phone: string
  slack: string
  reportsTo: string
  avatarGradient: string
  baseSalary: number
  hoursThisMonth: number
  deductions: number
  bonus: number
  vacationBalance: number
  sickBalance: number
  personalBalance: number
  usedLeaveThisYear: number
}

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  type: string
  dates: string
  status: LeaveRequestStatus
  reason: string
}

// ─── Mock employees ───────────────────────────────────────────────
const EMPLOYEES: Employee[] = [
  {
    id: 'e1', name: 'Preet Raval', initials: 'PR', title: 'CEO', department: 'Engineering',
    status: 'Active', joined: 'Jan 2024', email: 'preet@vyne.io', phone: '+1 (416) 555-0101',
    slack: '@preet', reportsTo: '—', avatarGradient: 'linear-gradient(135deg,#6C47FF,#9B59B6)',
    baseSalary: 180000, hoursThisMonth: 160, deductions: 4200, bonus: 5000, vacationBalance: 15, sickBalance: 5, personalBalance: 3, usedLeaveThisYear: 2,
  },
  {
    id: 'e2', name: 'Sarah Kim', initials: 'SK', title: 'Head of Product', department: 'Product',
    status: 'Active', joined: 'Feb 2024', email: 'sarah@vyne.io', phone: '+1 (416) 555-0102',
    slack: '@sarah.kim', reportsTo: 'Preet Raval', avatarGradient: 'linear-gradient(135deg,#9B59B6,#8E44AD)',
    baseSalary: 145000, hoursThisMonth: 160, deductions: 3400, bonus: 3000, vacationBalance: 14, sickBalance: 5, personalBalance: 3, usedLeaveThisYear: 3,
  },
  {
    id: 'e3', name: 'Tony Martinez', initials: 'TM', title: 'DevOps Lead', department: 'Engineering',
    status: 'Active', joined: 'Feb 2024', email: 'tony@vyne.io', phone: '+1 (416) 555-0103',
    slack: '@tony.m', reportsTo: 'Preet Raval', avatarGradient: 'linear-gradient(135deg,#E67E22,#F39C12)',
    baseSalary: 138000, hoursThisMonth: 164, deductions: 3200, bonus: 2500, vacationBalance: 13, sickBalance: 4, personalBalance: 3, usedLeaveThisYear: 4,
  },
  {
    id: 'e4', name: 'Alex Rhodes', initials: 'AR', title: 'Sales Lead', department: 'Sales',
    status: 'Active', joined: 'Mar 2024', email: 'alex@vyne.io', phone: '+1 (416) 555-0104',
    slack: '@alex.r', reportsTo: 'Preet Raval', avatarGradient: 'linear-gradient(135deg,#E24B4A,#C0392B)',
    baseSalary: 120000, hoursThisMonth: 158, deductions: 2900, bonus: 4000, vacationBalance: 12, sickBalance: 5, personalBalance: 2, usedLeaveThisYear: 5,
  },
  {
    id: 'e5', name: 'Emma Wilson', initials: 'EW', title: 'Finance Manager', department: 'Finance',
    status: 'Remote', joined: 'Apr 2024', email: 'emma@vyne.io', phone: '+1 (416) 555-0105',
    slack: '@emma.w', reportsTo: 'Preet Raval', avatarGradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    baseSalary: 125000, hoursThisMonth: 160, deductions: 2950, bonus: 2000, vacationBalance: 11, sickBalance: 5, personalBalance: 3, usedLeaveThisYear: 6,
  },
  {
    id: 'e6', name: 'James Chen', initials: 'JC', title: 'Backend Engineer', department: 'Engineering',
    status: 'Active', joined: 'May 2024', email: 'james@vyne.io', phone: '+1 (416) 555-0106',
    slack: '@james.c', reportsTo: 'Tony Martinez', avatarGradient: 'linear-gradient(135deg,#10B981,#059669)',
    baseSalary: 115000, hoursThisMonth: 162, deductions: 2700, bonus: 1500, vacationBalance: 10, sickBalance: 4, personalBalance: 3, usedLeaveThisYear: 2,
  },
  {
    id: 'e7', name: 'Lisa Park', initials: 'LP', title: 'Customer Success', department: 'Operations',
    status: 'On Leave', leaveNote: 'back Jun 1', joined: 'Jun 2024', email: 'lisa@vyne.io', phone: '+1 (416) 555-0107',
    slack: '@lisa.p', reportsTo: 'Preet Raval', avatarGradient: 'linear-gradient(135deg,#F59E0B,#D97706)',
    baseSalary: 105000, hoursThisMonth: 80, deductions: 2400, bonus: 0, vacationBalance: 8, sickBalance: 3, personalBalance: 2, usedLeaveThisYear: 12,
  },
  {
    id: 'e8', name: 'Raj Patel', initials: 'RP', title: 'Data Engineer', department: 'Engineering',
    status: 'Active', joined: 'Aug 2024', email: 'raj@vyne.io', phone: '+1 (416) 555-0108',
    slack: '@raj.p', reportsTo: 'Tony Martinez', avatarGradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    baseSalary: 118000, hoursThisMonth: 160, deductions: 2750, bonus: 1000, vacationBalance: 7, sickBalance: 5, personalBalance: 3, usedLeaveThisYear: 1,
  },
]

// ─── Mock leave requests ──────────────────────────────────────────
const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employeeId: 'e7', employeeName: 'Lisa Park', type: 'Vacation', dates: 'Jun 1 – Jun 14', status: 'Pending', reason: 'Family vacation — pre-approved verbally' },
  { id: 'lr2', employeeId: 'e6', employeeName: 'James Chen', type: 'Sick', dates: 'May 28', status: 'Pending', reason: 'Medical appointment' },
  { id: 'lr3', employeeId: 'e4', employeeName: 'Alex Rhodes', type: 'Personal', dates: 'May 30', status: 'Pending', reason: 'Personal errand' },
]

// ─── Helpers ──────────────────────────────────────────────────────
function fmtSalary(n: number): string {
  return `$${n.toLocaleString()}`
}

function fmtNetPay(emp: Employee): number {
  return Math.round(emp.baseSalary / 12 - emp.deductions + emp.bonus)
}

// ─── Department chip ──────────────────────────────────────────────
function DeptChip({ dept }: Readonly<{ dept: Department }>) {
  const colors: Record<Department, { bg: string; color: string }> = {
    Engineering: { bg: 'rgba(108,71,255,0.12)', color: '#8B68FF' },
    Product: { bg: 'rgba(155,89,182,0.12)', color: '#A855F7' },
    Sales: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
    Finance: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
    Operations: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  }
  const s = colors[dept]
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      {dept}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ emp }: Readonly<{ emp: Employee }>) {
  if (emp.status === 'Active') {
    return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#F0FDF4', color: '#166534' }}>Active</span>
  }
  if (emp.status === 'Remote') {
    return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#EFF6FF', color: '#1E40AF' }}>Remote</span>
  }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#FFFBEB', color: '#92400E' }}>
      On Leave{emp.leaveNote ? ` · ${emp.leaveNote}` : ''}
    </span>
  )
}

// ─── Avatar circle ────────────────────────────────────────────────
function Avatar({ emp, size = 40 }: Readonly<{ emp: Employee; size?: number }>) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: emp.avatarGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {emp.initials}
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        background: 'transparent',
        color: active ? '#6C47FF' : '#6B6B8A',
        borderBottom: active ? '2px solid #6C47FF' : '2px solid transparent',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ─── Employee modal ───────────────────────────────────────────────
function EmployeeModal({ emp, onClose }: Readonly<{ emp: Employee; onClose: () => void }>) {
  const MOCK_DOCS = ['Offer Letter — Jan 2024', 'NDA Agreement — Jan 2024', 'Performance Review Q1 2026']

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: 720,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Employee Profile</span>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', fontSize: 20, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}
          >
            &#10005;
          </button>
        </div>

        {/* Modal body — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left: avatar + core info */}
          <div
            style={{
              padding: '24px 20px',
              background: '#FAFAFE',
              borderRight: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              overflowY: 'auto',
            }}
          >
            <Avatar emp={emp} size={72} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{emp.name}</div>
              <div style={{ fontSize: 12, color: '#6B6B8A', marginTop: 2 }}>{emp.title}</div>
            </div>
            <DeptChip dept={emp.department} />
            <StatusBadge emp={emp} />
            <div style={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12, marginTop: 4 }}>
              <InfoRow label="Joined" value={emp.joined} />
              <InfoRow label="Reports to" value={emp.reportsTo} />
            </div>

            {/* Leave balances */}
            <div style={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Leave Balance</div>
              <LeaveBalanceBar label="Vacation" remaining={emp.vacationBalance} total={15} color="#6C47FF" />
              <LeaveBalanceBar label="Sick" remaining={emp.sickBalance} total={8} color="#EF4444" />
              <LeaveBalanceBar label="Personal" remaining={emp.personalBalance} total={5} color="#F59E0B" />
            </div>
          </div>

          {/* Right: details */}
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            {/* Contact */}
            <Section title="Contact Information">
              <InfoRow label="Email" value={emp.email} />
              <InfoRow label="Phone" value={emp.phone} />
              <InfoRow label="Slack" value={emp.slack} />
            </Section>

            {/* Emergency */}
            <Section title="Emergency Contact">
              <InfoRow label="Name" value="On file — confidential" />
              <InfoRow label="Phone" value="On file — confidential" />
            </Section>

            {/* Current tasks */}
            <Section title="Current Tasks">
              <div style={{ fontSize: 12, color: '#6C47FF', cursor: 'pointer', textDecoration: 'underline' }}>
                View assigned tasks in Projects &rarr;
              </div>
            </Section>

            {/* Documents */}
            <Section title="Documents">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOCK_DOCS.map((doc) => (
                  <div
                    key={doc}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      background: '#F7F7FB',
                      borderRadius: 7,
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>&#128196;</span>
                    <span style={{ fontSize: 12, color: '#1A1A2E' }}>{doc}</span>
                    <button
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: '#6C47FF',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 5,
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
      <span style={{ fontSize: 11, color: '#A0A0B8', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#1A1A2E', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function LeaveBalanceBar({ label, remaining, total, color }: Readonly<{ label: string; remaining: number; total: number; color: string }>) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#6B6B8A' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A2E' }}>{remaining}d</span>
      </div>
      <div style={{ height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(remaining / total) * 100}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

// ─── Employees tab ────────────────────────────────────────────────
function EmployeesTab() {
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        {EMPLOYEES.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmp(emp)}
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              padding: '18px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'box-shadow 0.15s, transform 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(108,71,255,0.12)'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'none'
            }}
          >
            <Avatar emp={emp} size={44} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{emp.name}</div>
              <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 2 }}>{emp.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <DeptChip dept={emp.department} />
            </div>
            <StatusBadge emp={emp} />
            <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 2 }}>{emp.email}</div>
          </button>
        ))}
      </div>

      {selectedEmp !== null && (
        <EmployeeModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />
      )}
    </div>
  )
}

// ─── Calendar strip helpers ───────────────────────────────────────
function calendarCellBackground(day: number | null, hasAbsences: boolean): string {
  if (day === null) return 'transparent'
  if (hasAbsences) return 'rgba(239,68,68,0.08)'
  return '#F7F7FB'
}

function calendarCellBorder(day: number | null): string {
  if (day === null) return 'none'
  return '1px solid rgba(0,0,0,0.06)'
}

// ─── Calendar strip ───────────────────────────────────────────────
function CalendarStrip() {
  // May 2026: 31 days, starts on Friday (day index 5)
  const daysInMonth = 31
  const startDayIndex = 5
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const outMap: Record<number, string[]> = {
    28: ['JC'],
    30: ['AR'],
  }

  const cells: Array<{ day: number | null; names: string[]; key: string }> = []
  for (let i = 0; i < startDayIndex; i++) {
    cells.push({ day: null, names: [], key: `pad-${i}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, names: outMap[d] ?? [], key: `day-${d}` })
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {dayNames.map((dn) => (
          <div key={dn} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#A0A0B8', padding: '4px 0' }}>{dn}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell) => (
          <div
            key={cell.key}
            style={{
              minHeight: 36,
              borderRadius: 6,
              background: calendarCellBackground(cell.day, cell.names.length > 0),
              border: calendarCellBorder(cell.day),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '3px 0',
            }}
          >
            {cell.day !== null && (
              <>
                <span style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.4 }}>{cell.day}</span>
                {cell.names.map((n) => (
                  <span key={n} style={{ fontSize: 9, background: '#EF4444', color: '#fff', borderRadius: 3, padding: '1px 3px', marginTop: 1 }}>{n}</span>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Leave tab helpers ────────────────────────────────────────────
function leaveRequestBackground(status: LeaveRequestStatus): string {
  if (status === 'Pending') return '#FAFAFE'
  if (status === 'Approved') return '#F0FDF4'
  return '#FEF2F2'
}

function leaveTypeBadgeBackground(type: string): string {
  if (type === 'Vacation') return 'rgba(108,71,255,0.1)'
  if (type === 'Sick') return 'rgba(239,68,68,0.1)'
  return 'rgba(245,158,11,0.1)'
}

function leaveTypeBadgeColor(type: string): string {
  if (type === 'Vacation') return '#6C47FF'
  if (type === 'Sick') return '#EF4444'
  return '#F59E0B'
}

function resolvedStatusColor(status: LeaveRequestStatus): string {
  if (status === 'Approved') return '#166534'
  return '#991B1B'
}

// ─── Leave tab ────────────────────────────────────────────────────
function LeaveTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS)

  function resolveRequest(id: string, action: 'Approved' | 'Rejected') {
    setRequests(requests.map((r) => r.id === id ? { ...r, status: action } : r))
  }

  const pendingRequests = requests.filter((r) => r.status === 'Pending')

  return (
    <div style={{ padding: 20, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Left: balances + requests */}
        <div>
          {/* Balances table */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Leave Balances</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7F7FB' }}>
                  {['Employee', 'Vacation', 'Sick', 'Personal', 'Used This Year'].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((emp) => (
                  <tr key={emp.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar emp={emp} size={24} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6C47FF', fontWeight: 600 }}>{emp.vacationBalance}d</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#EF4444', fontWeight: 600 }}>{emp.sickBalance}d</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>{emp.personalBalance}d</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{emp.usedLeaveThisYear}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending requests */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Leave Requests</span>
              {pendingRequests.length > 0 && (
                <span style={{ background: '#6C47FF', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                  {pendingRequests.length} pending
                </span>
              )}
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.07)',
                    background: leaveRequestBackground(req.status),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{req.employeeName}</span>
                      <span
                        style={{
                          padding: '1px 7px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 500,
                          background: leaveTypeBadgeBackground(req.type),
                          color: leaveTypeBadgeColor(req.type),
                        }}
                      >
                        {req.type}
                      </span>
                    </div>
                    {req.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => resolveRequest(req.id, 'Approved')}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveRequest(req.id, 'Rejected')}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #EF4444', background: 'transparent', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {(req.status === 'Approved' || req.status === 'Rejected') && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: resolvedStatusColor(req.status) }}>
                        {req.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B6B8A' }}>{req.dates}</div>
                  <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 3 }}>{req.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: calendar */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>May 2026 — Who&apos;s Out</div>
          <CalendarStrip />
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid rgba(239,68,68,0.12)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>Absences this month</div>
            <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 3 }}>JC — James Chen (May 28)</div>
            <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 3 }}>AR — Alex Rhodes (May 30)</div>
            <div style={{ fontSize: 11, color: '#6B6B8A' }}>LP — Lisa Park (back Jun 1)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payroll tab ──────────────────────────────────────────────────
function PayrollTab() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [payrollRun, setPayrollRun] = useState(false)
  const [toast, setToast] = useState('')

  function runPayroll() {
    setPayrollRun(true)
    setShowConfirm(false)
    setToast('Payroll for May 2026 processed successfully.')
    setTimeout(() => setToast(''), 3500)
  }

  function downloadPayslips() {
    setToast('Generating payslips for 8 employees...')
    setTimeout(() => setToast(''), 3000)
  }

  const totalBase = EMPLOYEES.reduce((s, e) => s + Math.round(e.baseSalary / 12), 0)
  const totalDeductions = EMPLOYEES.reduce((s, e) => s + e.deductions, 0)
  const totalBonus = EMPLOYEES.reduce((s, e) => s + e.bonus, 0)
  const totalNet = EMPLOYEES.reduce((s, e) => s + fmtNetPay(e), 0)

  const ytdTotal = totalNet * 5
  const avgSalary = Math.round(EMPLOYEES.reduce((s, e) => s + e.baseSalary, 0) / EMPLOYEES.length)

  return (
    <div style={{ padding: 20, overflowY: 'auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Payroll — May 2026</h2>
          <p style={{ fontSize: 12, color: '#A0A0B8', margin: '3px 0 0' }}>8 employees · next run Jun 1</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={downloadPayslips}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'transparent',
              color: '#6B6B8A',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Download Payslips
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: payrollRun ? '#22C55E' : '#6C47FF',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {payrollRun ? 'Payroll Run ✓' : 'Run Payroll — May 2026'}
          </button>
        </div>
      </div>

      {/* YTD summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Payroll YTD', value: `$${ytdTotal.toLocaleString()}` },
          { label: 'Average Salary', value: `$${avgSalary.toLocaleString()}` },
          { label: 'Headcount', value: '8 employees' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#F7F7FB', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Payroll table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['Employee', 'Base Salary', 'Hours', 'Deductions', 'Bonus', 'Net Pay'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((emp) => {
              const monthlySalary = Math.round(emp.baseSalary / 12)
              const netPay = fmtNetPay(emp)
              return (
                <tr key={emp.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar emp={emp} size={28} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: '#A0A0B8' }}>{emp.title}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#1A1A2E' }}>{fmtSalary(monthlySalary)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#6B6B8A' }}>{emp.hoursThisMonth}h</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#EF4444' }}>-{fmtSalary(emp.deductions)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: emp.bonus > 0 ? '#22C55E' : '#A0A0B8', fontWeight: emp.bonus > 0 ? 600 : 400 }}>
                    {emp.bonus > 0 ? `+${fmtSalary(emp.bonus)}` : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{fmtSalary(netPay)}</td>
                </tr>
              )
            })}

            {/* Totals row */}
            <tr style={{ borderTop: '2px solid rgba(0,0,0,0.1)', background: '#F7F7FB' }}>
              <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Total</td>
              <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{fmtSalary(totalBase)}</td>
              <td style={{ padding: '11px 16px', fontSize: 12, color: '#6B6B8A' }}>—</td>
              <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#EF4444' }}>-{fmtSalary(totalDeductions)}</td>
              <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#22C55E' }}>+{fmtSalary(totalBonus)}</td>
              <td style={{ padding: '11px 16px', fontSize: 14, fontWeight: 700, color: '#6C47FF' }}>{fmtSalary(totalNet)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              width: 420,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>Confirm Payroll Run</div>
            <p style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 1.6, marginBottom: 20 }}>
              You are about to run payroll for <strong>8 employees</strong> for <strong>May 2026</strong>.
              Total net payout: <strong style={{ color: '#1A1A2E' }}>{fmtSalary(totalNet)}</strong>.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}
              >
                Cancel
              </button>
              <button
                onClick={runPayroll}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                Confirm &amp; Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast !== '' && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#22C55E',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
            zIndex: 400,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Org chart node ───────────────────────────────────────────────
function OrgNode({ emp }: Readonly<{ emp: Employee }>) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '14px 16px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        minWidth: 120,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <Avatar emp={emp} size={40} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>{emp.name}</div>
        <div style={{ fontSize: 10, color: '#A0A0B8', marginTop: 1 }}>{emp.title}</div>
      </div>
    </div>
  )
}

// ─── Org chart tab ────────────────────────────────────────────────
function OrgChartTab() {
  const ceo = EMPLOYEES.find((e) => e.id === 'e1') ?? EMPLOYEES[0]
  const reports = EMPLOYEES.filter((e) => e.reportsTo === 'Preet Raval')

  return (
    <div style={{ padding: 32, overflowY: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 24 }}>Organization Chart</div>

      {/* CEO node */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
        <OrgNode emp={ceo} />
      </div>

      {/* Connector line down */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.12)' }} />
      </div>

      {/* Horizontal bar */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '12.5%',
            right: '12.5%',
            height: 1,
            background: 'rgba(0,0,0,0.12)',
          }}
        />
      </div>

      {/* Direct reports */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          paddingTop: 28,
        }}
      >
        {reports.map((emp) => {
          const subReports = EMPLOYEES.filter((e) => e.reportsTo === emp.name)
          return (
            <div key={emp.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {/* Vertical line above */}
              <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.12)' }} />
              <OrgNode emp={emp} />
              {/* Sub-reports */}
              {subReports.length > 0 && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    {subReports.map((sub) => (
                      <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)' }} />
                        <OrgNode emp={sub} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main HR page ─────────────────────────────────────────────────
export default function HRPage() {
  const [tab, setTab] = useState<HRTab>('employees')

  const tabLabels: { key: HRTab; label: string }[] = [
    { key: 'employees', label: 'Employees' },
    { key: 'leave', label: 'Leave' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'orgchart', label: 'Org Chart' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 20px 0',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>HR</h1>
            <p style={{ fontSize: 12, color: '#A0A0B8', margin: '2px 0 0' }}>
              {EMPLOYEES.length} employees · {EMPLOYEES.filter((e) => e.status === 'Active').length} active
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#166534' }}>
              {EMPLOYEES.filter((e) => e.status === 'Active').length} Active
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: '#1E40AF' }}>
              {EMPLOYEES.filter((e) => e.status === 'Remote').length} Remote
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#92400E' }}>
              {EMPLOYEES.filter((e) => e.status === 'On Leave').length} On Leave
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabLabels.map(({ key, label }) => (
            <TabBtn key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'employees' && <EmployeesTab />}
        {tab === 'leave' && <LeaveTab />}
        {tab === 'payroll' && <PayrollTab />}
        {tab === 'orgchart' && <OrgChartTab />}
      </div>
    </div>
  )
}
