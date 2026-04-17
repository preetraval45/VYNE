"use client";

import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { FocusModeToast } from "@/components/layout/FocusModeToast";
import { UndoToast } from "@/components/layout/UndoToast";
import { ProductTour } from "@/components/layout/ProductTour";
import { GlobalWidgets } from "@/components/layout/GlobalWidgets";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { ToastProvider } from "@/components/shared/ui";
import { useUIStore } from "@/lib/stores/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const focusMode = useUIStore((s) => s.focusMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <ToastProvider>
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--content-bg-secondary)" }}
      aria-label="Dashboard"
      data-focus-mode={focusMode ? "on" : "off"}
    >
      {/* Skip to content link — visible on keyboard focus */}
      <SkipToContent />

      {/* Mobile hamburger — only visible < 768px */}
      <button
        type="button"
        className="hide-desktop"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 50,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop when sidebar is open */}
      {sidebarOpen && !focusMode && (
        <div
          className="sidebar-backdrop hide-desktop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed Sidebar (hidden in focus mode) */}
      {!focusMode && <Sidebar />}

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-auto content-scroll"
        style={{ background: "var(--content-bg)" }}
        tabIndex={-1}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal />

      {/* Focus-mode indicator */}
      <FocusModeToast />

      {/* Undo toast */}
      <UndoToast />

      {/* Product tour (first-run + on-demand via settings) */}
      <ProductTour />

      {/* Pomodoro timer + Quick-note FAB + Workspace switcher (⌘⇧O) */}
      <GlobalWidgets />
    </div>
    </ToastProvider>
  );
}
