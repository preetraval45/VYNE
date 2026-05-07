"use client";

/**
 * Biometric login (FaceID / TouchID / Windows Hello) via WebAuthn /
 * platform-authenticator (Phase 25.4).
 *
 *   if (await biometricSupported()) {
 *     await registerBiometric({ userId, userName });
 *     // …later…
 *     const ok = await verifyBiometric();
 *   }
 *
 * Server-side challenge generation + credential verification still
 * needs a real backend (Argon2 / PRF). Until that lands, the helpers
 * persist the credential id in `localStorage` and treat a successful
 * `navigator.credentials.get(...)` call as "the device authenticated"
 * — good enough for demo workspaces, not for prod auth.
 *
 * The shape of the API matches the SimpleWebAuthn server SDK so the
 * production swap is a one-file change (replace the local challenge
 * with an `/api/webauthn/challenge` round-trip).
 */

const RP_NAME = "VYNE";
const STORAGE_KEY = "vyne-biometric-credentials";

interface StoredCredential {
  id: string;
  userId: string;
  userName: string;
  registeredAt: string;
}

function readStored(): StoredCredential[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredCredential[];
  } catch {
    return [];
  }
}

function writeStored(list: StoredCredential[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function randomChallenge(): ArrayBuffer {
  const buf = new Uint8Array(32);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 32; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  // Copy into a fresh ArrayBuffer to satisfy DOM lib types that
  // exclude SharedArrayBuffer from BufferSource.
  return new Uint8Array(buf).buffer;
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

/**
 * `true` when the device exposes a platform authenticator (FaceID /
 * TouchID / Windows Hello). False on desktops without one.
 */
export async function biometricSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("PublicKeyCredential" in window)) return false;
  try {
    const PKC = (window as unknown as {
      PublicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
      };
    }).PublicKeyCredential;
    if (!PKC.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export interface RegisterOpts {
  userId: string;
  userName: string;
  /** Optional display name. */
  displayName?: string;
}

/**
 * Enrol the current device's biometric. Stores the credential id
 * locally so subsequent `verifyBiometric()` calls can re-auth without
 * passing the id around.
 */
export async function registerBiometric(opts: RegisterOpts): Promise<boolean> {
  if (typeof window === "undefined" || !("credentials" in navigator)) return false;
  try {
    const challenge = randomChallenge();
    const userIdBytes = new Uint8Array(
      new TextEncoder().encode(opts.userId),
    ).buffer;
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: RP_NAME, id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: opts.userName,
          displayName: opts.displayName ?? opts.userName,
        },
        challenge,
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    const list = readStored();
    list.push({
      id: bufferToBase64Url(cred.rawId),
      userId: opts.userId,
      userName: opts.userName,
      registeredAt: new Date().toISOString(),
    });
    writeStored(list);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify the device's biometric. Pass a `userId` to scope to a
 * specific stored credential; default is "any registered credential
 * works" so a returning user gets a Touch ID prompt right away.
 */
export async function verifyBiometric(userId?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("credentials" in navigator)) return false;
  const candidates = readStored().filter((c) => !userId || c.userId === userId);
  if (candidates.length === 0) return false;
  try {
    const challenge = randomChallenge();
    const allowCredentials = candidates.map((c) => ({
      type: "public-key" as const,
      id: new Uint8Array(base64UrlToBuffer(c.id)).buffer,
    }));
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: "required",
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    return Boolean(cred);
  } catch {
    return false;
  }
}

/** Return the stored credential metadata for the active user (if any). */
export function listBiometricCredentials(): StoredCredential[] {
  return readStored();
}

export function removeBiometricCredential(id: string): void {
  writeStored(readStored().filter((c) => c.id !== id));
}
