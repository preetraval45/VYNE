"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-channel notification schedule (UI_UPGRADE_PLAN.md 6.8).
 *
 * Each channel can have its own DND window — e.g. "#alerts notifies
 * 24/7" but "#random only notifies weekdays 9-5". Layered on top of
 * the workspace-wide DND in `useSettingsStore.notificationSettings`:
 * if the channel-level rule says quiet, the gate quiets even if the
 * global rule would fire.
 *
 * Keyed by channelId. `mode = "always"` means notify regardless of
 * global DND; "schedule" enforces the window; "muted" drops every
 * event for the channel.
 */

export type ChannelDndMode = "always" | "schedule" | "muted";

export interface ChannelDndRule {
  channelId: string;
  mode: ChannelDndMode;
  /** HH:MM, 24h. Local time. Only used in "schedule" mode. */
  start: string;
  end: string;
  /** 0-6 (Sun..Sat). Only used in "schedule" mode. */
  days: number[];
  updatedAt: string;
}

interface ChannelDndStore {
  rules: Record<string, ChannelDndRule>;

  setRule: (
    payload: Omit<ChannelDndRule, "updatedAt">,
  ) => ChannelDndRule;
  clearRule: (channelId: string) => void;
  ruleFor: (channelId: string) => ChannelDndRule | null;
  /** Decision for a channel given the current local time. */
  decisionFor: (
    channelId: string,
    now?: Date,
  ) => "fire" | "quiet" | "drop" | null;
}

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function inWindow(rule: ChannelDndRule, now: Date): boolean {
  if (!rule.days.includes(now.getDay())) return false;
  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  if (startM <= endM) return minutes >= startM && minutes < endM;
  return minutes >= startM || minutes < endM;
}

export const useChannelDnd = create<ChannelDndStore>()(
  persist(
    (set, get) => ({
      rules: {},

      setRule: (payload) => {
        const row: ChannelDndRule = {
          ...payload,
          days: payload.days ?? DEFAULT_DAYS,
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ rules: { ...s.rules, [payload.channelId]: row } }));
        return row;
      },
      clearRule: (channelId) =>
        set((s) => {
          const next = { ...s.rules };
          delete next[channelId];
          return { rules: next };
        }),
      ruleFor: (channelId) => get().rules[channelId] ?? null,
      decisionFor: (channelId, now = new Date()) => {
        const rule = get().rules[channelId];
        if (!rule) return null;
        if (rule.mode === "muted") return "drop";
        if (rule.mode === "always") return "fire";
        // schedule: notify only when inside the window.
        return inWindow(rule, now) ? "fire" : "quiet";
      },
    }),
    { name: "vyne-channel-dnd", version: 1 },
  ),
);

/** Module-level peek for non-React callers (notifyGate). */
export function channelDecisionFor(
  channelId: string,
  now: Date = new Date(),
): "fire" | "quiet" | "drop" | null {
  return useChannelDnd.getState().decisionFor(channelId, now);
}
