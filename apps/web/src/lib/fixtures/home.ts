export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL

// ── Stat cards ────────────────────────────────────────────────────
export interface StatCardData {
  label: string
  value: string
  delta: string
  deltaColor: string
}

export const STAT_CARDS: StatCardData[] = [
  { label: 'Active Issues', value: '42', delta: '\u2191 3 this week', deltaColor: 'var(--badge-info-text)' },
  { label: 'Messages Today', value: '284', delta: '\u2191 12% vs yesterday', deltaColor: 'var(--badge-success-text)' },
  { label: 'Open Orders', value: '156', delta: '4 urgent today', deltaColor: 'var(--badge-warning-text)' },
  { label: 'System Health', value: '4/5', delta: '1 service degraded', deltaColor: 'var(--badge-danger-text)' },
]

// ── Activity feed ─────────────────────────────────────────────────
export interface ActivityItemData {
  avatar: string
  name: string
  action: string
  time: string
  avatarBg: string
}

export const RECENT_ACTIVITY: ActivityItemData[] = [
  {
    avatar: 'AI', name: 'Vyne AI', avatarBg: 'linear-gradient(135deg,#E24B4A,#C0392B)',
    action: '<strong>Vyne AI</strong> detected incident in <strong>api-service</strong>',
    time: '2 min ago \u00b7 47 orders impacted',
  },
  {
    avatar: 'S', name: 'Sarah K.', avatarBg: 'linear-gradient(135deg,#9B59B6,#8E44AD)',
    action: '<strong>Sarah K.</strong> moved <strong>ENG-43</strong> to In Review',
    time: '15 min ago \u00b7 Projects',
  },
  {
    avatar: 'T', name: 'Tony M.', avatarBg: 'linear-gradient(135deg,#E67E22,#F39C12)',
    action: '<strong>Tony M.</strong> deployed <strong>auth-service v1.8.2</strong> \u2705',
    time: '1 hour ago \u00b7 Code',
  },
  {
    avatar: 'AI', name: 'Vyne AI', avatarBg: 'linear-gradient(135deg,var(--vyne-accent, #06B6D4),#9B59B6)',
    action: '<strong>Vyne AI</strong> flagged <strong>PWR-003</strong> stock critical',
    time: '2 hours ago \u00b7 Inventory \u00b7 38 units left',
  },
]

// ── Sprint progress ───────────────────────────────────────────────
export interface SprintBadge {
  label: string
  bg: string
  color: string
}

export const SPRINT_BADGES: SprintBadge[] = [
  { label: '12 Done', bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' },
  { label: '4 In Review', bg: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' },
  { label: '4 In Progress', bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' },
  { label: '8 Todo', bg: 'var(--content-secondary)', color: 'var(--text-secondary)' },
]

// ── My Focus Today ────────────────────────────────────────────────
export interface FocusTask {
  task: string
  meta: string
}

export const FOCUS_TASKS: FocusTask[] = [
  { task: 'Fix Secrets Manager IAM permissions', meta: 'ENG-43 \u00b7 urgent \u00b7 due today' },
  { task: 'LangGraph agent orchestration review', meta: 'ENG-45 \u00b7 high \u00b7 Sprint 12' },
  { task: 'TimescaleDB metrics schema migration', meta: 'ENG-41 \u00b7 medium \u00b7 in review' },
]

// ── Ask Vyne AI ───────────────────────────────────────────────────
export const AI_RECENT_QUERIES = [
  "What caused today's incident?",
  'Which orders are stuck?',
  'Low stock items this week?',
]

// ── Quick Actions ─────────────────────────────────────────────────
export interface QuickAction {
  label: string
  route: string
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: '+ New Issue', route: '/projects' },
  { label: '\ud83d\udce2 Post Update', route: '/chat' },
  { label: '\ud83d\udce6 Add Product', route: '/ops' },
  { label: '\ud83d\udccb New Order', route: '/ops' },
]
