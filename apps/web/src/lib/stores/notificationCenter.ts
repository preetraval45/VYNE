"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Notification center store — the bell icon's source of truth.
 *
 * Distinct from `useNotifications` (browser Notification API) and
 * `NotificationSettings` (user prefs). This is the in-app inbox: a
 * scrollable, grouped, dismissable list with read state, snooze,
 * per-module filtering, and undo.
 *
 * Persisted to localStorage so the bell reflects history across
 * refreshes; trimmed to MAX_ENTRIES so the JSON blob doesn't balloon.
 */

export type ModuleId =
  | "crm"
  | "sales"
  | "projects"
  | "invoicing"
  | "finance"
  | "expenses"
  | "ops"
  | "contacts"
  | "hr"
  | "marketing"
  | "manufacturing"
  | "observe"
  | "code"
  | "chat"
  | "docs"
  | "roadmap"
  | "automations"
  | "reporting"
  | "maintenance"
  | "purchase"
  | "calendar"
  | "timesheet"
  | "training"
  | "playbooks"
  | "runbooks"
  | "help"
  | "settings"
  | "ai"
  | "system";

export type NotificationType =
  | "mention"
  | "assigned"
  | "comment"
  | "status"
  | "due"
  | "approval"
  | "deploy"
  | "alert"
  | "message"
  | "info";

export interface NotificationItem {
  id: string;
  /** Source module — used for filtering & per-module mute. */
  module: ModuleId;
  /** Lifecycle / icon hint. */
  type: NotificationType;
  title: string;
  body?: string;
  /** Stable entity key — e.g. `deal:DEAL-123`. Lets the bell group all
   *  notifications about the same record into one collapsed row. */
  entityKey?: string;
  /** Click target. Relative paths preferred. */
  href?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp; null while unread. */
  readAt: string | null;
  /** ISO; when set + future, the row is hidden until then. */
  snoozedUntil: string | null;
  /** "low" / "normal" / "high" / "critical" — affects toast cadence + push. */
  priority: "low" | "normal" | "high" | "critical";
  /** Avatar / actor seed (used for the coloured chip in the row). */
  actor?: { id: string; name: string };
}

interface NotificationCenterStore {
  items: NotificationItem[];
  /** Adds a new notification. Returns the created row (mostly for testing). */
  add: (
    n: Omit<NotificationItem, "id" | "createdAt" | "readAt" | "snoozedUntil"> & {
      id?: string;
      createdAt?: string;
    },
  ) => NotificationItem;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  snooze: (id: string, untilIso: string) => void;
  unsnooze: (id: string) => void;
  /** Returns the live "unread + not snoozed" count for the bell badge. */
  unreadCount: () => number;
}

const MAX_ENTRIES = 250;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useNotificationCenter = create<NotificationCenterStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (n) => {
        const row: NotificationItem = {
          id: n.id ?? newId(),
          createdAt: n.createdAt ?? new Date().toISOString(),
          readAt: null,
          snoozedUntil: null,
          module: n.module,
          type: n.type,
          title: n.title,
          body: n.body,
          entityKey: n.entityKey,
          href: n.href,
          priority: n.priority ?? "normal",
          actor: n.actor,
        };
        set((s) => ({
          items: [row, ...s.items.filter((i) => i.id !== row.id)].slice(
            0,
            MAX_ENTRIES,
          ),
        }));
        return row;
      },
      markRead: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id && !i.readAt ? { ...i, readAt: new Date().toISOString() } : i,
          ),
        })),
      markAllRead: () =>
        set((s) => {
          const now = new Date().toISOString();
          return {
            items: s.items.map((i) => (i.readAt ? i : { ...i, readAt: now })),
          };
        }),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      snooze: (id, untilIso) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, snoozedUntil: untilIso } : i,
          ),
        })),
      unsnooze: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, snoozedUntil: null } : i,
          ),
        })),
      unreadCount: () => {
        const now = Date.now();
        return get().items.filter(
          (i) =>
            !i.readAt &&
            (!i.snoozedUntil || new Date(i.snoozedUntil).getTime() <= now),
        ).length;
      },
    }),
    { name: "vyne-notification-center", version: 1 },
  ),
);

/** Module-level helper so non-React code can fire a notification.
 *  Routes through the notify gate so muted modules drop silently and
 *  DND-window events still land in the bell but suppress toast / push.
 *  The decision is attached to the row as the second return value so
 *  callers can act on it (e.g. skip a `toast.success` call when
 *  `decision === "quiet"`). */
export function pushNotification(
  n: Omit<NotificationItem, "id" | "createdAt" | "readAt" | "snoozedUntil">,
): { item: NotificationItem | null; decision: "fire" | "quiet" | "drop" } {
  // Lazy import so this module stays browser-safe (notifyGate reads
  // from another zustand store at call time).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shouldNotify } = require("@/lib/notifyGate") as typeof import("@/lib/notifyGate");
  const decision = shouldNotify(n.module);
  if (decision === "drop") return { item: null, decision };
  const item = useNotificationCenter.getState().add(n);
  return { item, decision };
}
