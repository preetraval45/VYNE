import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/client";
import type { User } from "@/types";

// ─── Cookie helpers — mirror token state into cookies so the Next.js
// middleware can guard dashboard routes server-side. Client-side only.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setAuthCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
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
          setAuthCookie("vyne-token", token);
          setAuthCookie("vyne-demo", null);
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
          setAuthCookie("vyne-token", token);
          setAuthCookie("vyne-demo", null);
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
