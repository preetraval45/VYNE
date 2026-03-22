import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Module } from "@/types";

interface UIStore {
  sidebarOpen: boolean;
  activeModule: Module;
  commandPaletteOpen: boolean;
  activeProjectId: string | null;
  activeIssueId: string | null;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveModule: (module: Module) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveIssueId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModule: "projects",
      commandPaletteOpen: false,
      activeProjectId: null,
      activeIssueId: null,

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setActiveModule: (module: Module) => set({ activeModule: module }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      setCommandPaletteOpen: (open: boolean) =>
        set({ commandPaletteOpen: open }),

      setActiveProjectId: (id: string | null) => set({ activeProjectId: id }),

      setActiveIssueId: (id: string | null) => set({ activeIssueId: id }),
    }),
    {
      name: "vyne-ui",
    },
  ),
);

// Selector hooks
export const useSidebarOpen = () => useUIStore((s) => s.sidebarOpen);
export const useActiveModule = () => useUIStore((s) => s.activeModule);
export const useCommandPaletteOpen = () =>
  useUIStore((s) => s.commandPaletteOpen);
