"use client";

import { create } from "zustand";

/**
 * Breakout rooms (28.3.3).
 *
 * The host of a >2-person call can split everyone into N parallel
 * rooms; each room reuses the existing peer-connection layer with
 * a distinct stable id (`${callId}-breakout-${n}`). The host can
 * hop between rooms (`enterRoom(id)`) without leaving the parent
 * call — they get auto-rejoined to the main room when the breakout
 * closes.
 *
 *   const room = createBreakout(callId, "Pricing strategy", ["sarah", "tony"]);
 *   enterRoom(room.id);
 *   …
 *   closeBreakouts(callId);   // host: bring everyone back to the main room
 *
 * Lives in memory only — closing the call resets the store.
 */

export interface BreakoutRoom {
  id: string;
  /** Parent call id. */
  callId: string;
  name: string;
  /** Participants assigned to this room. Display id only — peer-
   *  connection bookkeeping happens in the host's call layer. */
  memberIds: string[];
  /** ISO. */
  createdAt: string;
  /** ISO when closed; null while active. */
  closedAt?: string;
}

interface BreakoutState {
  rooms: BreakoutRoom[];
  /** The room the local user is currently in. null = main room. */
  activeRoomId: string | null;
  /** Optional countdown the host can set to auto-close all rooms. */
  autoCloseAt: string | null;

  createBreakout: (
    callId: string,
    name: string,
    memberIds: string[],
  ) => BreakoutRoom;
  enterRoom: (roomId: string | null) => void;
  closeBreakouts: (callId: string) => void;
  scheduleAutoClose: (closeAtIso: string) => void;
  clearAutoClose: () => void;
  /** Active rooms for a given call (excludes closed). */
  roomsFor: (callId: string) => BreakoutRoom[];
  /** Where a member currently is. */
  roomForMember: (callId: string, memberId: string) => BreakoutRoom | null;
  /** Bring the local user back to the main room. */
  exitToMain: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `br-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useBreakoutRooms = create<BreakoutState>((set, get) => ({
  rooms: [],
  activeRoomId: null,
  autoCloseAt: null,

  createBreakout: (callId, name, memberIds) => {
    const row: BreakoutRoom = {
      id: newId(),
      callId,
      name: name.trim().slice(0, 60) || "Breakout",
      memberIds,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ rooms: [row, ...s.rooms] }));
    return row;
  },
  enterRoom: (roomId) => set({ activeRoomId: roomId }),
  closeBreakouts: (callId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.callId === callId && !r.closedAt
          ? { ...r, closedAt: new Date().toISOString() }
          : r,
      ),
      activeRoomId: null,
      autoCloseAt: null,
    })),
  scheduleAutoClose: (closeAtIso) => set({ autoCloseAt: closeAtIso }),
  clearAutoClose: () => set({ autoCloseAt: null }),
  roomsFor: (callId) =>
    get().rooms.filter((r) => r.callId === callId && !r.closedAt),
  roomForMember: (callId, memberId) =>
    get().rooms.find(
      (r) =>
        r.callId === callId &&
        !r.closedAt &&
        r.memberIds.includes(memberId),
    ) ?? null,
  exitToMain: () => set({ activeRoomId: null }),
}));

/** Even-split helper — produces N rooms with members distributed
 *  round-robin. Useful for "create 4 breakouts" host UI. */
export function evenSplit(
  callId: string,
  groupCount: number,
  memberIds: string[],
  baseName = "Group",
): Array<{ name: string; memberIds: string[] }> {
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  memberIds.forEach((id, idx) => {
    buckets[idx % groupCount].push(id);
  });
  void callId;
  return buckets.map((memberIds, i) => ({
    name: `${baseName} ${i + 1}`,
    memberIds,
  }));
}
