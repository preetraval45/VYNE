"use client";

import { bumpUsage } from "@/components/home/UsageTile";
import { offlineQueue } from "@/lib/offlineQueue";

// Global fetch interceptor — wraps `window.fetch` once on app boot so
// every AI call site automatically increments the per-day counter the
// UsageTile reads, and so writes (`POST` / `PATCH` / `PUT` / `DELETE`)
// to the local API land in the IndexedDB offline queue when the
// browser is offline. The OfflineBanner replays them on reconnect.
//
// AI usage patterns matched:
//   /api/ai/ask        → "aiAsk"
//   /api/ai/tools      → "aiTools"
//   /api/ai/image      → "aiImage"
//   /api/ai/improve    → "aiImprove"
//   /api/ai/receipt    → "aiReceipt"
//
// Other /api/ai/* endpoints (digest, recap, translate, etc.) aren't
// counted per-kind — they fall under the generic aggregate via the
// server-side /api/ai/usage path when wired by the routes themselves.

const QUEUEABLE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

let installed = false;
export function installFetchInterceptor(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = "";
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else if (typeof (input as Request).url === "string") url = (input as Request).url;

    if (url.includes("/api/ai/")) {
      try {
        if (url.includes("/api/ai/ask")) bumpUsage("aiAsk");
        else if (url.includes("/api/ai/tools")) bumpUsage("aiTools");
        else if (url.includes("/api/ai/image")) bumpUsage("aiImage");
        else if (url.includes("/api/ai/improve")) bumpUsage("aiImprove");
        else if (url.includes("/api/ai/receipt")) bumpUsage("aiReceipt");
      } catch {
        // never break a request because of telemetry
      }
    }

    // Offline queue: when the browser is offline, capture mutating
    // requests aimed at our own API into IndexedDB so OfflineBanner can
    // replay them on reconnect. Reads (GET/HEAD) and AI streaming endpoints
    // (which need realtime SSE) are passed through to fail naturally.
    const method = (init?.method ?? "GET").toUpperCase();
    const isLocalApi = url.startsWith("/api/") || url.includes("://" + window.location.host + "/api/");
    const isAi = url.includes("/api/ai/");
    if (
      !navigator.onLine &&
      isLocalApi &&
      !isAi &&
      QUEUEABLE_METHODS.has(method)
    ) {
      try {
        const headers: Record<string, string> = {};
        if (init?.headers) {
          new Headers(init.headers).forEach((v, k) => {
            headers[k] = v;
          });
        }
        const body =
          typeof init?.body === "string"
            ? init.body
            : init?.body instanceof URLSearchParams
              ? init.body.toString()
              : null;
        await offlineQueue.enqueue({ url, method, body, headers });
        // Synthesize a 202 Accepted so callers know the request was taken
        // for later delivery instead of dropped on the floor.
        return new Response(
          JSON.stringify({ queued: true, offline: true }),
          {
            status: 202,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch {
        // If enqueue fails, fall through to a real fetch so the caller
        // can handle the network error themselves.
      }
    }

    return original(input as RequestInfo, init);
  };
}
