// Pusher server SDK singleton. Edge runtime can't use the official
// `pusher` package (it depends on Node crypto). We use it from Node
// runtime API routes only. Channel auth + publish both live here.
//
// When PUSHER_APP_ID / KEY / SECRET / CLUSTER aren't set, the helpers
// silently no-op so the app still works in demo mode without realtime.

import Pusher from "pusher";

const APP_ID = process.env.PUSHER_APP_ID;
const KEY = process.env.PUSHER_KEY;
const SECRET = process.env.PUSHER_SECRET;
const CLUSTER = process.env.PUSHER_CLUSTER ?? "mt1";

let _pusher: Pusher | null = null;
export function getPusher(): Pusher | null {
  if (!APP_ID || !KEY || !SECRET) return null;
  if (_pusher) return _pusher;
  _pusher = new Pusher({
    appId: APP_ID,
    key: KEY,
    secret: SECRET,
    cluster: CLUSTER,
    useTLS: true,
  });
  return _pusher;
}

/** Server-side broadcast. Returns true if Pusher is configured + the
 * trigger succeeded. Failures and missing config both return false so
 * callers can fall through to localStorage optimistic mode. */
export async function publish(
  channel: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  const p = getPusher();
  if (!p) return false;
  try {
    await p.trigger(channel, event, data);
    return true;
  } catch {
    return false;
  }
}

export function pusherConfigured(): boolean {
  return Boolean(APP_ID && KEY && SECRET);
}
