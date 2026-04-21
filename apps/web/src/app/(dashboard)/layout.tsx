"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { FocusModeToast } from "@/components/layout/FocusModeToast";
import { UndoToast } from "@/components/layout/UndoToast";
import { ProductTour } from "@/components/layout/ProductTour";
import { GlobalWidgets } from "@/components/layout/GlobalWidgets";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { useUIStore } from "@/lib/stores/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const focusMode = useUIStore((s) => s.focusMode);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--content-bg-secondary)" }}
      aria-label="Dashboard"
      data-focus-mode={focusMode ? "on" : "off"}
    >
      {/* Skip to content link — visible on keyboard focus */}
      <SkipToContent />

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

      {/* Global Search (⌘⇧F) */}
      <GlobalSearch />

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
  );
}
