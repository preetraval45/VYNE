"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Custom statuses per workflow (20.2). Replaces hard-coded stage
 * lists ("Discovery → Negotiation → Won") with per-workspace
 * configuration. Each entity type has its own ordered status list,
 * and each status carries a colour + group ("open" / "in-progress"
 * / "won" / "lost") so analytics + automation can reason without
 * label parsing.
 */

export type WorkflowEntity =
  | "deal"
  | "task"
  | "project"
  | "invoice"
  | "ticket"
  | "request";

export type StatusGroup =
  | "backlog"
  | "in-progress"
  | "blocked"
  | "won"
  | "lost"
  | "done"
  | "cancelled";

export interface WorkflowStatus {
  id: string;
  label: string;
  /** Display colour for chips / kanban column headers. */
  color: string;
  /** Bucket the status belongs to — automation / analytics rely on this. */
  group: StatusGroup;
  /** Ordering inside the workflow. Lower = earlier in the funnel. */
  order: number;
}

interface WorkflowStatusesStore {
  statuses: Record<WorkflowEntity, WorkflowStatus[]>;
  setStatuses: (entity: WorkflowEntity, statuses: WorkflowStatus[]) => void;
  addStatus: (entity: WorkflowEntity, status: Omit<WorkflowStatus, "id" | "order">) => WorkflowStatus;
  removeStatus: (entity: WorkflowEntity, id: string) => void;
  moveStatus: (entity: WorkflowEntity, id: string, direction: "up" | "down") => void;
  resetEntity: (entity: WorkflowEntity) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_STATUSES: Record<WorkflowEntity, WorkflowStatus[]> = {
  deal: [
    { id: "d-1", label: "Discovery", color: "#94A3B8", group: "in-progress", order: 0 },
    { id: "d-2", label: "Qualified", color: "#3B82F6", group: "in-progress", order: 1 },
    { id: "d-3", label: "Negotiation", color: "#F59E0B", group: "in-progress", order: 2 },
    { id: "d-4", label: "Won", color: "#22C55E", group: "won", order: 3 },
    { id: "d-5", label: "Lost", color: "#EF4444", group: "lost", order: 4 },
  ],
  task: [
    { id: "t-1", label: "Todo", color: "#94A3B8", group: "backlog", order: 0 },
    { id: "t-2", label: "In Progress", color: "#3B82F6", group: "in-progress", order: 1 },
    { id: "t-3", label: "Blocked", color: "#EF4444", group: "blocked", order: 2 },
    { id: "t-4", label: "Done", color: "#22C55E", group: "done", order: 3 },
  ],
  project: [
    { id: "p-1", label: "Planning", color: "#94A3B8", group: "backlog", order: 0 },
    { id: "p-2", label: "Active", color: "#06B6D4", group: "in-progress", order: 1 },
    { id: "p-3", label: "On Hold", color: "#F59E0B", group: "blocked", order: 2 },
    { id: "p-4", label: "Complete", color: "#22C55E", group: "done", order: 3 },
  ],
  invoice: [
    { id: "i-1", label: "Draft", color: "#94A3B8", group: "backlog", order: 0 },
    { id: "i-2", label: "Sent", color: "#3B82F6", group: "in-progress", order: 1 },
    { id: "i-3", label: "Overdue", color: "#EF4444", group: "blocked", order: 2 },
    { id: "i-4", label: "Paid", color: "#22C55E", group: "won", order: 3 },
    { id: "i-5", label: "Cancelled", color: "#64748B", group: "cancelled", order: 4 },
  ],
  ticket: [
    { id: "k-1", label: "New", color: "#94A3B8", group: "backlog", order: 0 },
    { id: "k-2", label: "In Progress", color: "#3B82F6", group: "in-progress", order: 1 },
    { id: "k-3", label: "Waiting", color: "#F59E0B", group: "blocked", order: 2 },
    { id: "k-4", label: "Resolved", color: "#22C55E", group: "done", order: 3 },
  ],
  request: [
    { id: "r-1", label: "Submitted", color: "#94A3B8", group: "backlog", order: 0 },
    { id: "r-2", label: "Reviewing", color: "#3B82F6", group: "in-progress", order: 1 },
    { id: "r-3", label: "Approved", color: "#22C55E", group: "won", order: 2 },
    { id: "r-4", label: "Rejected", color: "#EF4444", group: "lost", order: 3 },
  ],
};

export const useWorkflowStatuses = create<WorkflowStatusesStore>()(
  persist(
    (set, get) => ({
      statuses: DEFAULT_STATUSES,
      setStatuses: (entity, statuses) =>
        set((s) => ({ statuses: { ...s.statuses, [entity]: statuses } })),
      addStatus: (entity, status) => {
        const existing = get().statuses[entity];
        const row: WorkflowStatus = {
          id: newId(),
          ...status,
          order: existing.length,
        };
        set((s) => ({
          statuses: { ...s.statuses, [entity]: [...existing, row] },
        }));
        return row;
      },
      removeStatus: (entity, id) =>
        set((s) => ({
          statuses: {
            ...s.statuses,
            [entity]: s.statuses[entity].filter((x) => x.id !== id),
          },
        })),
      moveStatus: (entity, id, direction) =>
        set((s) => {
          const list = [...s.statuses[entity]].sort((a, b) => a.order - b.order);
          const idx = list.findIndex((x) => x.id === id);
          if (idx < 0) return s;
          const swap = direction === "up" ? idx - 1 : idx + 1;
          if (swap < 0 || swap >= list.length) return s;
          [list[idx], list[swap]] = [list[swap], list[idx]];
          list.forEach((x, i) => (x.order = i));
          return { statuses: { ...s.statuses, [entity]: list } };
        }),
      resetEntity: (entity) =>
        set((s) => ({
          statuses: { ...s.statuses, [entity]: DEFAULT_STATUSES[entity] },
        })),
    }),
    { name: "vyne-workflow-statuses", version: 1 },
  ),
);

/** Module-level helper for non-React code. */
export function getStatuses(entity: WorkflowEntity): WorkflowStatus[] {
  return [...useWorkflowStatuses.getState().statuses[entity]].sort(
    (a, b) => a.order - b.order,
  );
}
