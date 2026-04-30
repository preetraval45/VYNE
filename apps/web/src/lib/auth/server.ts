import { randomBytes, pbkdf2Sync, createHmac, timingSafeEqual } from "node:crypto";

// Server-side auth helpers — used by /api/auth/signup and /api/auth/login.
// We deliberately use Node's crypto rather than pulling bcrypt: PBKDF2-SHA256
// at 120k iterations is OWASP-acceptable and avoids a native dep on Vercel.

const PBKDF2_ITERATIONS = 120_000;
const KEY_LEN = 32;

export const PASSWORD_RULES = [
  { id: "len", label: "At least 10 characters", test: (p: string) => p.length >= 10 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function validatePassword(password: string) {
  const failed = PASSWORD_RULES.filter((r) => !r.test(password));
  return { valid: failed.length === 0, failed: failed.map((f) => f.label) };
}

export function hashPassword(password: string, salt?: string) {
  const saltHex = salt ?? randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, Buffer.from(saltHex, "hex"), PBKDF2_ITERATIONS, KEY_LEN, "sha256").toString("hex");
  return { saltHex, hash };
}

export function verifyPassword(password: string, saltHex: string, expectedHash: string) {
  const { hash } = hashPassword(password, saltHex);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── Session token (HMAC, no JWT lib needed) ─────────────────────
// Format: base64url(payload).base64url(hmac(secret, payload))
// Payload: { uid, email, exp }
// The middleware just checks that `vyne-token` exists; this also lets
// authenticated API routes verify the session cheaply.

const TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function authSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "vyne-dev-secret-change-me"
  );
}

function b64urlEncode(buf: Buffer | string) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface SessionPayload {
  uid: string;
  email: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">) {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
  };
  const body = b64urlEncode(JSON.stringify(full));
  const sig = createHmac("sha256", authSecret()).update(body).digest();
  return `${body}.${b64urlEncode(sig)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", authSecret()).update(body).digest();
  const provided = b64urlDecode(sig);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString()) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const COOKIE_MAX_AGE_SEC = TOKEN_TTL_SEC;
