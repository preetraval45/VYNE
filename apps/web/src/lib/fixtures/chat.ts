// IS_DEMO_MODE is re-exported from ./home to avoid duplicate exports

// ── Common emojis ─────────────────────────────────────────────────
export const COMMON_EMOJIS = ['👍', '👎', '🎉', '🚀', '❤️', '🔥', '✅', '❌', '😂', '🤔', '😍', '💯', '👀', '🙏', '💪', '🎯', '⚡', '🐛', '💡', '🔔']

// ── Presence colors ───────────────────────────────────────────────
export const PRESENCE_COLORS: Record<string, string> = {
  online: '#22C55E', away: '#F59E0B', offline: '#6B6B8A',
}

// ── Slash commands ────────────────────────────────────────────────
export type SlashCmd = { cmd: string; args: string; icon: string; desc: string; category: string }

export const SLASH_COMMANDS: SlashCmd[] = [
  { cmd: 'schedule',      args: '<title> [tomorrow 2pm]', icon: '📅', desc: 'Schedule a meeting in this channel', category: 'Calendar' },
  { cmd: 'workflow',      args: '<template>', icon: '⚙️', desc: 'Spawn a workflow checklist (onboarding, release, incident...)', category: 'Workflows' },
  { cmd: 'standup',       args: '[blockers]', icon: '🧱', desc: 'AI: write a daily standup post', category: 'AI templates' },
  { cmd: 'incident',      args: '<title>', icon: '🚨', desc: 'AI: open an incident response template', category: 'AI templates' },
  { cmd: 'postmortem',    args: '<incident or summary>', icon: '🔍', desc: 'AI: draft a blameless post-mortem', category: 'AI templates' },
  { cmd: 'pr-summary',    args: '<branch or PR url>', icon: '🔀', desc: 'AI: summarize a pull request for non-engineers', category: 'AI templates' },
  { cmd: 'customer-update', args: '<customer>', icon: '💬', desc: 'AI: status update for a specific customer', category: 'AI templates' },
  { cmd: 'contact',       args: '<email or name>', icon: '👤', desc: 'Look up a contact in CRM (creates if missing)', category: 'CRM' },
  { cmd: 'deal',          args: '<name> @ <company> $<value>', icon: '💼', desc: 'Create a deal in the sales pipeline', category: 'CRM' },
  { cmd: 'log-call',      args: '<contact> | <notes>', icon: '📞', desc: 'Log a call activity against a contact', category: 'CRM' },
  { cmd: 'approve-order', args: '<order-id>', icon: '✅', desc: 'Approve a purchase or sales order', category: 'ERP' },
  { cmd: 'create-task',   args: '<title>',    icon: '📋', desc: 'Create a task in the active project', category: 'Projects' },
  { cmd: 'stock-check',   args: '<sku>',      icon: '📦', desc: 'Check inventory levels for a SKU', category: 'ERP' },
  { cmd: 'invoice',       args: '<contact>',  icon: '🧾', desc: 'Create a draft invoice for a contact', category: 'Finance' },
  { cmd: 'assign-lead',   args: '<name>',     icon: '🎯', desc: 'Assign a CRM lead to yourself', category: 'CRM' },
  { cmd: 'poll',          args: '<question>', icon: '📊', desc: 'Create a quick poll in this channel', category: 'Chat' },
  { cmd: 'remind',        args: '<time> <message>', icon: '⏰', desc: 'Set a reminder for yourself', category: 'Chat' },
  { cmd: 'summarize',     args: '',           icon: '🧠', desc: 'AI-summarize recent messages', category: 'AI' },
]

// ── AI Summary panel ─────────────────────────────────────────────
export const SUMMARY_LINES = [
  'The team discussed the Q2 roadmap priorities and agreed to move the billing integration to the next sprint.',
  'Preet confirmed that the API gateway deployment is blocked on DevOps approvals — ETA Thursday.',
  'A decision was made to onboard Acme Corp as a pilot customer. Sarah will prepare the contract.',
  'The mobile app v2 scope was trimmed to focus on ERP and Finance screens only.',
]

export interface SummaryAction {
  text: string
  done: boolean
}

export const SUMMARY_ACTIONS: SummaryAction[] = [
  { text: 'Preet to follow up with DevOps re: API gateway by Thursday', done: false },
  { text: 'Sarah to send Acme Corp contract draft', done: false },
  { text: 'Update sprint board with revised billing integration scope', done: true },
]
