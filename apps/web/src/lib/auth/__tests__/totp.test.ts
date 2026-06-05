import { describe, it, expect, beforeEach } from "vitest";

// Set MFA_ENCRYPTION_KEY BEFORE importing the module under test so
// getKey() picks it up on first call.
const TEST_KEY_HEX = "a".repeat(64);
beforeEach(() => {
  process.env.MFA_ENCRYPTION_KEY = TEST_KEY_HEX;
});

import {
  decryptSecret,
  encryptSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "../totp";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret string", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toBe(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("throws on malformed ciphertext", () => {
    expect(() => decryptSecret("not-base64-cipher")).toThrow();
  });
});

describe("generateMfaSecret", () => {
  it("returns secret + otpauthUrl + qrImageUrl", () => {
    const out = generateMfaSecret("user@example.com");
    expect(out.secret).toMatch(/^[A-Z2-7]{32}$/); // base32 chars only
    expect(out.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(out.otpauthUrl).toContain("Vyne");
    expect(out.qrImageUrl).toContain("qrserver.com");
  });
});

describe("verifyTotpCode", () => {
  it("rejects non-6-digit input", () => {
    expect(verifyTotpCode("JBSWY3DPEHPK3PXP", "12345")).toBe(false);
    expect(verifyTotpCode("JBSWY3DPEHPK3PXP", "abcdef")).toBe(false);
    expect(verifyTotpCode("JBSWY3DPEHPK3PXP", "")).toBe(false);
  });

  it("rejects a clearly-wrong code", () => {
    const { secret } = generateMfaSecret("user@example.com");
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });
});

describe("recovery codes", () => {
  it("generates 10 raw codes + 10 hashed codes", () => {
    const { raw, hashed } = generateRecoveryCodes();
    expect(raw.length).toBe(10);
    expect(hashed.length).toBe(10);
  });

  it("formats raw codes as xxxx-xxxx-xx", () => {
    const { raw } = generateRecoveryCodes();
    for (const r of raw) {
      expect(r).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{2}$/);
    }
  });

  it("each raw code hashes to its stored counterpart", () => {
    const { raw, hashed } = generateRecoveryCodes();
    for (let i = 0; i < raw.length; i++) {
      expect(hashRecoveryCode(raw[i])).toBe(hashed[i]);
    }
  });

  it("hashing is case- and dash-insensitive", () => {
    expect(hashRecoveryCode("aabb-ccdd-ee")).toBe(
      hashRecoveryCode("AABBCCDDEE"),
    );
    expect(hashRecoveryCode("aabb ccdd ee")).toBe(
      hashRecoveryCode("aabbccddee"),
    );
  });
});
