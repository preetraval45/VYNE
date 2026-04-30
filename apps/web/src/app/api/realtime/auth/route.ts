import { NextResponse } from "next/server";
import { getPusher } from "@/lib/pusher";

// Pusher private/presence channel auth. The client SDK calls this with
// { socket_id, channel_name } in form-encoded body. We sign and return.
//
// Public broadcast channels (no `private-` / `presence-` prefix) don't
// need auth, so most VYNE traffic skips this endpoint entirely.

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
    const auth = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "auth failed" },
      { status: 500 },
    );
  }
}
