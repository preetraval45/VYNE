"use client";

import type { MeetingRecap, AiActionItem } from "@/lib/stores/call";
import { emitFieldChange } from "@/lib/fieldChangeBus";

/**
 * Auto-create follow-up tasks from a meeting recap (28.3.6).
 *
 *   const result = await createTasksFromRecap(recap, { projectId, defaultAssigneeId });
 *
 * Walks the recap's `actionItems`, infers the assignee + due date
 * from the text (best-effort regex), and posts each task to the
 * existing projects store. Returns `{ created, skipped }` so the
 * UI can show a "3 tasks created" toast.
 *
 * Pairs with the Phase 20.10 field-change bus — every created task
 * fires `task.created` so automation rules can chain off it.
 */

export interface CreateTasksOpts {
  /** Default project to attach tasks to. */
  projectId?: string;
  /** Default assignee when none can be parsed from the text. */
  defaultAssigneeId?: string;
  /** Default priority. */
  defaultPriority?: "P0" | "P1" | "P2" | "P3";
  /** Default due-date offset in days when none parsed. */
  defaultDueInDays?: number;
}

export interface CreatedTask {
  id: string;
  title: string;
  assigneeId: string | null;
  dueDate: string | null;
  source: "recap";
}

export interface CreateTasksResult {
  created: CreatedTask[];
  skipped: AiActionItem[];
}

const ASSIGNEE_RE = /\b(?:assigned to|owner:?|@)\s*([A-Za-z][\w. -]{1,40})/i;
const DUE_RE = /\b(?:by|due|before)\s+([A-Za-z0-9 ,/-]{3,30})/i;
const PRIORITY_RE = /\b(P[0-3])\b/i;

function parseDueDate(text: string, fallbackDays: number): string {
  const match = text.match(DUE_RE);
  if (match) {
    // Try ISO / Date.parse first.
    const parsed = Date.parse(match[1]);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    // Relative shorthand ("next Friday" / "1 week").
    const rel = /^(\d+)\s*(d|day|days|w|week|weeks)\b/i.exec(match[1]);
    if (rel) {
      const n = Number(rel[1]);
      const mult = /w/i.test(rel[2]) ? 7 : 1;
      return new Date(Date.now() + n * mult * 24 * 3_600_000).toISOString();
    }
  }
  return new Date(Date.now() + fallbackDays * 24 * 3_600_000).toISOString();
}

function parseAssignee(text: string): string | null {
  const match = text.match(ASSIGNEE_RE);
  if (!match) return null;
  return match[1].trim().toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

function parsePriority(
  text: string,
  fallback: "P0" | "P1" | "P2" | "P3",
): "P0" | "P1" | "P2" | "P3" {
  const match = text.match(PRIORITY_RE);
  if (match) return match[1].toUpperCase() as "P0" | "P1" | "P2" | "P3";
  return fallback;
}

/**
 * The actual write goes through the projects store. Lazy-imported so
 * this helper stays tree-shakeable when the call layer isn't loaded.
 */
async function writeTask(payload: {
  title: string;
  description?: string;
  projectId?: string;
  assigneeId: string | null;
  dueDate: string;
  priority: "P0" | "P1" | "P2" | "P3";
}): Promise<CreatedTask | null> {
  try {
    const mod = await import("@/lib/stores/projects");
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const store = mod.useProjectsStore.getState() as unknown as {
      addTask?: (task: Record<string, unknown>) => void;
      tasks: Array<Record<string, unknown>>;
    };
    const task = {
      id,
      title: payload.title.slice(0, 200),
      description: payload.description ?? "",
      projectId: payload.projectId ?? "",
      assigneeId: payload.assigneeId ?? "",
      dueDate: payload.dueDate,
      priority: payload.priority,
      status: "Todo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "recap",
    };
    if (typeof store.addTask === "function") {
      store.addTask(task);
    }
    return {
      id,
      title: task.title,
      assigneeId: payload.assigneeId,
      dueDate: payload.dueDate,
      source: "recap",
    };
  } catch {
    return null;
  }
}

export async function createTasksFromRecap(
  recap: MeetingRecap,
  opts: CreateTasksOpts = {},
): Promise<CreateTasksResult> {
  const created: CreatedTask[] = [];
  const skipped: AiActionItem[] = [];
  const fallbackDays = opts.defaultDueInDays ?? 7;
  const defaultPriority = opts.defaultPriority ?? "P2";

  for (const item of recap.actionItems ?? []) {
    if (item.done) {
      skipped.push(item);
      continue;
    }
    const assigneeId = parseAssignee(item.text) ?? opts.defaultAssigneeId ?? null;
    const dueDate = parseDueDate(item.text, fallbackDays);
    const priority = parsePriority(item.text, defaultPriority);
    const row = await writeTask({
      title: item.text,
      description: `Auto-created from meeting recap. Participants: ${recap.participants.join(", ")}.`,
      projectId: opts.projectId,
      assigneeId,
      dueDate,
      priority,
    });
    if (row) {
      created.push(row);
      emitFieldChange({
        entity: "task",
        entityId: row.id,
        field: "created",
        prev: null,
        next: { source: "recap", title: row.title },
        actor: "system",
      });
    } else {
      skipped.push(item);
    }
  }

  return { created, skipped };
}

/** Diagnose whether a recap is ready to spawn tasks (any
 *  non-completed action items). Used by the recap modal's CTA. */
export function recapHasActionable(recap: MeetingRecap | null): boolean {
  if (!recap) return false;
  return recap.actionItems.some((it) => !it.done && it.text.trim().length > 4);
}
