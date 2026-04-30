"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSchemaTool } from "@/components/layout/GlobalSchemaTool";
import { UnifiedTopBar } from "@/components/layout/UnifiedTopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { FocusModeToast } from "@/components/layout/FocusModeToast";
import { UndoToast } from "@/components/layout/UndoToast";
import { ProductTour } from "@/components/layout/ProductTour";
import { GlobalWidgets } from "@/components/layout/GlobalWidgets";
import { GlobalCallPanel } from "@/components/layout/GlobalCallPanel";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PWAInstallBanner } from "@/components/layout/PWAInstallBanner";
import { A11yEnhancer } from "@/components/layout/A11yEnhancer";
import { MobileLayoutNormalizer } from "@/components/layout/MobileLayoutNormalizer";
import { PageTitleSync } from "@/components/layout/PageTitleSync";
import { MobileSwipeGesture } from "@/components/layout/MobileSwipeGesture";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { MobileFAB } from "@/components/layout/MobileFAB";
import { EdgeSwipeBack } from "@/components/layout/EdgeSwipeBack";
import { GlobalDropZone } from "@/components/layout/GlobalDropZone";
import { ScrollRestoration } from "@/components/layout/ScrollRestoration";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { useUIStore } from "@/lib/stores/ui";
import { useCRMStore, bindCrmRealtime } from "@/lib/stores/crm";
import { useTabSync } from "@/hooks/useTabSync";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const focusMode = useUIStore((s) => s.focusMode);
  const pathname = usePathname();
  const router = useRouter();
  // Cross-tab sync: when the user sends/edits/reads in one tab, others update.
  useTabSync();
  // Track the on-screen keyboard inset → CSS var --keyboard-h. Used by
  // the chat composer to stay pinned above the iOS keyboard.
  useVisualViewport();

  // Wire the global pull-to-refresh event so any page that doesn't have
  // its own listener still re-syncs by triggering a router refresh +
  // forcing all Zustand stores to re-emit their persisted state.
  useEffect(() => {
    function onRefresh() {
      router.refresh();
      void useCRMStore.getState().hydrateFromServer();
    }
    window.addEventListener("vyne:pull-refresh", onRefresh);
    return () => window.removeEventListener("vyne:pull-refresh", onRefresh);
  }, [router]);

  // Hydrate the CRM cache from Postgres once on mount. Reads /api/deals
  // and replaces the local Zustand cache with the canonical list. Falls
  // back silently to localStorage when the API is unreachable.
  useEffect(() => {
    void useCRMStore.getState().hydrateFromServer();
    // Subscribe to Pusher org-wide deal events. Two-tab CRM edits
    // become instant once NEXT_PUBLIC_PUSHER_KEY is set.
    bindCrmRealtime("demo");
  }, []);

  // First-run onboarding: if user hasn't completed the wizard, push them
  // through it once. Skipped if they're already on /onboarding or it's
  // a deep-link they explicitly came back to.
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (onboardingChecked) return;
    const done = localStorage.getItem("vyne-onboarding");
    if (!done && pathname && !pathname.startsWith("/onboarding")) {
      router.push("/onboarding");
    }
    setOnboardingChecked(true);
  }, [onboardingChecked, pathname, router]);
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

      {/* GlobalSchemaTool's floating rail is replaced by <UnifiedTopBar />.
          Keeping the component mounted means the FieldSchemaEditor portal
          still works for admins; the rail itself is hidden via CSS. */}
      {!focusMode && <GlobalSchemaTool />}

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-auto content-scroll"
        data-vyne-fullshell
        style={{
          background: "var(--content-bg)",
          display: "flex",
          flexDirection: "column",
        }}
        tabIndex={-1}
      >
        {/* Global unified top bar — same on every page across all viewports */}
        {!focusMode && <UnifiedTopBar />}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <ErrorBoundary>
            {/* Module-scoped boundary: keyed by the first path segment so a
                crash in one module (e.g. /crm) doesn't blank the whole app
                and auto-resets when the user navigates to a different one. */}
            <ModuleErrorBoundary key={moduleKey} moduleName={moduleKey}>
              {children}
            </ModuleErrorBoundary>
          </ErrorBoundary>
        </div>
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

      {/* Mobile bottom navigation (≤768px) */}
      {!focusMode && <MobileBottomNav />}

      {/* PWA install prompt — shows when browser supports it + user hasn't dismissed */}
      {!focusMode && <PWAInstallBanner />}

      {/* Runtime a11y safety net: labels any unlabeled form element. */}
      <A11yEnhancer />

      {/* Runtime mobile layout safety net: collapses multi-col grids,
          wraps flex rows, and shrinks oversized fixed widths on phones
          and tablet portrait. Bypasses inline-style specificity. */}
      <MobileLayoutNormalizer />

      {/* Sync document.title to the current route. */}
      <PageTitleSync />

      {/* Mobile swipe-from-left edge → dispatch vyne:open-more. */}
      <MobileSwipeGesture />

      {/* Mobile pull-to-refresh — dispatches vyne:pull-refresh on release */}
      <PullToRefresh />

      {/* Mobile floating "+" FAB — picks the right new-record route per page */}
      {!focusMode && <MobileFAB />}

      {/* iOS-style edge-swipe-back on detail routes */}
      <EdgeSwipeBack />

      {/* Full-window file drag-and-drop overlay */}
      <GlobalDropZone />

      {/* Per-route scroll restoration on back nav */}
      <ScrollRestoration />

      {/* Tenant impersonation banner (visible whenever vyne-impersonating
          is set in localStorage by the /admin impersonation flow) */}
      <ImpersonationBanner />
    </div>
  );
}
