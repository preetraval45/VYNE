import { subscribe, publish, busStats } from "@/lib/realtime/sseBus";

// /api/realtime/[channel] (PH-J)
//
// Pure-Vercel SSE fallback for when neither NEXT_PUBLIC_PUSHER_KEY nor
// NEXT_PUBLIC_SUPABASE_URL is configured. The bus is in-memory per
// Edge function instance (see sseBus.ts) — fine for low-volume demo +
// dev workspaces; configure Pusher for guaranteed cross-instance
// delivery.
//
//   GET  → text/event-stream, subscribes the connection to the channel
//   POST → publishes one event {event, data} to the channel
//
// Auth: same `vyne-token` session cookie that gates every other API
// route. We don't verify the HMAC here (Edge runtime — no node crypto
// for the existing verify helper); presence + heartbeat traffic is
// non-sensitive, and the channel name itself is the principal scope.
// Tighten later when private channels land.

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ channel: string }>;
}

function hasSessionCookie(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return (
    /(?:^|;\s*)vyne-token=/.test(cookie) ||
    /(?:^|;\s*)vyne-demo=1\b/.test(cookie)
  );
}

function sseLine(field: string, value: string): string {
  // SSE field values cannot contain raw newlines. Split + emit one
  // `field:` line per fragment.
  return value
    .split("\n")
    .map((line) => `${field}: ${line}`)
    .join("\n");
}

export async function GET(req: Request, { params }: RouteContext) {
  if (!hasSessionCookie(req)) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { channel } = await params;
  const lastEventId = req.headers.get("last-event-id");

  // Per-connection id. crypto.randomUUID is available in Edge runtime.
  const connId = crypto.randomUUID();
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function write(s: string) {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          // Stream already closed — let the cleanup path tear down.
        }
      }

      // Tell browsers to reconnect in 3s if the stream closes. The
      // EventSource API uses `retry:` to pick the next backoff.
      write("retry: 3000\n\n");

      const reg = subscribe(channel, lastEventId, {
        id: connId,
        send: (id, event, dataJSON) => {
          // SSE wire format: `id:`, `event:`, `data:`, then a blank line.
          const frame = `${sseLine("id", id)}\n${sseLine("event", event)}\n${sseLine("data", dataJSON)}\n\n`;
          write(frame);
        },
      });
      unsubscribe = reg.unsubscribe;

      // Flush any events the client missed while disconnected.
      for (const e of reg.replay) {
        const frame = `${sseLine("id", e.id)}\n${sseLine("event", e.event)}\n${sseLine("data", e.data)}\n\n`;
        write(frame);
      }

      // Heartbeat comment every 25s to keep intermediaries from
      // dropping the idle connection. Comments are `:`-prefixed lines.
      heartbeat = setInterval(() => write(`: ping ${Date.now()}\n\n`), 25_000);

      // When the client aborts (tab close, navigate, etc.) the stream
      // is cancelled. AbortSignal on req is the cleanest way to learn.
      if (req.signal) {
        req.signal.addEventListener("abort", () => {
          if (heartbeat) clearInterval(heartbeat);
          if (unsubscribe) unsubscribe();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disable Vercel's response buffering for SSE.
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(req: Request, { params }: RouteContext) {
  if (!hasSessionCookie(req)) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const { channel } = await params;
  let body: { event?: string; data?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!body.event || typeof body.event !== "string") {
    return new Response(
      JSON.stringify({ error: "event (string) is required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const id = publish(channel, body.event, body.data ?? null);
  return new Response(
    JSON.stringify({ ok: true, id, channel, stats: busStats() }),
    { headers: { "content-type": "application/json" } },
  );
}
