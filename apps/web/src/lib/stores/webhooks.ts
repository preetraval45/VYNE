"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Webhooks designer (21.1).
 *
 * A webhook is a signed POST that fires whenever a subscribed event
 * happens in the workspace. Each subscription tracks a delivery log
 * (last 30 attempts), retry policy, and a dead-letter pool for
 * replays after a downstream incident.
 *
 *   const wh = createWebhook({
 *     name: "Slack ops",
 *     url: "https://hooks.slack.com/...",
 *     events: ["deal.won", "deal.lost"],
 *   });
 *   recordDelivery(wh.id, { ok: true, status: 200, ms: 320 });
 *   replay(wh.id, deliveryId);
 *
 * The actual HTTP fan-out lives in `/api/webhooks/dispatch` (server-
 * side); this client store is the editor + log inspector.
 */

export type WebhookEvent =
  | "deal.created"
  | "deal.updated"
  | "deal.won"
  | "deal.lost"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.overdue"
  | "contact.created"
  | "project.created"
  | "automation.fired"
  | "approval.approved"
  | "approval.rejected"
  | "*";

export interface WebhookDelivery {
  id: string;
  ts: string;
  ok: boolean;
  status: number;
  ms: number;
  /** Truncated response body for debugging. */
  body?: string;
  error?: string;
  /** When non-zero, this delivery was a retry attempt N. */
  attempt: number;
  /** Echoes the event id so the user can correlate with the source. */
  eventKey?: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  /** Subscribed events. `*` = all events. */
  events: WebhookEvent[];
  /** HMAC secret used to sign every delivery. */
  secret: string;
  enabled: boolean;
  /** Delivery log — capped at 30 entries per subscription. */
  deliveries: WebhookDelivery[];
  /** Failed deliveries pending manual replay. */
  deadLetter: WebhookDelivery[];
  /** Backoff config. */
  retry: {
    maxAttempts: number;
    /** Delay between attempts in ms; doubles per attempt. */
    initialBackoffMs: number;
  };
  createdAt: string;
}

interface WebhooksStore {
  webhooks: WebhookSubscription[];
  createWebhook: (
    payload: Omit<
      WebhookSubscription,
      "id" | "createdAt" | "deliveries" | "deadLetter" | "secret" | "enabled" | "retry"
    > & {
      enabled?: boolean;
      retry?: Partial<WebhookSubscription["retry"]>;
    },
  ) => WebhookSubscription;
  updateWebhook: (id: string, patch: Partial<WebhookSubscription>) => void;
  removeWebhook: (id: string) => void;
  toggleWebhook: (id: string) => void;
  rotateSecret: (id: string) => string;
  recordDelivery: (
    id: string,
    delivery: Omit<WebhookDelivery, "id" | "ts" | "attempt"> & {
      attempt?: number;
      eventKey?: string;
    },
  ) => WebhookDelivery;
  /** Move a failed delivery to the dead-letter pool. */
  parkDelivery: (webhookId: string, deliveryId: string) => void;
  /** Take a dead-letter delivery and mark it as replay-pending. The
   *  caller's dispatch worker pops it from the dead-letter list. */
  takeDeadLetter: (webhookId: string, deliveryId: string) => WebhookDelivery | null;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `wh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function newSecret(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `whsec_${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `whsec_${Math.random().toString(36).slice(2, 18)}${Math.random()
    .toString(36)
    .slice(2, 18)}`;
}

const MAX_LOG = 30;
const MAX_DLQ = 50;

export const useWebhooks = create<WebhooksStore>()(
  persist(
    (set) => ({
      webhooks: [],
      createWebhook: (payload) => {
        const row: WebhookSubscription = {
          id: newId(),
          name: payload.name.slice(0, 80) || "Untitled webhook",
          url: payload.url,
          events: payload.events.length > 0 ? payload.events : ["*"],
          secret: newSecret(),
          enabled: payload.enabled ?? true,
          deliveries: [],
          deadLetter: [],
          retry: {
            maxAttempts: payload.retry?.maxAttempts ?? 5,
            initialBackoffMs: payload.retry?.initialBackoffMs ?? 1_000,
          },
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ webhooks: [row, ...s.webhooks] }));
        return row;
      },
      updateWebhook: (id, patch) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, ...patch } : w,
          ),
        })),
      removeWebhook: (id) =>
        set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),
      toggleWebhook: (id) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w,
          ),
        })),
      rotateSecret: (id) => {
        const next = newSecret();
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, secret: next } : w,
          ),
        }));
        return next;
      },
      recordDelivery: (id, delivery) => {
        const row: WebhookDelivery = {
          id: newId(),
          ts: new Date().toISOString(),
          attempt: delivery.attempt ?? 1,
          ok: delivery.ok,
          status: delivery.status,
          ms: delivery.ms,
          body: delivery.body,
          error: delivery.error,
          eventKey: delivery.eventKey,
        };
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id
              ? {
                  ...w,
                  deliveries: [row, ...w.deliveries].slice(0, MAX_LOG),
                }
              : w,
          ),
        }));
        return row;
      },
      parkDelivery: (webhookId, deliveryId) => {
        set((s) => ({
          webhooks: s.webhooks.map((w) => {
            if (w.id !== webhookId) return w;
            const delivery = w.deliveries.find((d) => d.id === deliveryId);
            if (!delivery) return w;
            const dlq = [delivery, ...w.deadLetter.filter((d) => d.id !== deliveryId)].slice(
              0,
              MAX_DLQ,
            );
            return { ...w, deadLetter: dlq };
          }),
        }));
      },
      takeDeadLetter: (webhookId, deliveryId) => {
        let taken: WebhookDelivery | null = null;
        set((s) => ({
          webhooks: s.webhooks.map((w) => {
            if (w.id !== webhookId) return w;
            taken = w.deadLetter.find((d) => d.id === deliveryId) ?? null;
            if (!taken) return w;
            return {
              ...w,
              deadLetter: w.deadLetter.filter((d) => d.id !== deliveryId),
            };
          }),
        }));
        return taken;
      },
    }),
    { name: "vyne-webhooks", version: 1 },
  ),
);
