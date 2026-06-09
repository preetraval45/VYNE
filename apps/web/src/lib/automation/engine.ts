"use client";

import {
  useActivityStore,
  type ActivityRecordType,
} from "@/lib/stores/activity";
import { useAutomationsStore } from "@/lib/stores/automations";

/**
 * Cross-module automation engine (the D3 foundation — one engine, every module).
 *
 * A module fires `runAutomations(...)` whenever something happens to one of its
 * records (a deal changes stage, an order ships, a leave request is filed…).
 * The engine looks up the org's enabled rules that match `{ module, trigger }`
 * and runs each rule's action. Two kinds of action:
 *
 *  - **entity-agnostic** (e.g. `log_note`) — the engine performs them itself
 *    against the shared, Postgres-backed activity feed, so they work for ANY
 *    record type with zero per-module code.
 *  - **field mutations** (`set_*`) — the engine hands the field + value back to
 *    the calling store via `applyField`, because only that store knows how to
 *    persist its own row. The store applies the change directly (never via its
 *    own update path) so a rule can't recurse the trigger that fired it.
 *
 * To onboard a new module: define its trigger keys, call `runAutomations` from
 * its store, and pass an `applyField`. No engine changes required.
 */
export interface AutomationContext {
  /** Entity domain the trigger belongs to, e.g. "crm", "ops", "hr". */
  module: string;
  /** The matched trigger value — for CRM, the new stage; for Ops, the status. */
  trigger: string;
  /** Activity-feed record type so engine-run actions attach to the right record. */
  recordType: ActivityRecordType;
  recordId: string;
  /** Persist a field change on the caller's own record (store-specific). */
  applyField?: (field: string, value: string | number) => void;
}

export function runAutomations(ctx: AutomationContext): void {
  const rules = useAutomationsStore
    .getState()
    .rules.filter(
      (r) => r.enabled && r.module === ctx.module && r.trigger === ctx.trigger,
    );
  if (rules.length === 0) return;

  for (const rule of rules) {
    switch (rule.actionType) {
      case "log_note":
        if (rule.actionValue) {
          useActivityStore.getState().log({
            recordType: ctx.recordType,
            recordId: ctx.recordId,
            kind: "note",
            verb: "logged",
            summary: "Automation",
            body: rule.actionValue,
            actor: "Automation",
          });
        }
        break;
      case "set_next_action":
        ctx.applyField?.("nextAction", rule.actionValue);
        break;
      case "set_probability":
        ctx.applyField?.(
          "probability",
          Math.max(0, Math.min(100, Number(rule.actionValue) || 0)),
        );
        break;
    }
  }
}
