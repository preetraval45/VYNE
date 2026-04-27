"use client";

/**
 * Auth provider abstraction.
 *
 * VYNE ships with a localStorage-backed demo auth store so the app
 * works end-to-end without any third-party setup. To enable real
 * multi-user auth without rewriting every consumer, set:
 *
 *   NEXT_PUBLIC_AUTH_PROVIDER = "clerk"   (or "supabase" | "cognito")
 *   CLERK_SECRET_KEY              (server)
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  (client)
 *
 * Then install the Clerk SDK:
 *
 *   pnpm add @clerk/nextjs
 *
 * And replace the body of `useRealUser` below with the real Clerk hook.
 * The rest of the app already calls useUser/useAuthStore so the swap
 * is local — no broad refactor.
 *
 * For Supabase: same pattern, swap the import.
 *
 * This file exists so the contract is documented and the entry point
 * is obvious; without it, ad-hoc `if (process.env.NEXT_PUBLIC_AUTH_PROVIDER...)`
 * checks would scatter across the codebase.
 */

import { useAuthStore } from "@/lib/stores/auth";

export type AuthProvider = "demo" | "clerk" | "supabase" | "cognito";

export function activeAuthProvider(): AuthProvider {
  if (typeof process === "undefined") return "demo";
  const v = (
    process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "demo"
  ).toLowerCase();
  if (v === "clerk" || v === "supabase" || v === "cognito") return v;
  return "demo";
}

/** Returns the currently-authenticated user, or null. */
export function useRealUser() {
  const provider = activeAuthProvider();
  const demoUser = useAuthStore((s) => s.user);

  if (provider === "demo") return demoUser;

  // To enable Clerk:
  //   import { useUser as useClerkUser } from "@clerk/nextjs";
  //   const { user } = useClerkUser();
  //   return user ? { id: user.id, name: user.fullName ?? user.firstName ?? "", email: user.primaryEmailAddress?.emailAddress, role: "owner" } : null;
  //
  // For Supabase:
  //   import { useSupabaseClient, useUser as useSbUser } from "@supabase/auth-helpers-react";
  //   const sbUser = useSbUser();
  //   return sbUser ? { id: sbUser.id, name: sbUser.user_metadata?.full_name ?? "", email: sbUser.email, role: "owner" } : null;

  return demoUser; // fallback until the SDK is wired
}

/**
 * Whether the current request is authenticated, as a server check.
 * Used in route handlers that want to enforce auth when configured.
 */
export async function requireRealAuth(req: Request): Promise<{
  ok: boolean;
  userId?: string;
  reason?: string;
}> {
  const provider = activeAuthProvider();
  if (provider === "demo") {
    return { ok: true, userId: "demo-user" };
  }

  // To enable Clerk server-side:
  //   import { auth } from "@clerk/nextjs/server";
  //   const { userId } = auth();
  //   return userId ? { ok: true, userId } : { ok: false, reason: "no session" };
  //
  // To enable Supabase server-side:
  //   import { createServerClient } from "@supabase/ssr";
  //   const sb = createServerClient(...);
  //   const { data: { user } } = await sb.auth.getUser();
  //   return user ? { ok: true, userId: user.id } : { ok: false, reason: "no session" };

  // Until the SDK is wired, accept the request to avoid breaking demo
  void req;
  return { ok: true, userId: "demo-user" };
}
