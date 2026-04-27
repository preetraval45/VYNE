"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebarToggle } from "@/components/layout/MobileSidebarToggle";
import { GlobalSchemaTool } from "@/components/layout/GlobalSchemaTool";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { FocusModeToast } from "@/components/layout/FocusModeToast";
import { UndoToast } from "@/components/layout/UndoToast";
import { ProductTour } from "@/components/layout/ProductTour";
import { GlobalWidgets } from "@/components/layout/GlobalWidgets";
import { GlobalCallPanel } from "@/components/layout/GlobalCallPanel";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { useUIStore } from "@/lib/stores/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const focusMode = useUIStore((s) => s.focusMode);
  const pathname = usePathname();
  // Derive a module key from the first path segment so the error boundary
  // resets automatically when the user navigates to a different module.
  const moduleKey = pathname?.split("/")[1] ?? "root";

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

      {/* Mobile drawer toggle (hidden ≥769px via CSS) */}
      {!focusMode && <MobileSidebarToggle />}

      {/* Top-nav admin rail — schema tool, visible on every page */}
      {!focusMode && <GlobalSchemaTool />}

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-auto content-scroll"
        style={{ background: "var(--content-bg)" }}
        tabIndex={-1}
      >
        <ErrorBoundary>
          {/* Module-scoped boundary: keyed by the first path segment so a
              crash in one module (e.g. /crm) doesn't blank the whole app
              and auto-resets when the user navigates to a different one. */}
          <ModuleErrorBoundary key={moduleKey} moduleName={moduleKey}>
            {children}
          </ModuleErrorBoundary>
        </ErrorBoundary>
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

      {/* Global call overlay — survives across page navigation, channel switches */}
      <GlobalCallPanel />
    </div>
  );
}
