"use client";

/**
 * Have-I-Been-Pwned k-anonymity password breach check (23.5).
 *
 *   const breaches = await checkBreached(password);
 *   if (breaches > 0) reject();
 *
 * Privacy: only the first 5 chars of the SHA-1 hash leave the
 * browser. HIBP returns every hash starting with that prefix; we
 * filter the rest locally so the full hash never travels.
 *
 * Returns the number of times the password appears in known breaches
 * (0 = clean). Network errors return 0 so a flaky check doesn't lock
 * users out — the validator should treat a clean check as advisory.
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

async function sha1Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const buf = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(input),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  // No SHA-1 fallback — just return empty so the caller skips.
  return "";
}

export async function checkBreached(password: string): Promise<number> {
  if (typeof window === "undefined" || !password) return 0;
  try {
    const hash = await sha1Hex(password);
    if (!hash) return 0;
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split(/\r?\n/)) {
      const [s, count] = line.split(":");
      if (!s) continue;
      if (s.trim() === suffix) {
        const n = Number(count);
        return Number.isFinite(n) ? n : 0;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}
