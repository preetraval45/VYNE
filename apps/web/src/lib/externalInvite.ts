// External channel invite token helpers (UI_UPGRADE_PLAN.md 6.7).
// Server-only — uses node:crypto. Used by both /api/channels/invite
// (issue + verify) and /api/channels/accept (verify).

import { createHmac, timingSafeEqual } from "node:crypto";

export interface InvitePayload {
  channelId: string;
  channelName: string;
  fromWorkspace: string;
  role: "viewer" | "member";
  iat: number;
  exp: number;
  /** Random nonce — ensures every invite is unique. */
  jti: string;
}

export function getInviteSecret(): string | null {
  return (
    process.env.EXTERNAL_INVITE_SIGNING_SECRET ??
    process.env.EMBED_SIGNING_SECRET ??
    null
  );
}

export function base64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8");
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64url(s: string): Buffer {
  const padded = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

export function signInvite(payload: InvitePayload, secret: string): string {
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(
    createHmac("sha256", secret).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyInvite(
  token: string,
  secret: string,
): InvitePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest();
  const provided = fromBase64url(sig);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64url(body).toString()) as InvitePayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
