"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiScope } from "@/lib/stores/apiKeys";

/**
 * Custom AI tools / webhook registration (28.2.3).
 *
 * A "custom tool" lets a workspace admin extend the AI's reach
 * beyond the built-in CRM / ERP tools. Each row carries:
 *
 *   - name + description (what the model sees)
 *   - parameters (JSON Schema — the model fills these)
 *   - webhookUrl (where the executor POSTs the call)
 *   - scopes (which API surfaces the tool may touch)
 *   - secret (HMAC signing key)
 *
 *   const tool = registerTool({
 *     name: "create_jira_ticket",
 *     description: "File a bug in Jira project X.",
 *     parameters: { type: "object", properties: { summary: { type: "string" } } },
 *     webhookUrl: "https://hooks.acme.com/jira",
 *     scopes: ["tasks:write"],
 *   });
 *
 * The actual dispatch lives in `/api/ai/tools/custom` (signs the
 * payload with HMAC-SHA-256 + posts to the webhook); this store is
 * the canonical registry the executor reads at every tool-call.
 */

export interface CustomToolParameter {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  description?: string;
  enum?: Array<string | number>;
  items?: CustomToolParameter;
  properties?: Record<string, CustomToolParameter>;
  required?: string[];
}

export interface CustomTool {
  id: string;
  /** Tool name as the model sees it. Lowercase + underscore. */
  name: string;
  description: string;
  /** JSON Schema describing the arguments the model must produce. */
  parameters: CustomToolParameter;
  webhookUrl: string;
  /** Optional headers to forward (e.g. "X-Custom-Auth: foo"). */
  headers?: Record<string, string>;
  scopes: ApiScope[];
  /** HMAC signing secret — last 4 surfaced for display. */
  secretLast4: string;
  /** Hash of the secret, kept server-side too (never round-trips). */
  secretHash: string;
  /** When false, the executor skips this tool. */
  enabled: boolean;
  /** ISO. */
  createdAt: string;
  /** Last invocation telemetry. */
  lastCalledAt?: string;
  lastStatus?: number;
  /** Total successful invocations. */
  callCount: number;
}

interface CustomToolsStore {
  tools: CustomTool[];
  /** Returns the tool + plaintext secret (only revealed once at creation). */
  registerTool: (
    payload: Omit<
      CustomTool,
      | "id"
      | "secretLast4"
      | "secretHash"
      | "enabled"
      | "createdAt"
      | "callCount"
    > & { enabled?: boolean },
  ) => Promise<{ tool: CustomTool; secret: string }>;
  removeTool: (id: string) => void;
  toggleTool: (id: string) => void;
  rotateSecret: (id: string) => Promise<string>;
  recordInvocation: (id: string, status: number) => void;
  /** Tools the AI executor should advertise to the model. */
  enabledTools: () => CustomTool[];
  toolByName: (name: string) => CustomTool | null;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function generateSecret(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `vyne_tool_${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `vyne_tool_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function sha256(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(input),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33 + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function normaliseName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

export const useCustomTools = create<CustomToolsStore>()(
  persist(
    (set, get) => ({
      tools: [],
      registerTool: async (payload) => {
        const secret = generateSecret();
        const secretHash = await sha256(secret);
        const row: CustomTool = {
          id: newId(),
          name: normaliseName(payload.name),
          description: payload.description.trim(),
          parameters: payload.parameters,
          webhookUrl: payload.webhookUrl,
          headers: payload.headers,
          scopes: payload.scopes.length > 0 ? payload.scopes : ["*"],
          secretLast4: secret.slice(-4),
          secretHash,
          enabled: payload.enabled ?? true,
          createdAt: new Date().toISOString(),
          callCount: 0,
        };
        set((s) => ({ tools: [row, ...s.tools] }));
        return { tool: row, secret };
      },
      removeTool: (id) =>
        set((s) => ({ tools: s.tools.filter((t) => t.id !== id) })),
      toggleTool: (id) =>
        set((s) => ({
          tools: s.tools.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled } : t,
          ),
        })),
      rotateSecret: async (id) => {
        const secret = generateSecret();
        const secretHash = await sha256(secret);
        set((s) => ({
          tools: s.tools.map((t) =>
            t.id === id
              ? { ...t, secretLast4: secret.slice(-4), secretHash }
              : t,
          ),
        }));
        return secret;
      },
      recordInvocation: (id, status) =>
        set((s) => ({
          tools: s.tools.map((t) =>
            t.id === id
              ? {
                  ...t,
                  lastCalledAt: new Date().toISOString(),
                  lastStatus: status,
                  callCount:
                    status >= 200 && status < 300 ? t.callCount + 1 : t.callCount,
                }
              : t,
          ),
        })),
      enabledTools: () => get().tools.filter((t) => t.enabled),
      toolByName: (name) => {
        const n = normaliseName(name);
        return get().tools.find((t) => t.name === n) ?? null;
      },
    }),
    { name: "vyne-ai-custom-tools", version: 1 },
  ),
);
