// PH-D — TOTP (Time-based One-Time Password, RFC 6238) helpers.
//
// Backed by the `otpauth` package (dep-free, tree-shakeable, ~30KB).
// TOTP secret is stored in Postgres as AES-256-GCM ciphertext keyed
// off MFA_ENCRYPTION_KEY env var so a DB dump alone can't unlock
// anyone's second factor.
//
// Recovery codes: 10 one-time fallbacks generated at MFA setup,
// stored as sha256 hashes. Each is consumed (deleted from the array)
// after use.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Secret, TOTP } from "otpauth";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12; // GCM standard
const TAG_LEN = 16;

const ISSUER = "Vyne";
const PERIOD_SEC = 30;
const DIGITS = 6;
const ALLOWED_DRIFT_WINDOWS = 1; // ±30s tolerance

function getKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MFA_ENCRYPTION_KEY env var is required for MFA encryption",
    );
  }
  // Accept either a 32-byte hex (64 chars) or base64 (44 chars).
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== KEY_LEN) {
    throw new Error(
      `MFA_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`,
    );
  }
  return key;
}

/** AES-256-GCM encrypt a UTF-8 string. Output layout:
 *  base64(iv || ciphertext || tag). Self-describing — `decryptSecret`
 *  is the only function that can read it. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error("invalid encrypted secret");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}

/** Generates a fresh base32 secret + the `otpauth://` URI authenticator
 *  apps (Google Authenticator, 1Password, Authy, etc.) consume. */
export function generateMfaSecret(emailOrLabel: string): {
  secret: string;
  otpauthUrl: string;
  qrImageUrl: string;
} {
  // 20 bytes → ~32 base32 chars, the canonical TOTP secret length.
  const secret = new Secret({ size: 20 }).base32;
  const totp = new TOTP({
    issuer: ISSUER,
    label: emailOrLabel,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD_SEC,
    secret: Secret.fromBase32(secret),
  });
  const otpauthUrl = totp.toString();
  // External QR rendering — avoids the `qrcode` npm dep + works in
  // every email client / browser. The data parameter is URL-encoded
  // by URLSearchParams to handle the otpauth:// scheme cleanly.
  const params = new URLSearchParams({ data: otpauthUrl, size: "240x240" });
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
  return { secret, otpauthUrl, qrImageUrl };
}

/** Verifies a 6-digit code against a TOTP secret (base32). Allows a
 *  one-window drift so authenticator clock skew up to ±30s still
 *  validates. */
export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const trimmed = code.replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD_SEC,
    secret: Secret.fromBase32(secretBase32),
  });
  // `validate` returns the delta (number of periods off) or null.
  const delta = totp.validate({
    token: trimmed,
    window: ALLOWED_DRIFT_WINDOWS,
  });
  return delta !== null;
}

/** 10 recovery codes, formatted as `xxxx-xxxx` for human readability.
 *  Returned cleartext only ONCE at MFA setup — caller stores sha256
 *  hashes and displays the raw codes for the user to save. */
export function generateRecoveryCodes(): { raw: string[]; hashed: string[] } {
  const raw: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = formatRecoveryCode(randomBytes(5).toString("hex"));
    raw.push(code);
    hashed.push(hashRecoveryCode(code));
  }
  return { raw, hashed };
}

/** Hash used to store recovery codes and to look them up at verify
 *  time. sha256 is fast enough — these are short, single-use codes
 *  and never the only line of defense. */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(code.replace(/[\s-]+/g, "").toLowerCase())
    .digest("hex");
}

function formatRecoveryCode(hex: string): string {
  // `aabbccddee` → `aabb-ccdd-ee`
  const left = hex.slice(0, 4);
  const mid = hex.slice(4, 8);
  const right = hex.slice(8);
  return `${left}-${mid}-${right}`;
}
