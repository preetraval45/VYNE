"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSchemaTool } from "@/components/layout/GlobalSchemaTool";
import { UnifiedTopBar } from "@/components/layout/UnifiedTopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GlobalSearchModal } from "@/components/layout/GlobalSearchModal";
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
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { HuddleDock } from "@/components/chat/HuddleDock";
import { A11yApplier } from "@/components/layout/A11yApplier";
import { Announcer } from "@/components/layout/Announcer";
import { AiSidebar } from "@/components/ai/AiSidebar";
import { FollowTeammateProvider } from "@/hooks/useFollowTeammate";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ModuleErrorBoundary } from "@/components/shared/ModuleErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { useUIStore } from "@/lib/stores/ui";
import { useCRMStore, bindCrmRealtime } from "@/lib/stores/crm";
import { useContactsStore, bindContactsRealtime } from "@/lib/stores/contacts";
import {
  useInvoicingStore,
  bindInvoicingRealtime,
} from "@/lib/stores/invoicing";
import { useOpsStore, bindOpsRealtime } from "@/lib/stores/ops";
import { useProjectsStore, bindProjectsRealtime } from "@/lib/stores/projects";
import { useFinanceStore, bindFinanceRealtime } from "@/lib/stores/finance";
import { useExpensesStore } from "@/lib/stores/expenses";
import { useSalesStore } from "@/lib/stores/sales";
import { useFieldServiceStore } from "@/lib/stores/fieldService";
import { useHRStore } from "@/lib/stores/hr";
import { useAuthStore } from "@/lib/stores/auth";
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
  // its own listener still re-syncs. Broadcasts `vyne:soft-refresh` for
  // page-local listeners (each list view can refetch its own data) and
  // hydrates known server-backed stores (CRM today; add others here as
  // they grow `hydrateFromServer`). Shows a toast so the user gets
  // visible confirmation that the pull worked.
  useEffect(() => {
    let inflight = false;
    async function onRefresh() {
      if (inflight) return;
      inflight = true;
      const toastModule = await import("react-hot-toast");
      const toastId = toastModule.default.loading("Refreshing…", {
        position: "top-center",
        duration: 1800,
      });
      try {
        router.refresh();
        await Promise.all([
          useCRMStore.getState().hydrateFromServer(),
          useContactsStore.getState().hydrateContactsFromServer(),
          useContactsStore.getState().hydrateAccountsFromServer(),
          useInvoicingStore.getState().hydrateCustomersFromServer(),
          useInvoicingStore.getState().hydrateInvoicesFromServer(),
          useOpsStore.getState().hydrateProductsFromServer(),
          useOpsStore.getState().hydrateOrdersFromServer(),
          useOpsStore.getState().hydrateSuppliersFromServer(),
          useProjectsStore.getState().hydrateProjectsFromServer(),
          useProjectsStore.getState().hydrateTasksFromServer(),
          useFinanceStore.getState().hydrateJournalFromServer(),
          useExpensesStore.getState().hydrateFromServer(),
          useSalesStore.getState().hydrateFromServer(),
          useFieldServiceStore.getState().hydrateFromServer(),
          useHRStore.getState().hydrateFromServer(),
        ]);
        window.dispatchEvent(new CustomEvent("vyne:soft-refresh"));
        toastModule.default.success("Up to date", {
          id: toastId,
          position: "top-center",
          duration: 1200,
        });
      } catch {
        toastModule.default.error("Couldn't refresh", {
          id: toastId,
          position: "top-center",
        });
      } finally {
        inflight = false;
      }
    }
    window.addEventListener("vyne:pull-refresh", onRefresh);
    return () => window.removeEventListener("vyne:pull-refresh", onRefresh);
  }, [router]);

  // Hydrate every server-backed Zustand store from Postgres once on
  // mount. Reads /api/{deals,contacts,accounts,customers,invoices,
  // products,orders,suppliers,projects,tasks,journal-entries} and
  // replaces the local cache with the canonical list. Falls back
  // silently to localStorage when the API is unreachable.
  useEffect(() => {
    void useCRMStore.getState().hydrateFromServer();
    void useContactsStore.getState().hydrateContactsFromServer();
    void useContactsStore.getState().hydrateAccountsFromServer();
    void useInvoicingStore.getState().hydrateCustomersFromServer();
    void useInvoicingStore.getState().hydrateInvoicesFromServer();
    void useOpsStore.getState().hydrateProductsFromServer();
    void useOpsStore.getState().hydrateOrdersFromServer();
    void useOpsStore.getState().hydrateSuppliersFromServer();
    void useProjectsStore.getState().hydrateProjectsFromServer();
    void useProjectsStore.getState().hydrateTasksFromServer();
    void useFinanceStore.getState().hydrateJournalFromServer();
    void useExpensesStore.getState().hydrateFromServer();
    void useSalesStore.getState().hydrateFromServer();
    void useFieldServiceStore.getState().hydrateFromServer();
    void useHRStore.getState().hydrateFromServer();
    // Subscribe to Pusher org-wide events. Two-tab edits become instant
    // once NEXT_PUBLIC_PUSHER_KEY is set; the helpers no-op silently
    // when realtime is not configured.
    //
    // PH-A — Tenant-scope realtime: use the signed-in user's actual
    // orgId so users only receive events for their own org. Demo
    // visitors fall back to the shared "org-demo" channel.
    const authUser = useAuthStore.getState().user;
    const rtOrg = authUser?.orgId || "org-demo";
    bindCrmRealtime(rtOrg);
    bindContactsRealtime(rtOrg);
    bindInvoicingRealtime(rtOrg);
    bindOpsRealtime(rtOrg);
    bindProjectsRealtime(rtOrg);
    bindFinanceRealtime(rtOrg);
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
    <FollowTeammateProvider>
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

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
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

        {/* Phase 14 — Global semantic search modal (Ctrl+/) */}
        <GlobalSearchModalMount />

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

        {/* Offline-state banner — shows when window.navigator.onLine flips
          false, plus the count of mutations queued in IndexedDB. Auto-
          flushes the queue when the network comes back. */}
        <OfflineBanner />

        {/* 14-day trial banner (UI_UPGRADE_PLAN.md 3.5). Reads /api/stripe/status
          via the shared subscription hook; renders only while status="trialing".
          Self-dismissable per-day. */}
        <TrialBanner />

        {/* Persistent huddle dock (UI_UPGRADE_PLAN.md 6.1) — survives page
          navigation. Self-hides when no huddle is active. */}
        <HuddleDock />

        {/* Phase 19.1/19.2/19.9 — apply a11y prefs (contrast / text scale / RTL) */}
        <A11yApplier />

        {/* Phase 19.3 — single global ARIA live region for async actions */}
        <Announcer />

        {/* Phase 16.10 — embeddable AI sidebar (right rail). Toggle with
          ⌘+⇧+/ or the floating Sparkles pill. Hidden in focus mode and
          on the dedicated /ai/chat page so it doesn't overlap. */}
        {!focusMode && pathname && !pathname.startsWith("/ai") && <AiSidebar />}
      </div>
    </FollowTeammateProvider>
  );
}

/** Mount + keyboard binding for the Phase 14 global search modal.
 *  Ctrl+/ (or Cmd+/ on macOS) opens; the modal handles its own Esc.
 *  Kept in this file so the shortcut wiring lives next to the rest of
 *  the layout-level shortcuts. */
function GlobalSearchModalMount() {
  const open = useUIStore((s) => s.globalSearchOpen);
  const setOpen = useUIStore((s) => s.setGlobalSearchOpen);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isFormField =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (isFormField) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
  return <GlobalSearchModal open={open} onClose={() => setOpen(false)} />;
}
