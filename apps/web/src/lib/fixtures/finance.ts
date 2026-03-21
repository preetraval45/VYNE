import type { ERPJournalEntry } from '@/lib/api/client'

export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL

// ── Months ────────────────────────────────────────────────────────
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Monthly P&L data ──────────────────────────────────────────────
export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
}

export const MOCK_MONTHLY: MonthlyData[] = [
  { month: 'Oct', revenue: 84200, expenses: 61400 },
  { month: 'Nov', revenue: 91500, expenses: 64200 },
  { month: 'Dec', revenue: 112000, expenses: 71000 },
  { month: 'Jan', revenue: 78400, expenses: 58900 },
  { month: 'Feb', revenue: 89600, expenses: 62100 },
  { month: 'Mar', revenue: 96800, expenses: 67300 },
]

// ── Journal entries ───────────────────────────────────────────────
export const MOCK_JOURNAL: ERPJournalEntry[] = [
  { id: 'j1', entryNumber: 'JE-001', description: 'Sales revenue \u2014 March batch', postingDate: new Date(Date.now() - 86400000).toISOString(), status: 'posted', totalDebits: 96800 },
  { id: 'j2', entryNumber: 'JE-002', description: 'COGS \u2014 Product shipments', postingDate: new Date(Date.now() - 172800000).toISOString(), status: 'posted', totalDebits: 43200 },
  { id: 'j3', entryNumber: 'JE-003', description: 'Payroll \u2014 March', postingDate: new Date(Date.now() - 259200000).toISOString(), status: 'posted', totalDebits: 18400 },
  { id: 'j4', entryNumber: 'JE-004', description: 'AWS infrastructure invoice', postingDate: new Date(Date.now() - 345600000).toISOString(), status: 'posted', totalDebits: 5700 },
  { id: 'j5', entryNumber: 'JE-005', description: 'Marketing spend \u2014 Q1', postingDate: new Date(Date.now() - 432000000).toISOString(), status: 'draft', totalDebits: 12000 },
]

// ── Chart of accounts ─────────────────────────────────────────────
export interface AccountEntry {
  code: string
  name: string
  type: string
  balance: number
}

export const MOCK_ACCOUNTS: AccountEntry[] = [
  { code: '1001', name: 'Cash & Bank', type: 'Asset', balance: 284600 },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 47200 },
  { code: '1500', name: 'Inventory', type: 'Asset', balance: 156800 },
  { code: '2001', name: 'Accounts Payable', type: 'Liability', balance: 28400 },
  { code: '2100', name: 'Accrued Expenses', type: 'Liability', balance: 14200 },
  { code: '3001', name: 'Owner Equity', type: 'Equity', balance: 312000 },
  { code: '4001', name: 'Revenue', type: 'Revenue', balance: 96800 },
  { code: '5001', name: 'COGS', type: 'Expense', balance: 43200 },
  { code: '5100', name: 'Operating Expenses', type: 'Expense', balance: 24100 },
]
