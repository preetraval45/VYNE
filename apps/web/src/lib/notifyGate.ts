"use client";

import { useSettingsStore } from "@/lib/stores/settings";
import type { ModuleId } from "@/lib/stores/notificationCenter";

/**
 * Single gatekeeper for "should this notification surface to the user?".
 * Combines:
 *   - per-module mute (settings.notificationSettings.mutedModules)
 *   - do-not-disturb schedule (dndEnabled + dndStart/End/Days)
 *
 * Returns:
 *   "fire"  → push to bell + show toast/web push as normal
 *   "quiet" → push to bell silently (badge updates) but suppress toast
 *             and web push so the user isn't interrupted
 *   "drop"  → don't even add to the bell (module is muted)
 */
export type NotifyDecision = "fire" | "quiet" | "drop";

function inDndWindow(now: Date): boolean {
  const settings = useSettingsStore.getState().notificationSettings;
  if (!settings.dndEnabled) return false;
  const day = now.getDay();
  if (!settings.dndDays.includes(day)) return false;
  const [sh, sm] = settings.dndStart.split(":").map(Number);
  const [eh, em] = settings.dndEnd.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  // Overnight window (e.g. 22:00 → 08:00) — wraps midnight
  if (start <= end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function shouldNotify(module: ModuleId): NotifyDecision {
  const settings = useSettingsStore.getState().notificationSettings;
  if (settings.mutedModules?.[module]) return "drop";
  if (inDndWindow(new Date())) return "quiet";
  return "fire";
}

/** Convenience predicate when callers only care about "show now or not". */
export function isQuietNow(module: ModuleId): boolean {
  return shouldNotify(module) !== "fire";
}
