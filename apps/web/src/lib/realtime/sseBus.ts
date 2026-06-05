// PH-J — In-memory pub/sub bus for the pure-Vercel SSE fallback.
//
// Lives in module scope; one instance per Edge function instance.
// **Limitation by design**: Vercel Edge can run multiple regional
// instances, so a publish on instance A may not reach a subscriber
// on instance B. That's acceptable for the fallback (low-traffic
// demos, dev, instances with no Pusher / Supabase env vars). For
// guaranteed delivery across instances, set NEXT_PUBLIC_PUSHER_KEY.
//
// Single export-per-file keeps the module pure + trivially testable.

interface BusSubscriber {
  id: string; // assigned per-connection so the GC can find it later
  send: (eventId: string, eventName: string, dataJSON: string) => void;
}

interface BusEvent {
  id: string; // monotonically increasing per-channel; sent as the SSE `id:` field
  event: string;
  data: string; // already-serialised JSON so we don't re-stringify per subscriber
  at: number;
}

// Per-channel ring buffer of the last N events. A reconnecting client
// passes its last seen id via the Last-Event-ID header; the route
// walks the buffer + replays anything newer. Bounded so a chatty
// channel can't OOM the instance.
const RING_LIMIT = 100;

const channels = new Map<
  string,
  { subscribers: Map<string, BusSubscriber>; ring: BusEvent[]; nextId: number }
>();

function getChannel(channel: string) {
  let c = channels.get(channel);
  if (!c) {
    c = { subscribers: new Map(), ring: [], nextId: 1 };
    channels.set(channel, c);
  }
  return c;
}

/**
 * Register a subscriber for a channel. Returns an unsubscribe + a
 * sequence of any events with id > lastEventId (for replay on
 * reconnect).
 */
export function subscribe(
  channel: string,
  lastEventId: string | null,
  subscriber: BusSubscriber,
): { unsubscribe: () => void; replay: BusEvent[] } {
  const c = getChannel(channel);
  c.subscribers.set(subscriber.id, subscriber);
  const replay = lastEventIdToReplay(c.ring, lastEventId);
  return {
    unsubscribe: () => {
      c.subscribers.delete(subscriber.id);
      // Don't delete the channel from the map — keep its ring so a
      // late reconnect from another instance still sees recent events.
      // The ring is small (RING_LIMIT) so the memory floor is bounded.
    },
    replay,
  };
}

function lastEventIdToReplay(
  ring: BusEvent[],
  lastEventId: string | null,
): BusEvent[] {
  if (!lastEventId) return [];
  // Ring is append-only and ordered by id asc. Walk from the end
  // backward to find the cutoff cheaply.
  const cutoffNum = Number(lastEventId);
  if (!Number.isFinite(cutoffNum)) return [];
  const idx = ring.findIndex((e) => Number(e.id) > cutoffNum);
  if (idx === -1) return [];
  return ring.slice(idx);
}

/**
 * Publish to every current subscriber on `channel` and store the
 * event in the ring buffer for replay. Returns the assigned id.
 */
export function publish(
  channel: string,
  eventName: string,
  data: unknown,
): string {
  const c = getChannel(channel);
  const id = String(c.nextId++);
  const dataJSON = JSON.stringify(data ?? null);
  const stored: BusEvent = {
    id,
    event: eventName,
    data: dataJSON,
    at: Date.now(),
  };
  c.ring.push(stored);
  if (c.ring.length > RING_LIMIT) c.ring.shift();
  for (const sub of c.subscribers.values()) {
    try {
      sub.send(id, eventName, dataJSON);
    } catch {
      // A throwing subscriber shouldn't take out the channel. Drop it.
      c.subscribers.delete(sub.id);
    }
  }
  return id;
}

/**
 * Number of active subscribers across all channels — exposed for
 * the /api/admin/realtime-status endpoint + the tests.
 */
export function busStats() {
  let totalSubs = 0;
  let totalRing = 0;
  for (const c of channels.values()) {
    totalSubs += c.subscribers.size;
    totalRing += c.ring.length;
  }
  return {
    channelCount: channels.size,
    subscriberCount: totalSubs,
    ringEntries: totalRing,
  };
}

/**
 * Test-only — wipe the in-memory state between cases. Not exported
 * via the package index; tests reach in directly.
 */
export function _resetBusForTests(): void {
  channels.clear();
}
