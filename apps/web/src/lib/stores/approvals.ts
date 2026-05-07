"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Multi-step approval flows with SLA + escalation (20.3).
 *
 *   const flow = createApproval({
 *     entity: "expense",
 *     entityId: "exp-42",
 *     name: "$5,300 hotel — David's trip",
 *     steps: [
 *       { approvers: ["lead"], slaHours: 24 },
 *       { approvers: ["finance", "ops-lead"], requireAll: false, slaHours: 24 },
 *       { approvers: ["cfo"], slaHours: 48 },
 *     ],
 *   });
 *
 * The store tracks per-step decisions, current step, and breach
 * status. SLA breach (now > stepStartedAt + slaHours) automatically
 * marks the step "escalated"; the surrounding UI / automation can
 * then ping the next-tier approver, post to Slack, etc.
 */

export type StepDecision = "pending" | "approved" | "rejected" | "escalated";

export interface ApprovalStep {
  /** User ids / role labels who can act on this step. */
  approvers: string[];
  /** When true, every approver must approve. Default false (any one is enough). */
  requireAll?: boolean;
  /** SLA in hours from when the step starts. Default 24. */
  slaHours?: number;
  /** Set when the step starts (becomes the current step). */
  startedAt?: string;
  /** Each approver's individual decision. */
  decisions?: Array<{
    approver: string;
    decision: "approved" | "rejected";
    note?: string;
    decidedAt: string;
  }>;
  /** Resolved status of the step. */
  status: StepDecision;
}

export interface Approval {
  id: string;
  /** Entity the approval is gating — expense / PO / contract / record. */
  entity: string;
  entityId: string;
  /** Human-readable summary shown in the inbox. */
  name: string;
  /** ISO. */
  createdAt: string;
  steps: ApprovalStep[];
  /** Index of the currently-active step (-1 when complete). */
  currentStep: number;
  /** Final state once every step resolves. */
  finalStatus: "pending" | "approved" | "rejected";
}

interface ApprovalsStore {
  approvals: Approval[];
  create: (
    payload: Omit<Approval, "id" | "createdAt" | "currentStep" | "finalStatus" | "steps"> & {
      steps: Array<Omit<ApprovalStep, "status" | "startedAt" | "decisions">>;
    },
  ) => Approval;
  approveStep: (id: string, approver: string, note?: string) => void;
  rejectStep: (id: string, approver: string, note?: string) => void;
  /** Mark every breached pending step as escalated. Idempotent. */
  reconcileSlas: () => void;
  remove: (id: string) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `appr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function startStep(step: ApprovalStep): ApprovalStep {
  return {
    ...step,
    startedAt: new Date().toISOString(),
    decisions: step.decisions ?? [],
    status: "pending",
  };
}

function resolveStep(step: ApprovalStep): ApprovalStep {
  if (step.status === "approved" || step.status === "rejected") return step;
  const approved = step.decisions?.filter((d) => d.decision === "approved") ?? [];
  const rejected = step.decisions?.filter((d) => d.decision === "rejected") ?? [];
  if (rejected.length > 0) {
    return { ...step, status: "rejected" };
  }
  if (step.requireAll) {
    if (approved.length >= step.approvers.length) {
      return { ...step, status: "approved" };
    }
  } else if (approved.length > 0) {
    return { ...step, status: "approved" };
  }
  return step;
}

export const useApprovals = create<ApprovalsStore>()(
  persist(
    (set, get) => ({
      approvals: [],
      create: (payload) => {
        const steps: ApprovalStep[] = payload.steps.map((s) => ({
          ...s,
          status: "pending",
        }));
        if (steps.length > 0) steps[0] = startStep(steps[0]);
        const row: Approval = {
          id: newId(),
          entity: payload.entity,
          entityId: payload.entityId,
          name: payload.name,
          createdAt: new Date().toISOString(),
          steps,
          currentStep: steps.length > 0 ? 0 : -1,
          finalStatus: "pending",
        };
        set((s) => ({ approvals: [row, ...s.approvals] }));
        return row;
      },
      approveStep: (id, approver, note) => {
        set((s) => ({
          approvals: s.approvals.map((a) => {
            if (a.id !== id) return a;
            const stepIdx = a.currentStep;
            if (stepIdx < 0) return a;
            const step = a.steps[stepIdx];
            const decisions = [
              ...(step.decisions ?? []),
              {
                approver,
                decision: "approved" as const,
                note,
                decidedAt: new Date().toISOString(),
              },
            ];
            const updated = resolveStep({ ...step, decisions });
            const next = [...a.steps];
            next[stepIdx] = updated;
            let currentStep = stepIdx;
            let finalStatus: Approval["finalStatus"] = "pending";
            if (updated.status === "approved") {
              if (stepIdx + 1 >= a.steps.length) {
                currentStep = -1;
                finalStatus = "approved";
              } else {
                currentStep = stepIdx + 1;
                next[currentStep] = startStep(next[currentStep]);
              }
            }
            return { ...a, steps: next, currentStep, finalStatus };
          }),
        }));
      },
      rejectStep: (id, approver, note) => {
        set((s) => ({
          approvals: s.approvals.map((a) => {
            if (a.id !== id) return a;
            const stepIdx = a.currentStep;
            if (stepIdx < 0) return a;
            const step = a.steps[stepIdx];
            const decisions = [
              ...(step.decisions ?? []),
              {
                approver,
                decision: "rejected" as const,
                note,
                decidedAt: new Date().toISOString(),
              },
            ];
            const updated = { ...step, decisions, status: "rejected" as const };
            const next = [...a.steps];
            next[stepIdx] = updated;
            return {
              ...a,
              steps: next,
              currentStep: -1,
              finalStatus: "rejected",
            };
          }),
        }));
      },
      reconcileSlas: () => {
        const now = Date.now();
        set((s) => ({
          approvals: s.approvals.map((a) => {
            if (a.currentStep < 0) return a;
            const step = a.steps[a.currentStep];
            const startedAt = step.startedAt
              ? new Date(step.startedAt).getTime()
              : 0;
            const slaMs = (step.slaHours ?? 24) * 3_600_000;
            if (
              step.status === "pending" &&
              startedAt > 0 &&
              now > startedAt + slaMs
            ) {
              const next = [...a.steps];
              next[a.currentStep] = { ...step, status: "escalated" };
              return { ...a, steps: next };
            }
            return a;
          }),
        }));
      },
      remove: (id) =>
        set((s) => ({ approvals: s.approvals.filter((a) => a.id !== id) })),
    }),
    { name: "vyne-approvals", version: 1 },
  ),
);
