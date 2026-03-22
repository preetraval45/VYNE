import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

interface TabBadges {
  home: number;
  chat: number;
  projects: number;
  finance: number;
  erp: number;
  profile: number;
}

interface UIStore {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Notification badge counts per tab
  badges: TabBadges;
  setBadge: (tab: keyof TabBadges, count: number) => void;
  clearBadges: () => void;

  // Network status
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Theme
      theme: "system" as ThemeMode,
      setTheme: (theme: ThemeMode) => set({ theme }),

      // Badges
      badges: {
        home: 0,
        chat: 0,
        projects: 0,
        finance: 0,
        erp: 0,
        profile: 0,
      },
      setBadge: (tab: keyof TabBadges, count: number) =>
        set((state) => ({
          badges: { ...state.badges, [tab]: count },
        })),
      clearBadges: () =>
        set({
          badges: {
            home: 0,
            chat: 0,
            projects: 0,
            finance: 0,
            erp: 0,
            profile: 0,
          },
        }),

      // Network
      isOnline: true,
      setOnline: (online: boolean) => set({ isOnline: online }),
    }),
    {
      name: "vyne-ui",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
);

// Selector hooks
export const useTheme = () => useUIStore((s) => s.theme);
export const useBadges = () => useUIStore((s) => s.badges);
export const useIsOnline = () => useUIStore((s) => s.isOnline);
