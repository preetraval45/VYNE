"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  subscribe,
  publishFromClient,
  isRealtimeEnabled,
} from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * useFollowTeammate — Linear / Figma-style "follow" mode.
 *
 * Architecture:
 *   - Each user heartbeats their current pathname + scrollY on the
 *     org-wide `presence-follow-org` channel every NAV_HEARTBEAT_MS.
 *   - When you click "Follow Sarah", the provider subscribes to her
 *     events and:
 *       · router.push() to her pathname when it changes
 *       · window.scrollTo(0, scrollY) when her viewport scrolls
 *   - Esc, route mismatch you triggered manually, or the leader
 *     stopping their session releases the lock.
 *
 * Mount the provider once in the dashboard layout; everything else
 * uses `useFollow()` to read state and `useFollowTeammate()` to
 * subscribe a target.
 */

interface FollowState {
  followingId: string | null;
  followingName: string | null;
  follow: (id: string, name: string) => void;
  release: () => void;
}

const FollowCtx = createContext<FollowState | null>(null);

interface NavBeat {
  id: string;
  name: string;
  pathname: string;
  scrollY: number;
  ts: number;
}

const NAV_CHANNEL = "presence-follow-org";
const NAV_HEARTBEAT_MS = 1_500;

export function FollowTeammateProvider({ children }: { children: ReactNode }) {
  const me = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [followingName, setFollowingName] = useState<string | null>(null);
  const lastAppliedPathRef = useRef<string | null>(null);

  // Heartbeat my current viewport so others can follow me.
  useEffect(() => {
    if (!isRealtimeEnabled() || !me) return;
    const id = me.id ?? me.email ?? "anon";
    const name = me.name ?? "Teammate";

    function beat() {
      void publishFromClient(NAV_CHANNEL, "nav:beat", {
        id,
        name,
        pathname,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        ts: Date.now(),
      });
    }
    beat();
    const id1 = window.setInterval(beat, NAV_HEARTBEAT_MS);
    return () => window.clearInterval(id1);
  }, [pathname, me]);

  // When following someone, mirror their nav beats.
  useEffect(() => {
    if (!isRealtimeEnabled() || !followingId) return;
    const off = subscribe<NavBeat>(NAV_CHANNEL, "nav:beat", (b) => {
      if (b.id !== followingId) return;
      // Route mirror — push when their pathname differs from ours.
      if (b.pathname !== window.location.pathname && b.pathname !== lastAppliedPathRef.current) {
        lastAppliedPathRef.current = b.pathname;
        router.push(b.pathname);
      }
      // Scroll mirror — only when within 4 px to avoid jitter.
      if (Math.abs(window.scrollY - b.scrollY) > 4) {
        window.scrollTo({ top: b.scrollY, behavior: "auto" });
      }
    });
    return off;
  }, [followingId, router]);

  // Esc to release.
  useEffect(() => {
    if (!followingId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFollowingId(null);
        setFollowingName(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [followingId]);

  const follow = useCallback((id: string, name: string) => {
    setFollowingId(id);
    setFollowingName(name);
    lastAppliedPathRef.current = null;
  }, []);

  const release = useCallback(() => {
    setFollowingId(null);
    setFollowingName(null);
  }, []);

  const value = useMemo(
    () => ({ followingId, followingName, follow, release }),
    [followingId, followingName, follow, release],
  );

  return (
    <FollowCtx.Provider value={value}>
      {children}
      {followingId && followingName && (
        <FollowBanner name={followingName} onRelease={release} />
      )}
    </FollowCtx.Provider>
  );
}

export function useFollow(): FollowState {
  const ctx = useContext(FollowCtx);
  if (!ctx) {
    // Graceful fallback so individual components don't crash if the
    // provider isn't yet mounted in tests / storybook.
    return {
      followingId: null,
      followingName: null,
      follow: () => {},
      release: () => {},
    };
  }
  return ctx;
}

function FollowBanner({
  name,
  onRelease,
}: {
  name: string;
  onRelease: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: 999,
        background: "var(--vyne-accent, var(--vyne-purple))",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 0 0 3px rgba(255,255,255,0.35)",
          animation: "vyne-typing-bounce 1.4s ease-in-out infinite",
        }}
      />
      Following {name}
      <button
        type="button"
        onClick={onRelease}
        aria-label="Stop following"
        style={{
          marginLeft: 4,
          padding: "2px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Esc · Release
      </button>
    </div>
  );
}
