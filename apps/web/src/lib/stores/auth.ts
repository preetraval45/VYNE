import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/client";
import type { User } from "@/types";

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
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      setUser: (user: User) => set({ user }),

      setToken: (token: string) => set({ token }),

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
