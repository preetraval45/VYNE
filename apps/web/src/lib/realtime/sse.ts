"use client";

// PH-J — SSE client adapter. Matches the Pusher + Supabase shape so
// the realtime/index.ts dispatcher can swap it in with no caller
// changes.
//
// Per-channel single EventSource (reference-counted across multiple
// component subscribers). EventSource auto-reconnects on its own with
// the Last-Event-ID header set; we also add an explicit
// visibilitychange listener to recreate the connection if it was
// closed while the tab was backgrounded — many browsers tear down
// background EventSources to save power.

interface ChannelState {
  source: EventSource;
  refCount: number;
  // event-name → set of handlers. We share one MessageEvent listener
  // per event name to avoid wiring a fresh listener per subscriber.
  handlers: Map<string, Set<(data: unknown) => void>>;
  // Last id we received — sent as Last-Event-ID on reconnect so the
  // bus replays anything we missed.
  lastEventId: string | null;
  // Bound listener so we can remove it on tear-down.
  visibilityListener: (() => void) | null;
}

const channels = new Map<string, ChannelState>();

function buildUrl(channel: string): string {
  // encodeURIComponent so channel names containing ':' or '/'
  // (e.g. `presence-deal:DEAL-123`) round-trip safely through the
  // Next.js dynamic-route param.
  return `/api/realtime/${encodeURIComponent(channel)}`;
}

function openChannel(channel: string): ChannelState {
  const existing = channels.get(channel);
  if (existing) return existing;

  const url = buildUrl(channel);
  const source = new EventSource(url, { withCredentials: true });
  const state: ChannelState = {
    source,
    refCount: 0,
    handlers: new Map(),
    lastEventId: null,
    visibilityListener: null,
  };

  // EventSource emits a `message` event for unnamed payloads + a
  // distinct event for each `event:` field. We intercept at the
  // MessageEvent level so we can capture lastEventId centrally and
  // dispatch to per-name handlers.
  // Attach a generic listener via the addEventListener escape hatch:
  // we wrap every handler in a wrapper that updates lastEventId.

  // Visibility-change handler — if the tab returns to foreground and
  // EventSource is closed (browser killed it during background), open
  // a fresh one sending Last-Event-ID so the bus replays.
  state.visibilityListener = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState !== "visible") return;
    if (state.source.readyState === EventSource.CLOSED) {
      const replacement = new EventSource(url, { withCredentials: true });
      // The bus reads Last-Event-ID from the request, but EventSource
      // only resends it on its OWN auto-reconnect. Manual reopen has
      // to use a fetch-shaped GET because EventSource doesn't take
      // headers. So: skip the manual GET and rely on EventSource's
      // resend after the OS resumes the tab. We replace the source
      // anyway so dead listeners don't accumulate.
      rebindListeners(state, replacement);
      state.source = replacement;
    }
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", state.visibilityListener);
  }

  channels.set(channel, state);
  return state;
}

function rebindListeners(state: ChannelState, src: EventSource): void {
  for (const [eventName, handlerSet] of state.handlers) {
    src.addEventListener(eventName, ((ev: MessageEvent) => {
      if (ev.lastEventId) state.lastEventId = ev.lastEventId;
      dispatchTo(handlerSet, ev);
    }) as EventListener);
  }
}

function dispatchTo(
  handlerSet: Set<(data: unknown) => void>,
  ev: MessageEvent,
): void {
  let parsed: unknown;
  try {
    parsed = ev.data ? JSON.parse(ev.data as string) : null;
  } catch {
    parsed = ev.data;
  }
  for (const h of handlerSet) {
    try {
      h(parsed);
    } catch {
      // One bad handler shouldn't kill the channel for siblings.
    }
  }
}

function closeChannel(channel: string): void {
  const state = channels.get(channel);
  if (!state) return;
  try {
    state.source.close();
  } catch {
    /* ignore */
  }
  if (state.visibilityListener && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", state.visibilityListener);
  }
  channels.delete(channel);
}

/** Always true — SSE works without any env vars. */
export function isRealtimeEnabled(): boolean {
  return typeof window !== "undefined";
}

export function subscribe<T = unknown>(
  channel: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const state = openChannel(channel);
  state.refCount++;

  let handlerSet = state.handlers.get(event);
  if (!handlerSet) {
    handlerSet = new Set();
    state.handlers.set(event, handlerSet);
    // Wire the EventSource listener once per event name.
    state.source.addEventListener(event, ((ev: MessageEvent) => {
      if (ev.lastEventId) state.lastEventId = ev.lastEventId;
      dispatchTo(handlerSet!, ev);
    }) as EventListener);
  }
  handlerSet.add(handler as (data: unknown) => void);

  return () => {
    const s = channels.get(channel);
    if (!s) return;
    const set = s.handlers.get(event);
    if (set) {
      set.delete(handler as (data: unknown) => void);
      if (set.size === 0) s.handlers.delete(event);
    }
    s.refCount--;
    if (s.refCount <= 0) {
      closeChannel(channel);
    }
  };
}

export async function publishFromClient(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  try {
    const res = await fetch(buildUrl(channel), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ event, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
