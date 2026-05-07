"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Multi-workspace store (Phase 26).
 *
 *   26.1 list + switcher    — every workspace the signed-in user belongs to
 *   26.5 role separation    — workspace-admin distinct from system-admin
 *   26.7 guest access       — single-record / single-module invitations
 *
 * Cross-workspace search (26.2) reads from this list to fan out a
 * single query across every membership; clone (26.6) reads source +
 * target ids; usage analytics (26.4) is keyed by `workspaceId`.
 *
 * Production wires this to a `workspaces` + `memberships` table; the
 * store is the client-side cache + hydration target.
 */

export type WorkspaceRole =
  /** Owns billing + can delete the workspace. */
  | "owner"
  /** Workspace-level admin (≠ system admin). */
  | "admin"
  /** Internal team member. */
  | "member"
  /** External guest scoped to specific records / modules. */
  | "guest";

export interface Workspace {
  id: string;
  name: string;
  /** Subdomain segment used for routing — `acme` → `acme.vyne.app`. */
  slug: string;
  /** Logo URL or emoji glyph. */
  icon?: string;
  /** Display colour for switcher chip. */
  color?: string;
  /** Whether this workspace is currently the active one. */
  active?: boolean;
  /** When `true`, the workspace is read-only (e.g. paused / archived). */
  readonly?: boolean;
  /** ISO. */
  joinedAt: string;
  /** This user's role inside the workspace. */
  role: WorkspaceRole;
  /** Tile telemetry — last visit timestamp. */
  lastSeenAt?: string;
}

export interface GuestScope {
  /** Allowed record refs ("deal:DEAL-42") — guest can only see these. */
  records?: string[];
  /** Allowed module ids — guest can only navigate to these. */
  modules?: string[];
  /** ISO; access expires automatically once past. */
  expiresAt?: string;
}

export interface GuestInvite {
  id: string;
  workspaceId: string;
  /** Email or external id. */
  invitee: string;
  scope: GuestScope;
  /** ISO. */
  invitedAt: string;
  /** ISO when accepted. null = pending. */
  acceptedAt?: string;
  /** Single-use share token — revealed once at creation. */
  tokenLast4: string;
}

interface WorkspacesStore {
  workspaces: Workspace[];
  guests: GuestInvite[];

  // 26.1 switcher
  setActive: (id: string) => void;
  addWorkspace: (
    payload: Omit<Workspace, "joinedAt" | "active"> & { joinedAt?: string },
  ) => Workspace;
  removeWorkspace: (id: string) => void;
  /** Bump `lastSeenAt` for the active workspace. */
  touchActive: () => void;
  current: () => Workspace | null;

  // 26.5 role
  setRole: (id: string, role: WorkspaceRole) => void;
  /** Predicate the rest of the app uses to gate admin-only screens. */
  isWorkspaceAdmin: (id?: string) => boolean;

  // 26.7 guest
  inviteGuest: (
    payload: Omit<GuestInvite, "id" | "invitedAt" | "tokenLast4">,
  ) => { invite: GuestInvite; token: string };
  revokeGuest: (id: string) => void;
  /** Active guest invites for a workspace (acceptedAt set + non-expired). */
  activeGuestsFor: (workspaceId: string) => GuestInvite[];
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function newToken(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return `vyne_gst_${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `vyne_gst_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

const DEFAULTS: Workspace[] = [
  {
    id: "ws-vyne-hq",
    name: "Vyne HQ",
    slug: "vyne",
    icon: "🟦",
    color: "#06B6D4",
    role: "owner",
    active: true,
    joinedAt: new Date(0).toISOString(),
  },
];

export const useWorkspaces = create<WorkspacesStore>()(
  persist(
    (set, get) => ({
      workspaces: DEFAULTS,
      guests: [],

      // 26.1 switcher
      setActive: (id) =>
        set((s) => {
          const ts = new Date().toISOString();
          return {
            workspaces: s.workspaces.map((w) => ({
              ...w,
              active: w.id === id,
              lastSeenAt: w.id === id ? ts : w.lastSeenAt,
            })),
          };
        }),
      addWorkspace: (payload) => {
        const row: Workspace = {
          ...payload,
          joinedAt: payload.joinedAt ?? new Date().toISOString(),
          active: false,
        };
        set((s) => ({ workspaces: [...s.workspaces, row] }));
        return row;
      },
      removeWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          guests: s.guests.filter((g) => g.workspaceId !== id),
        })),
      touchActive: () =>
        set((s) => {
          const ts = new Date().toISOString();
          return {
            workspaces: s.workspaces.map((w) =>
              w.active ? { ...w, lastSeenAt: ts } : w,
            ),
          };
        }),
      current: () => get().workspaces.find((w) => w.active) ?? null,

      // 26.5 role
      setRole: (id, role) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, role } : w,
          ),
        })),
      isWorkspaceAdmin: (id) => {
        const target =
          (id ? get().workspaces.find((w) => w.id === id) : null) ??
          get().workspaces.find((w) => w.active);
        if (!target) return false;
        return target.role === "owner" || target.role === "admin";
      },

      // 26.7 guest
      inviteGuest: (payload) => {
        const token = newToken();
        const invite: GuestInvite = {
          id: newId(),
          invitedAt: new Date().toISOString(),
          tokenLast4: token.slice(-4),
          ...payload,
        };
        set((s) => ({ guests: [invite, ...s.guests] }));
        return { invite, token };
      },
      revokeGuest: (id) =>
        set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),
      activeGuestsFor: (workspaceId) => {
        const now = Date.now();
        return get().guests.filter((g) => {
          if (g.workspaceId !== workspaceId) return false;
          if (g.scope.expiresAt && new Date(g.scope.expiresAt).getTime() < now)
            return false;
          return true;
        });
      },
    }),
    { name: "vyne-workspaces", version: 1 },
  ),
);

/** Module-level helper for non-React paths (route handlers, hooks). */
export function currentWorkspaceId(): string | null {
  return useWorkspaces.getState().current()?.id ?? null;
}
