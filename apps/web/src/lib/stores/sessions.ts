"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Active session viewer + remote sign-out (23.3).
 *
 * Each row is a device / browser the current user is signed in on.
 * The auth handshake registers a row at sign-in; periodic heartbeat
 * (`useSessionHeartbeat`) bumps `lastActiveAt`; remote sign-out flips
 * `revokedAt` so the next API call invalidates the session.
 *
 *   const me = await registerSession({
 *     deviceLabel: navigator.userAgent,
 *     ip: clientIp,
 *     city: geoIp.city,
 *   });
 *   …
 *   revokeSession(deviceId);
 *
 * Demo mode: stored client-side. Production mirrors to a `sessions`
 * DB row keyed by the auth cookie hash.
 */

export interface Session {
  id: string;
  deviceLabel: string;
  /** UA-derived: "Chrome 120 · macOS". */
  deviceShort?: string;
  ip?: string;
  city?: string;
  country?: string;
  createdAt: string;
  lastActiveAt: string;
  /** ISO; non-null means revoked. */
  revokedAt?: string;
  /** True when this is the session viewing the table — never revoke this from itself. */
  current?: boolean;
}

interface SessionsStore {
  sessions: Session[];
  registerSession: (
    payload: Omit<Session, "id" | "createdAt" | "lastActiveAt"> & {
      id?: string;
      lastActiveAt?: string;
    },
  ) => Session;
  heartbeat: (id: string) => void;
  revoke: (id: string) => void;
  /** Revoke every session that isn't the current one. */
  revokeOthers: () => number;
  purgeRevoked: () => number;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function shortDevice(ua: string): string {
  // Quick UA → "Chrome 120 · macOS" tag.
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  let os = "Web";
  if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return `${browser} · ${os}`;
}

export const useSessions = create<SessionsStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      registerSession: (payload) => {
        const ts = new Date().toISOString();
        const row: Session = {
          id: payload.id ?? newId(),
          createdAt: ts,
          lastActiveAt: payload.lastActiveAt ?? ts,
          deviceLabel: payload.deviceLabel,
          deviceShort:
            payload.deviceShort ?? shortDevice(payload.deviceLabel ?? ""),
          ip: payload.ip,
          city: payload.city,
          country: payload.country,
          current: payload.current,
        };
        // Mark all other sessions as not-current; current flag must be unique.
        set((s) => ({
          sessions: [
            row,
            ...s.sessions
              .filter((x) => x.id !== row.id)
              .map((x) => ({ ...x, current: row.current ? false : x.current })),
          ],
        }));
        return row;
      },
      heartbeat: (id) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id && !x.revokedAt
              ? { ...x, lastActiveAt: new Date().toISOString() }
              : x,
          ),
        })),
      revoke: (id) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, revokedAt: new Date().toISOString() } : x,
          ),
        })),
      revokeOthers: () => {
        let n = 0;
        const ts = new Date().toISOString();
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (!x.current && !x.revokedAt) {
              n += 1;
              return { ...x, revokedAt: ts };
            }
            return x;
          }),
        }));
        return n;
      },
      purgeRevoked: () => {
        let n = 0;
        set((s) => ({
          sessions: s.sessions.filter((x) => {
            if (x.revokedAt) {
              n += 1;
              return false;
            }
            return true;
          }),
        }));
        return n;
      },
    }),
    { name: "vyne-sessions", version: 1 },
  ),
);
