"use client";

import { bumpUsage } from "@/components/home/UsageTile";

// Global fetch interceptor — wraps `window.fetch` once on app boot so
// every AI call site automatically increments the per-day counter the
// UsageTile reads. We don't call `bumpUsage` on the server-side because
// the route already counts via /api/ai/usage when KV is configured.
//
// Patterns matched:
//   /api/ai/ask        → "aiAsk"
//   /api/ai/tools      → "aiTools"
//   /api/ai/image      → "aiImage"
//   /api/ai/improve    → "aiImprove"
//   /api/ai/receipt    → "aiReceipt"
//
// Other /api/ai/* endpoints (digest, recap, translate, etc.) aren't
// counted per-kind — they fall under the generic aggregate via the
// server-side /api/ai/usage path when wired by the routes themselves.

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
    return original(input as RequestInfo, init);
  };
}
