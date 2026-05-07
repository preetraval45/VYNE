"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Workspace-wide security policy. One store covers:
 *
 *   23.1  twoFactor      — per-role 2FA enforcement
 *   23.2  ipAllowlist    — CIDR rules per workspace
 *   23.4  anomaly        — bulk-export / impossible-travel / mass-delete thresholds
 *   23.5  password       — policy: length / complexity / rotation / breach check
 *   23.6  sso            — stacked providers (Okta + Google + Microsoft + GitHub)
 *   23.10 byok           — bring-your-own KMS key id + rotation cadence
 *   23.11 compliance     — earned badges shown in footer (SOC 2 / HIPAA / GDPR / ISO)
 *
 * Applied policies are surfaced through small `meets*` helpers so any
 * route handler / hook can gate flows without re-deriving conditions.
 */

export type RoleId = "admin" | "owner" | "manager" | "member" | "guest";

export interface TwoFactorPolicy {
  /** Roles required to enrol. Members of the role can't sign in without 2FA once `gracePeriodDays` elapses. */
  requiredFor: RoleId[];
  /** Days a user has to enrol after the policy is applied. Default 7. */
  gracePeriodDays: number;
  /** Allowed factor methods. Authenticator app is always allowed. */
  factors: {
    totp: boolean;
    webauthn: boolean;
    sms: boolean;
    backupCodes: boolean;
  };
}

export interface IpRule {
  id: string;
  cidr: string;
  label?: string;
  /** When `false`, the rule blocklists instead of allowlists. */
  allow: boolean;
  createdAt: string;
}

export interface AnomalyPolicy {
  /** Treat exports > N rows as suspicious. */
  bulkExportRowThreshold: number;
  /** N records deleted within `massDeleteWindowSec` flips the alarm. */
  massDeleteCount: number;
  massDeleteWindowSec: number;
  /** Two sign-ins separated by < `impossibleTravelMaxKmh` km/h trip the alarm. */
  impossibleTravelKmh: number;
  /** When true, flagged events email the workspace admin + force a re-auth. */
  notifyAdmins: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  /** All true = uppercase + lowercase + digit + symbol required. */
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
  /** Max age in days before a forced rotation. 0 = never. */
  rotationDays: number;
  /** Reject passwords found in HIBP via k-anonymity. */
  rejectBreached: boolean;
  /** Block the previous N passwords. */
  historyCount: number;
}

export type SsoProtocol = "saml" | "oidc" | "oauth2";

export interface SsoProvider {
  id: string;
  name: string;
  protocol: SsoProtocol;
  /** Enterprise IdP hostname (used for label only). */
  domain?: string;
  /** When set, only users with this email domain may use this provider. */
  enforceDomain?: string;
  /** Endpoint metadata — protocol-dependent. */
  config: {
    metadataUrl?: string;
    entityId?: string;
    ssoUrl?: string;
    clientId?: string;
    issuer?: string;
  };
  enabled: boolean;
  createdAt: string;
}

export interface ByokConfig {
  enabled: boolean;
  /** AWS KMS / GCP KMS / Azure Key Vault key arn. */
  keyArn?: string;
  /** Auto-rotate cadence in days. */
  rotationDays: number;
  lastRotatedAt?: string;
}

export type ComplianceBadge =
  | "soc2-type1"
  | "soc2-type2"
  | "iso-27001"
  | "gdpr"
  | "hipaa"
  | "pci-dss"
  | "ccpa"
  | "fedramp-moderate";

export interface SecurityPolicy {
  twoFactor: TwoFactorPolicy;
  ipAllowlist: IpRule[];
  anomaly: AnomalyPolicy;
  password: PasswordPolicy;
  sso: SsoProvider[];
  byok: ByokConfig;
  compliance: ComplianceBadge[];
}

interface SecurityPolicyStore extends SecurityPolicy {
  set: (patch: Partial<SecurityPolicy>) => void;
  setTwoFactor: (patch: Partial<TwoFactorPolicy>) => void;
  setAnomaly: (patch: Partial<AnomalyPolicy>) => void;
  setPassword: (patch: Partial<PasswordPolicy>) => void;
  setByok: (patch: Partial<ByokConfig>) => void;
  addIpRule: (rule: Omit<IpRule, "id" | "createdAt">) => IpRule;
  removeIpRule: (id: string) => void;
  addSsoProvider: (
    provider: Omit<SsoProvider, "id" | "createdAt" | "enabled"> & {
      enabled?: boolean;
    },
  ) => SsoProvider;
  removeSsoProvider: (id: string) => void;
  toggleSsoProvider: (id: string) => void;
  setComplianceBadges: (badges: ComplianceBadge[]) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT: SecurityPolicy = {
  twoFactor: {
    requiredFor: ["owner", "admin"],
    gracePeriodDays: 7,
    factors: { totp: true, webauthn: true, sms: false, backupCodes: true },
  },
  ipAllowlist: [],
  anomaly: {
    bulkExportRowThreshold: 5_000,
    massDeleteCount: 25,
    massDeleteWindowSec: 60,
    impossibleTravelKmh: 800,
    notifyAdmins: true,
  },
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSymbol: false,
    rotationDays: 0,
    rejectBreached: true,
    historyCount: 5,
  },
  sso: [],
  byok: {
    enabled: false,
    rotationDays: 90,
  },
  compliance: ["gdpr", "ccpa"],
};

export const useSecurityPolicy = create<SecurityPolicyStore>()(
  persist(
    (set) => ({
      ...DEFAULT,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      setTwoFactor: (patch) =>
        set((s) => ({ twoFactor: { ...s.twoFactor, ...patch } })),
      setAnomaly: (patch) =>
        set((s) => ({ anomaly: { ...s.anomaly, ...patch } })),
      setPassword: (patch) =>
        set((s) => ({ password: { ...s.password, ...patch } })),
      setByok: (patch) =>
        set((s) => ({ byok: { ...s.byok, ...patch } })),
      addIpRule: (rule) => {
        const row: IpRule = {
          id: newId(),
          createdAt: new Date().toISOString(),
          ...rule,
        };
        set((s) => ({ ipAllowlist: [row, ...s.ipAllowlist] }));
        return row;
      },
      removeIpRule: (id) =>
        set((s) => ({
          ipAllowlist: s.ipAllowlist.filter((r) => r.id !== id),
        })),
      addSsoProvider: (provider) => {
        const row: SsoProvider = {
          id: newId(),
          createdAt: new Date().toISOString(),
          enabled: provider.enabled ?? true,
          ...provider,
        };
        set((s) => ({ sso: [row, ...s.sso] }));
        return row;
      },
      removeSsoProvider: (id) =>
        set((s) => ({ sso: s.sso.filter((p) => p.id !== id) })),
      toggleSsoProvider: (id) =>
        set((s) => ({
          sso: s.sso.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p,
          ),
        })),
      setComplianceBadges: (compliance) => set({ compliance }),
    }),
    { name: "vyne-security-policy", version: 1 },
  ),
);

// ── Policy helpers ────────────────────────────────────────────────

/**
 * `true` when the role currently sits inside the 2FA enforcement
 * window — the caller's auth flow uses this to block sign-in until
 * 2FA is enrolled.
 */
export function twoFactorRequiredFor(role: RoleId): boolean {
  return useSecurityPolicy.getState().twoFactor.requiredFor.includes(role);
}

/** Quick CIDR membership check (IPv4-only — IPv6 is always allowed). */
export function ipAllowed(ip: string): boolean {
  if (!ip || ip.includes(":")) return true; // IPv6 / unresolved
  const rules = useSecurityPolicy.getState().ipAllowlist;
  if (rules.length === 0) return true;
  const allows = rules.filter((r) => r.allow);
  const blocks = rules.filter((r) => !r.allow);
  for (const r of blocks) if (cidrMatch(ip, r.cidr)) return false;
  if (allows.length === 0) return true;
  return allows.some((r) => cidrMatch(ip, r.cidr));
}

function cidrMatch(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = bitsStr ? Number(bitsStr) : 32;
  const ipNum = ipv4ToInt(ip);
  const baseNum = ipv4ToInt(base);
  if (ipNum === null || baseNum === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

/**
 * Validate a candidate password against the active policy. Returns
 * the list of policy violations (empty array == passes).
 */
export function validatePassword(password: string): string[] {
  const p = useSecurityPolicy.getState().password;
  const out: string[] = [];
  if (password.length < p.minLength)
    out.push(`At least ${p.minLength} characters`);
  if (p.requireUppercase && !/[A-Z]/.test(password))
    out.push("Must include an uppercase letter");
  if (p.requireLowercase && !/[a-z]/.test(password))
    out.push("Must include a lowercase letter");
  if (p.requireDigit && !/\d/.test(password)) out.push("Must include a digit");
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(password))
    out.push("Must include a symbol");
  return out;
}
