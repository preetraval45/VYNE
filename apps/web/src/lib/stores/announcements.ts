"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { latestChangelogId } from "@/lib/changelog";

/**
 * Announcement banners + What's-new tour (27.5 / 27.6).
 *
 *   27.5 announcements      — admin-publishable site-wide banner
 *   27.6 whatsNew           — per-user "have I seen the latest release?"
 *
 * Banners can be tagged dismissible (default true) so a user who
 * closes the banner doesn't see it again until the admin reopens it.
 * The "What's new" tour fires once per release id; the user's last-
 * seen pointer is bumped when they close it so the same release
 * never re-fires.
 */

export interface Announcement {
  id: string;
  /** "info" / "success" / "warning" / "danger". */
  level: "info" | "success" | "warning" | "danger";
  body: string;
  /** Optional "Learn more" link. */
  href?: string;
  /** ISO; null = always live until removed. */
  expiresAt?: string;
  dismissible: boolean;
  createdAt: string;
}

interface AnnouncementsStore {
  banners: Announcement[];
  dismissed: string[];

  publish: (
    payload: Omit<Announcement, "id" | "createdAt" | "dismissible"> & {
      dismissible?: boolean;
    },
  ) => Announcement;
  remove: (id: string) => void;
  dismiss: (id: string) => void;
  undismiss: (id: string) => void;
  /** Live banners not yet dismissed + within their TTL. */
  visible: () => Announcement[];

  // 27.6 What's new
  lastSeenChangelogId: string | null;
  /** True when there's a release the user hasn't seen yet. */
  hasUnseenRelease: () => boolean;
  /** Mark the latest release as seen. */
  markChangelogSeen: () => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useAnnouncements = create<AnnouncementsStore>()(
  persist(
    (set, get) => ({
      banners: [],
      dismissed: [],
      lastSeenChangelogId: null,

      publish: (payload) => {
        const row: Announcement = {
          id: newId(),
          createdAt: new Date().toISOString(),
          dismissible: payload.dismissible ?? true,
          ...payload,
        };
        set((s) => ({ banners: [row, ...s.banners] }));
        return row;
      },
      remove: (id) =>
        set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),
      dismiss: (id) =>
        set((s) => ({
          dismissed: s.dismissed.includes(id)
            ? s.dismissed
            : [...s.dismissed, id],
        })),
      undismiss: (id) =>
        set((s) => ({ dismissed: s.dismissed.filter((d) => d !== id) })),
      visible: () => {
        const now = Date.now();
        return get().banners.filter((b) => {
          if (b.expiresAt && new Date(b.expiresAt).getTime() < now) return false;
          if (b.dismissible && get().dismissed.includes(b.id)) return false;
          return true;
        });
      },

      // 27.6
      hasUnseenRelease: () => {
        const latest = latestChangelogId();
        if (!latest) return false;
        return get().lastSeenChangelogId !== latest;
      },
      markChangelogSeen: () => set({ lastSeenChangelogId: latestChangelogId() }),
    }),
    { name: "vyne-announcements", version: 1 },
  ),
);
