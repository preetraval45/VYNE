import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api/client'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  signup: (data: {
    email: string
    password: string
    name: string
    orgName: string
  }) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(email, password)
          const { user, token } = response.data
          set({ user, token, isLoading: false, error: null })
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Login failed. Please try again.'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.signup(data)
          const { user, token } = response.data
          set({ user, token, isLoading: false, error: null })
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Signup failed. Please try again.'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null })
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      },

      setUser: (user: User) => set({ user }),

      setToken: (token: string) => set({ token }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'vyne-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)

// Selector hooks
export const useUser = () => useAuthStore((s) => s.user)
export const useToken = () => useAuthStore((s) => s.token)
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token && !!s.user)
