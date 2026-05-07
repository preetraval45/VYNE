"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { AskAiSuggestion } from "@/components/shared/AskAiButton";

/**
 * useAiSuggestedPrompts — derive a short list of contextually-relevant
 * prompts for the current page. Every dashboard module should expose
 * its highest-leverage AI questions; the AskAiButton dropdown reads
 * from this hook so the suggestions evolve as the user navigates.
 *
 * Route → suggestion map below. Adding a new module is one entry.
 * Falls through to a generic three-prompt list when no match.
 *
 *   const prompts = useAiSuggestedPrompts();
 *   <AskAiButton suggestions={prompts} noun="this page" />
 */
export function useAiSuggestedPrompts(
  override?: AskAiSuggestion[],
): AskAiSuggestion[] {
  const pathname = usePathname() ?? "";
  return useMemo(() => {
    if (override && override.length > 0) return override;
    const seg = pathname.split("/").filter(Boolean)[0] ?? "";
    return MODULE_PROMPTS[seg] ?? GENERIC_PROMPTS;
  }, [pathname, override]);
}

/** Common prompts that work on every page. */
const GENERIC_PROMPTS: AskAiSuggestion[] = [
  { label: "Summarise this page", prompt: "Summarise the data on the current page." },
  { label: "What changed in the last 7 days?", prompt: "What's changed in my workspace in the last 7 days?" },
  { label: "What should I focus on now?", prompt: "Looking at the workspace, what's the single highest-leverage thing I should do today?" },
];

/** Module-specific prompt sets. Mapped by the first path segment. */
const MODULE_PROMPTS: Record<string, AskAiSuggestion[]> = {
  home: [
    { label: "Morning brief", prompt: "Give me my morning brief — what changed overnight, what needs my attention, what to focus on first." },
    { label: "Generate standup", prompt: "Draft a standup update from my last 24 hours of activity." },
    { label: "What's blocking me?", prompt: "What's blocking me right now across CRM / projects / finance?" },
  ],
  crm: [
    { label: "Stalled deals", prompt: "Show me deals that have been idle in their stage longer than the median for that stage. Suggest a re-engagement step for each." },
    { label: "Forecast this quarter", prompt: "Build a weighted-pipeline forecast for the current quarter and call out the deals that swing the number most." },
    { label: "Top 5 to focus on", prompt: "Of my open deals, which 5 should I work on this week and why?" },
    { label: "Draft outreach to top deal", prompt: "Draft a personalised follow-up email to my highest-value deal." },
  ],
  sales: [
    { label: "Pace to quota", prompt: "Where am I tracking against quota for the current period? Who's behind and what do they need?" },
    { label: "Top reps this month", prompt: "Rank reps by closed-won this month and call out anyone who's slipping vs. last month." },
    { label: "Deals likely to close", prompt: "List deals likely to close in the next 14 days and their key open issues." },
  ],
  projects: [
    { label: "Sprint plan suggestion", prompt: "Suggest a balanced sprint from my open tasks across all projects, packed to ~30 hours per teammate." },
    { label: "At-risk projects", prompt: "Which projects have the most overdue tasks or stalled progress? Tell me what's blocking each one." },
    { label: "Velocity last 4 sprints", prompt: "Show velocity for the last 4 sprints and call out trends." },
  ],
  invoicing: [
    { label: "Overdue invoices", prompt: "List overdue invoices, sorted by days late × amount, and suggest a dunning step for each." },
    { label: "Cash projection", prompt: "Project AR collections for the next 30 days using current invoice ageing and historical payment patterns." },
    { label: "Repeat late payers", prompt: "Which customers have been late ≥ 2 times in the last 6 months?" },
  ],
  finance: [
    { label: "Month-end close blockers", prompt: "What's blocking month-end close right now? Anomalies, unposted items, miscategorised entries." },
    { label: "Anomalies vs last month", prompt: "Compare expense categories vs. last month and flag anything ≥ 2× normal." },
    { label: "13-week cashflow", prompt: "Give me a 13-week cashflow forecast based on current pipeline + AR." },
  ],
  expenses: [
    { label: "Pending approvals", prompt: "Walk me through pending expense approvals — flag policy violations." },
    { label: "Top spenders this month", prompt: "Top spenders this month and what they spent on." },
    { label: "Categorise pending", prompt: "Suggest categories for any expense missing one." },
  ],
  ops: [
    { label: "Reorder now", prompt: "Which products are below threshold and should be reordered? Suggest quantities." },
    { label: "Slow-moving SKUs", prompt: "List SKUs with no sales in 30 days; suggest discontinue / promote." },
    { label: "Stockout risk", prompt: "Predict stockout risk for the next 14 days using current burn rate." },
  ],
  contacts: [
    { label: "Stale relationships", prompt: "List contacts I haven't engaged in 60+ days, prioritised by their company's revenue." },
    { label: "Decision-makers in pipeline", prompt: "Which decision-makers are tied to my open deals? Flag any I haven't contacted recently." },
    { label: "Enrich missing fields", prompt: "Find contacts missing email or title and suggest enriched values." },
  ],
  hr: [
    { label: "Hiring funnel", prompt: "Walk me through the open roles and where each candidate sits." },
    { label: "PTO conflicts", prompt: "Flag any PTO that overlaps with critical project milestones." },
    { label: "1:1 prep for me", prompt: "Prep a 1:1 agenda from my reports' last week of activity." },
  ],
  marketing: [
    { label: "Campaign ROI", prompt: "Rank campaigns by ROI; flag any underperforming." },
    { label: "Funnel drop-offs", prompt: "Where are leads dropping off the funnel? Suggest experiments." },
    { label: "Audience suggestions", prompt: "Suggest 3 audience segments worth a campaign next month." },
  ],
  manufacturing: [
    { label: "Capacity bottleneck", prompt: "Where's my capacity bottleneck right now? Which work centre is overloaded?" },
    { label: "Late WOs", prompt: "List work orders running late and root-cause each one." },
    { label: "BOM cost trend", prompt: "How has BOM cost shifted over the last 90 days?" },
  ],
  observe: [
    { label: "Active incidents", prompt: "Walk me through active incidents — root cause hypothesis, blast radius, suggested mitigation, status-page draft." },
    { label: "Latency regressions", prompt: "Endpoints whose p95 latency rose ≥ 20% this week." },
    { label: "Error budget burn", prompt: "Which SLOs are burning their error budget fastest?" },
  ],
  code: [
    { label: "PRs blocking ship", prompt: "Which PRs are blocking the next deploy? Who needs to act and what's the ask?" },
    { label: "Slow CI", prompt: "Which jobs are dragging CI? Suggest where to invest." },
    { label: "DORA snapshot", prompt: "Snapshot current DORA metrics (deploy freq, lead time, change-fail, MTTR)." },
  ],
  chat: [
    { label: "Catch me up", prompt: "Catch me up on what I've missed in #general since yesterday." },
    { label: "Decisions logged", prompt: "List decisions made in chat over the last 7 days." },
    { label: "Threads needing my reply", prompt: "Which threads are waiting on me to respond?" },
  ],
  docs: [
    { label: "Stale docs", prompt: "List docs not edited in 90+ days — flag any that reference removed features." },
    { label: "Most-viewed", prompt: "Which docs are most viewed but rarely edited? Likely outdated." },
  ],
  roadmap: [
    { label: "Theme summary", prompt: "Summarise our roadmap by theme. What's overweight vs. customer-requested?" },
    { label: "Customer-requested gaps", prompt: "Top customer-requested items NOT on the roadmap." },
  ],
  automations: [
    { label: "Failing workflows", prompt: "Which automations are failing most? Root-cause each." },
    { label: "ROI per automation", prompt: "Estimate hours saved per active automation." },
  ],
  reporting: [
    { label: "What should I track?", prompt: "Suggest 3 metrics I should be tracking but currently am not." },
    { label: "Schedule a report", prompt: "Help me schedule a weekly email of MRR by plan." },
  ],
  maintenance: [
    { label: "At-risk equipment", prompt: "Which equipment is showing patterns suggesting impending failure?" },
    { label: "Spare-part reorder", prompt: "Spare parts to reorder based on past 90 days of work orders." },
  ],
  purchase: [
    { label: "Vendor consolidation", prompt: "Suggest 3 vendors to consolidate based on overlap and spend." },
    { label: "Contract expiry", prompt: "Which contracts expire in the next 60 days?" },
  ],
  calendar: [
    { label: "Find a 30-min slot", prompt: "Find a 30-minute slot next week with my team." },
    { label: "Meeting cost this week", prompt: "Estimate meeting cost (attendees × hourly) for this week." },
  ],
  timesheet: [
    { label: "Auto-fill week", prompt: "Auto-fill my timesheet for this week from my calendar + commits + tasks closed." },
    { label: "Billable %", prompt: "What was my billable % last week vs. the team average?" },
  ],
  training: [
    { label: "Skill gaps", prompt: "Skill gaps across my team based on completed vs. assigned training." },
  ],
  playbooks: [
    { label: "Outcome correlation", prompt: "Which playbooks correlate with the fastest deal close / fastest incident resolution?" },
  ],
  runbooks: [
    { label: "Suggested runbook", prompt: "Given the active alerts, which runbook should I run first and why?" },
  ],
  help: [
    { label: "Find articles for me", prompt: "What's the best help article for the issue I'm working on right now?" },
  ],
};
