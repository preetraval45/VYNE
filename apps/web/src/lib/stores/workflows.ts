"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkflowStep {
  id: string;
  title: string;
  detail?: string;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  steps: Array<{ title: string; detail?: string }>;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  emoji: string;
  channelId: string;
  startedBy: string;
  startedAt: string;
  steps: WorkflowStep[];
}

interface WorkflowsState {
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];
  spawnInstance: (
    templateId: string,
    channelId: string,
    startedBy?: string,
  ) => WorkflowInstance | null;
  toggleStep: (instanceId: string, stepId: string, byUser?: string) => void;
  /** All instances visible in a channel, oldest first */
  forChannel: (channelId: string) => WorkflowInstance[];
  /** Mark an instance as complete + optionally archive */
  archive: (instanceId: string) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const BUILTIN_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: "new-customer-onboarding",
    name: "New customer onboarding",
    description: "Standard kickoff for any newly closed-won deal",
    emoji: "🤝",
    steps: [
      {
        title: "Send welcome email + intro CSM",
        detail: "Within 1 business day of contract sign",
      },
      { title: "Schedule 60-min kickoff call" },
      { title: "Provision workspace + invite admin" },
      { title: "Walk through onboarding checklist live" },
      { title: "Schedule 30-day check-in" },
      { title: "Add to weekly health-check report" },
    ],
  },
  {
    id: "release-checklist",
    name: "Release checklist",
    description: "Pre-flight checks before shipping a production release",
    emoji: "🚀",
    steps: [
      { title: "All tests green on main" },
      { title: "Migrations reviewed + dry-run on staging" },
      { title: "Release notes drafted" },
      { title: "Customer-impact comms drafted" },
      { title: "Feature flags configured for rollout" },
      { title: "Rollback plan documented" },
      { title: "On-call notified" },
    ],
  },
  {
    id: "incident-response",
    name: "Incident response",
    description: "Standard ops for a Sev-1 / Sev-2 incident",
    emoji: "🚨",
    steps: [
      { title: "Declare severity + open #incident-N channel" },
      { title: "Assign Incident Commander + Comms" },
      {
        title: "Post initial status update (impact + ETA)",
        detail: "Within 5 minutes",
      },
      { title: "Identify root cause hypothesis" },
      { title: "Mitigate impact (rollback / hotfix / scaling)" },
      { title: "Verify mitigation + monitor for 30 min" },
      { title: "Post resolution update" },
      { title: "Schedule post-mortem within 5 business days" },
    ],
  },
  {
    id: "weekly-1-1",
    name: "Weekly 1:1",
    description: "Manager / direct-report agenda template",
    emoji: "👥",
    steps: [
      { title: "Wins from last week" },
      { title: "Blockers / where you need help" },
      { title: "Career growth check-in" },
      { title: "Feedback (both directions)" },
      { title: "Action items + dates" },
    ],
  },
  {
    id: "deal-handoff",
    name: "Sales → CSM deal handoff",
    description: "Transfer a closed-won deal to the success team",
    emoji: "📦",
    steps: [
      { title: "Update CRM with final contract terms" },
      { title: "Schedule warm intro between AE and CSM" },
      { title: "Share recordings of last 3 calls" },
      { title: "Document champion + decision-makers" },
      { title: "Note known risks + competitor context" },
      { title: "CSM owns relationship from day 30" },
    ],
  },
];

function instanceFromTemplate(
  tpl: WorkflowTemplate,
  channelId: string,
  startedBy: string,
): WorkflowInstance {
  return {
    id: newId(),
    templateId: tpl.id,
    templateName: tpl.name,
    emoji: tpl.emoji,
    channelId,
    startedBy,
    startedAt: new Date().toISOString(),
    steps: tpl.steps.map((s) => ({
      id: newId(),
      title: s.title,
      detail: s.detail,
      done: false,
    })),
  };
}

export const useWorkflowsStore = create<WorkflowsState>()(
  persist(
    (set, get) => ({
      templates: BUILTIN_WORKFLOWS,
      instances: [],

      spawnInstance: (templateId, channelId, startedBy = "You") => {
        const tpl = get().templates.find((t) => t.id === templateId);
        if (!tpl) return null;
        const inst = instanceFromTemplate(tpl, channelId, startedBy);
        set((s) => ({ instances: [...s.instances, inst] }));
        return inst;
      },

      toggleStep: (instanceId, stepId, byUser = "You") =>
        set((s) => ({
          instances: s.instances.map((inst) =>
            inst.id !== instanceId
              ? inst
              : {
                  ...inst,
                  steps: inst.steps.map((step) =>
                    step.id !== stepId
                      ? step
                      : {
                          ...step,
                          done: !step.done,
                          doneBy: !step.done ? byUser : undefined,
                          doneAt: !step.done
                            ? new Date().toISOString()
                            : undefined,
                        },
                  ),
                },
          ),
        })),

      forChannel: (channelId) =>
        get()
          .instances.filter((i) => i.channelId === channelId)
          .sort(
            (a, b) =>
              new Date(a.startedAt).getTime() -
              new Date(b.startedAt).getTime(),
          ),

      archive: (instanceId) =>
        set((s) => ({
          instances: s.instances.filter((i) => i.id !== instanceId),
        })),
    }),
    {
      name: "vyne-workflows",
      version: 1,
      // Always overlay the latest builtin templates so new workflows ship
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.templates = BUILTIN_WORKFLOWS;
      },
    },
  ),
);
