import { NextResponse } from "next/server";
import { getPusher } from "@/lib/pusher";
import { verifySessionToken } from "@/lib/auth/server";

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Pusher private/presence channel auth. The client SDK calls this with
// { socket_id, channel_name } in form-encoded body. We sign and return.
//
// Public broadcast channels (no `private-` / `presence-` prefix) don't
// need auth, so most VYNE traffic skips this endpoint entirely.
//
// Presence channels need a user_id + user_info — we resolve those from
// the session cookie set at signup/login. Anonymous fallback uses the
// socket_id so demo workspaces can still test cross-device read state.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: "realtime disabled" }, { status: 503 });
  }
  const formData = await req.formData();
  const socketId = String(formData.get("socket_id") ?? "");
  const channel = String(formData.get("channel_name") ?? "");
  if (!socketId || !channel) {
    return NextResponse.json({ error: "missing socket_id / channel_name" }, { status: 400 });
  }
  try {
    if (channel.startsWith("presence-")) {
      // Pull user identity from the session cookie. Anonymous tabs in
      // demo mode get a stable per-socket id so two tabs of the same
      // socket-id are seen as the same "user" — good enough for testing.
      const cookieHeader = req.headers.get("cookie") ?? "";
      const token = parseCookie(cookieHeader, "vyne-token");
      const session = token ? verifySessionToken(token) : null;
      const userId =
        session?.uid ??
        session?.email ??
        `anon-${socketId.slice(0, 12)}`;
      const userInfo: Record<string, unknown> = {};
      if (session?.email) userInfo.email = session.email;
      const auth = pusher.authorizeChannel(socketId, channel, {
        user_id: userId,
        user_info: userInfo,
      });
      return NextResponse.json(auth);
    }
    const auth = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "auth failed" },
      { status: 500 },
    );
  }
}
