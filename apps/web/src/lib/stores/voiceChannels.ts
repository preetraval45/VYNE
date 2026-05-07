"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Persistent voice channels (28.1.2) — Discord-style always-on rooms
 * that sit in the channel sidebar, independent of the call layer.
 *
 *   const ch = createVoiceChannel({ name: "lounge", scope: "workspace" });
 *   joinVoiceChannel(ch.id, { id: "u-123", name: "Sarah" });
 *   leaveVoiceChannel(ch.id, "u-123");
 *
 * The channel persists; the speaker list lives in memory + mirrors
 * over Pusher (presence-voice-${channelId}). A user "joins" via the
 * sidebar tile, which triggers the existing call layer's join flow
 * with that channel's stable id; the WebRTC peer-connection lifecycle
 * stays unchanged.
 */

export interface VoiceChannel {
  id: string;
  name: string;
  /** "workspace" = visible to everyone; "private" = invitee-only. */
  scope: "workspace" | "private";
  /** Optional description (use case / norms). */
  description?: string;
  /** Max simultaneous participants. 0 = unlimited. */
  maxParticipants: number;
  /** ISO. */
  createdAt: string;
  createdBy?: string;
  /** Optional list of allowed user ids when `scope === "private"`. */
  allowedUserIds?: string[];
}

export interface VoiceChannelMember {
  /** Stable user id. */
  id: string;
  name: string;
  joinedAt: string;
  /** Local mute state — surfaced to peers via presence. */
  muted?: boolean;
  /** Camera on / off. */
  videoOn?: boolean;
  /** True when this user is the active speaker. */
  speaking?: boolean;
}

interface VoiceChannelsStore {
  channels: VoiceChannel[];
  /** In-memory occupancy map; live during a tab session. */
  members: Record<string, VoiceChannelMember[]>;

  // Channel CRUD
  createChannel: (
    payload: Omit<VoiceChannel, "id" | "createdAt" | "maxParticipants"> & {
      maxParticipants?: number;
    },
  ) => VoiceChannel;
  removeChannel: (id: string) => void;
  renameChannel: (id: string, name: string) => void;

  // Membership
  join: (
    channelId: string,
    member: Omit<VoiceChannelMember, "joinedAt">,
  ) => void;
  leave: (channelId: string, userId: string) => void;
  setMemberState: (
    channelId: string,
    userId: string,
    patch: Partial<VoiceChannelMember>,
  ) => void;
  occupancyFor: (channelId: string) => VoiceChannelMember[];
  channelOf: (userId: string) => VoiceChannel | null;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `vc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const SEEDS: VoiceChannel[] = [
  {
    id: "vc-lounge",
    name: "Lounge",
    scope: "workspace",
    description: "Always-open audio room — drop in to chat.",
    maxParticipants: 0,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "vc-eng-pairing",
    name: "Eng pairing",
    scope: "workspace",
    description: "Pair-program / unblock each other.",
    maxParticipants: 0,
    createdAt: new Date(0).toISOString(),
  },
];

export const useVoiceChannels = create<VoiceChannelsStore>()(
  persist(
    (set, get) => ({
      channels: SEEDS,
      members: {},

      createChannel: (payload) => {
        const row: VoiceChannel = {
          id: newId(),
          createdAt: new Date().toISOString(),
          maxParticipants: payload.maxParticipants ?? 0,
          ...payload,
        };
        set((s) => ({ channels: [row, ...s.channels] }));
        return row;
      },
      removeChannel: (id) =>
        set((s) => {
          const nextMembers = { ...s.members };
          delete nextMembers[id];
          return {
            channels: s.channels.filter((c) => c.id !== id),
            members: nextMembers,
          };
        }),
      renameChannel: (id, name) =>
        set((s) => ({
          channels: s.channels.map((c) =>
            c.id === id ? { ...c, name } : c,
          ),
        })),

      join: (channelId, member) =>
        set((s) => {
          const ch = s.channels.find((c) => c.id === channelId);
          if (!ch) return s;
          // Drop the user from any other channel first — single-room rule.
          const stripped: Record<string, VoiceChannelMember[]> = {};
          for (const [cid, list] of Object.entries(s.members)) {
            stripped[cid] = list.filter((m) => m.id !== member.id);
          }
          const cur = stripped[channelId] ?? [];
          if (
            ch.maxParticipants > 0 &&
            cur.length >= ch.maxParticipants
          ) {
            return { ...s, members: stripped };
          }
          return {
            members: {
              ...stripped,
              [channelId]: [
                ...cur,
                { ...member, joinedAt: new Date().toISOString() },
              ],
            },
          };
        }),
      leave: (channelId, userId) =>
        set((s) => ({
          members: {
            ...s.members,
            [channelId]: (s.members[channelId] ?? []).filter(
              (m) => m.id !== userId,
            ),
          },
        })),
      setMemberState: (channelId, userId, patch) =>
        set((s) => ({
          members: {
            ...s.members,
            [channelId]: (s.members[channelId] ?? []).map((m) =>
              m.id === userId ? { ...m, ...patch } : m,
            ),
          },
        })),
      occupancyFor: (channelId) => get().members[channelId] ?? [],
      channelOf: (userId) => {
        for (const ch of get().channels) {
          if ((get().members[ch.id] ?? []).some((m) => m.id === userId)) {
            return ch;
          }
        }
        return null;
      },
    }),
    {
      name: "vyne-voice-channels",
      version: 1,
      // Don't persist the live members map — it's session-scoped.
      partialize: (state) => ({ channels: state.channels }),
    },
  ),
);
