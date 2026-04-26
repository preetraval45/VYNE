import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/client";
import { csrfFetch } from "@/lib/api/csrfFetch";
import type { User } from "@/types";

// ─── Auth cookie writer (server-set, HttpOnly) ──────────────────
//
// Tokens used to be written from the client via document.cookie, which
// meant any reflected XSS could read the session. We now POST to
// /api/auth/session and the server sets `vyne-token` as
// `HttpOnly; Secure; SameSite=Strict` — JS can no longer touch it.
// The middleware (apps/web/src/middleware.ts) reads the cookie on every
// dashboard navigation, so this works without changing the guard logic.
//
// `setAuthCookie` keeps its existing call sites; it just routes through
// the server now and silently no-ops on SSR.

async function setAuthCookie(
  name: "vyne-token" | "vyne-demo",
  value: string | null,
) {
  if (globalThis.window === undefined) return;

  // Clearing — DELETE both cookies. The route always expires both, which
  // matches the previous behaviour where logout clears each one in turn.
  if (value === null) {
    try {
      await csrfFetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Network failure — fall back to expiring whatever JS-readable
      // cookie may still exist from older clients.
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict; Secure`;
    }
    return;
  }

  const payload = name === "vyne-demo" ? { demo: true } : { token: value };
  try {
    // The very first POST has no CSRF cookie yet — the response
    // installs one, so subsequent state-changing calls are protected.
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort: if the API call fails (offline, etc.) keep the
    // existing in-memory store so the user isn't booted to login.
    // The middleware will reject the next navigation, which is the
    // correct fail-closed behaviour.
  }
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  clearError: () => void;
  refreshSession: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isRefreshing: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token, refreshToken } = response.data;
          set({ user, token, refreshToken, isLoading: false, error: null });
          // Await the server-set HttpOnly cookie before returning so the
          // caller can router.push() into a guarded route immediately.
          await setAuthCookie("vyne-token", token);
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : ((err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ??
                "Login failed. Please try again.");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.signup(data);
          const { user, token, refreshToken } = response.data;
          set({ user, token, refreshToken, isLoading: false, error: null });
          await setAuthCookie("vyne-token", token);
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : ((err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ??
                "Signup failed. Please try again.");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, error: null });
        setAuthCookie("vyne-token", null);
        setAuthCookie("vyne-demo", null);
        if (globalThis.window !== undefined) {
          globalThis.window.location.href = "/login";
        }
      },

      setUser: (user: User) => {
        set({ user });
        if (user.id === "demo") setAuthCookie("vyne-demo", "1");
      },

      setToken: (token: string) => {
        set({ token });
        // "demo-token" is the sentinel the login page uses for instant-demo mode.
        if (token === "demo-token") setAuthCookie("vyne-demo", "1");
        else setAuthCookie("vyne-token", token);
      },

      setRefreshToken: (refreshToken: string) => set({ refreshToken }),

      clearError: () => set({ error: null }),

      refreshSession: async () => {
        const { refreshToken, isRefreshing } = get();

        // Prevent multiple concurrent refresh calls
        if (isRefreshing) return;

        if (!refreshToken) {
          // No refresh token — force logout
          get().logout();
          return;
        }

        set({ isRefreshing: true });
        try {
          const response = await authApi.refreshToken(refreshToken);
          const { token: newToken, refreshToken: newRefreshToken } =
            response.data;
          set({
            token: newToken,
            refreshToken: newRefreshToken,
            isRefreshing: false,
          });
        } catch {
          set({ isRefreshing: false });
          get().logout();
        }
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.forgotPassword(email);
          set({ isLoading: false });
          return response.data.message;
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : ((err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ??
                "Failed to send reset email. Please try again.");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.resetPassword(token, newPassword);
          set({ isLoading: false });
          return response.data.message;
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : ((err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ??
                "Failed to reset password. Please try again.");
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },
    }),
    {
      name: "vyne-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

// Selector hooks
export const useUser = () => useAuthStore((s) => s.user);
export const useToken = () => useAuthStore((s) => s.token);
export const useIsAuthenticated = () =>
  useAuthStore((s) => !!s.token && !!s.user);
